#!/usr/bin/env node
/**
 * Link the demo doctors to the demo patients and give each patient an appointment history,
 * so the doctor, patient and hospital dashboards look like a working hospital.
 *
 * Safe by default:
 *   - DRY RUN unless --apply is passed: it only reads, and prints exactly what it would write.
 *   - Touches ONLY the 31 demo accounts (see DEMO_* lists below). Real users are never read or changed.
 *   - Everything it creates is tagged "demo-seed:v1", so --remove can take it all back out.
 *   - Re-running is safe: patients that already have demo appointments are skipped.
 *   - Prints the database it is connected to before doing anything.
 *
 * Usage (from the server/ folder):
 *   node src/scripts/linkDemoActivity.js                 # dry run: show the plan
 *   node src/scripts/linkDemoActivity.js --apply         # write it
 *   node src/scripts/linkDemoActivity.js --remove        # dry run of the undo
 *   node src/scripts/linkDemoActivity.js --remove --apply
 * Options: --seed=N (same seed = same plan, default 20261115), --uri-env=NAME (default MONGODB_URI)
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import Appointment from '../models/Appointment.js';
import { planDemoLinks } from './demoLinkPlanner.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const MARKER = 'demo-seed:v1';
const IST_OFFSET_MS = 330 * 60000;

export const DEMO_DOCTOR_EMAILS = [
  'soundarya.shetty@sanjivani.in', 'christopher.matthews@sanjivani.in', 'manjunath.rao@sanjivani.in',
  'asia.begum@sanjivani.in', 'ansh.kumar@sanjivani.in',
  'harshith.bagrecha@aarogya.in', 'ashwin.s@aarogya.in', 'apoorva.santosh@aarogya.in',
  'siri.mn@aarogya.in', 'vinay.kumar@aarogya.in',
  'swami.murti@jeevacare.in', // works at both hospitals
];

export const DEMO_PATIENT_EMAILS = {
  sanjivani: [
    'rajesh.kumar.pat@sanjivani.in', 'meera.singh.pat@sanjivani.in', 'anil.patel.pat@sanjivani.in',
    'divya.sharma.pat@sanjivani.in', 'suresh.desai.pat@sanjivani.in', 'priya.nair.pat@sanjivani.in',
    'vikram.rao.pat@sanjivani.in', 'anjali.chopra.pat@sanjivani.in', 'arjun.gupta.pat@sanjivani.in',
    'kavya.iyer.pat@sanjivani.in',
  ],
  aarogya: [
    'ramesh.krishnan.pat@aarogya.in', 'sneha.verma.pat@aarogya.in', 'nikhil.pandey.pat@aarogya.in',
    'isha.joshi.pat@aarogya.in', 'rohan.bansal.pat@aarogya.in', 'neha.menon.pat@aarogya.in',
    'sanjay.agarwal.pat@aarogya.in', 'pallavi.saxena.pat@aarogya.in', 'ashok.tripathi.pat@aarogya.in',
    'ritika.pathak.pat@aarogya.in',
  ],
};

const HOSPITAL_MATCH = { sanjivani: /Sanjivani/i, aarogya: /Aarogya/i };

const fullName = (u) => `${u.profile?.firstName || ''} ${u.profile?.lastName || ''}`.trim() || u.email;
const istParts = (date) => {
  const d = new Date(date.getTime() + IST_OFFSET_MS);
  return { date: d.toISOString().slice(0, 10), time: d.toISOString().slice(11, 16) };
};
const addMinutes = (hhmm, minutes) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const maskedTarget = (uri) => uri.replace(/\/\/[^@/]*@/, '//***@').split('?')[0];

function parseArgs(argv) {
  const opts = { apply: false, remove: false, seed: 20261115, uriEnv: 'MONGODB_URI' };
  for (const arg of argv) {
    if (arg === '--apply') opts.apply = true;
    else if (arg === '--remove') opts.remove = true;
    else if (arg.startsWith('--seed=')) opts.seed = Number(arg.slice(7));
    else if (arg.startsWith('--uri-env=')) opts.uriEnv = arg.slice(10);
    else throw new Error(`Unknown option: ${arg}`);
  }
  if (!Number.isInteger(opts.seed)) throw new Error('--seed must be an integer');
  return opts;
}

/** Reads hospitals, doctors and patients from the database and shapes them for the planner. */
async function loadRoster() {
  const warnings = [];
  const hospitals = [];
  const doctorUsers = await User.find({ email: { $in: DEMO_DOCTOR_EMAILS } });
  const doctorById = new Map(doctorUsers.map((u) => [String(u._id), u]));

  for (const [key, pattern] of Object.entries(HOSPITAL_MATCH)) {
    const hospital = await Hospital.findOne({ name: pattern });
    if (!hospital) {
      warnings.push(`Hospital not found for "${key}": nothing can be linked there. Run the base demo seed first.`);
      continue;
    }

    const staff = await HospitalStaff.find({ hospitalId: hospital._id, role: 'doctor', associationStatus: 'active' });
    const doctors = staff
      .filter((s) => doctorById.has(String(s.userId)))
      .map((s) => {
        const user = doctorById.get(String(s.userId));
        return { id: String(user._id), name: fullName(user), specialization: (s.specialization || [])[0] || '' };
      });
    if (doctors.length === 0) warnings.push(`No active demo doctors at ${hospital.name}.`);

    const patientUsers = await User.find({ email: { $in: DEMO_PATIENT_EMAILS[key] } });
    const patientDocs = await Patient.find({ userId: { $in: patientUsers.map((u) => u._id) } });
    const nameByUserId = new Map(patientUsers.map((u) => [String(u._id), fullName(u)]));
    const patients = patientDocs.map((p) => ({
      id: String(p._id),
      name: nameByUserId.get(String(p.userId)),
      existingDoctorIds: (p.assignedDoctors || [])
        .filter((a) => a.status === 'active' && String(a.facilityId) === String(hospital._id))
        .map((a) => String(a.doctorId)),
    }));
    if (patients.length < DEMO_PATIENT_EMAILS[key].length) {
      warnings.push(`${hospital.name}: found ${patients.length} of ${DEMO_PATIENT_EMAILS[key].length} demo patients.`);
    }

    hospitals.push({ key: String(hospital._id), label: hospital.name, hospital, doctors, patients });
  }
  return { hospitals, warnings };
}

function printPlan(roster, plan, existingDemoPatients) {
  const doctorName = new Map();
  for (const h of roster.hospitals) {
    h.doctors.forEach((d) => doctorName.set(d.id, `${d.name} (${d.specialization || 'doctor'})`));
  }
  const skip = (id) => existingDemoPatients.has(id);

  for (const h of roster.hospitals) {
    console.log(`\n=== ${h.label}: ${h.doctors.length} doctors, ${h.patients.length} patients ===`);
    for (const p of h.patients) {
      const existing = p.existingDoctorIds.map((id) => doctorName.get(id) || id);
      const added = plan.assignments.filter((a) => a.patientId === p.id).map((a) => doctorName.get(a.doctorId));
      const visits = plan.appointments.filter((a) => a.patientId === p.id);
      const tag = skip(p.id) ? '  [already has demo appointments: skipped]' : '';
      console.log(`  ${p.name.padEnd(18)} existing: ${existing.join(', ') || '-'} | new doctors: ${added.join(', ') || '-'} | ${visits.length} visits${tag}`);
    }
  }

  const todo = plan.appointments.filter((a) => !skip(a.patientId));
  const byStatus = {};
  for (const a of todo) byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  const dates = todo.map((a) => a.when.getTime());
  console.log(`\nWould add ${plan.assignments.filter((a) => !skip(a.patientId)).length} doctor links and ${todo.length} appointments`);
  console.log(`  by status: ${JSON.stringify(byStatus)}`);
  if (dates.length) {
    console.log(`  dates: ${istParts(new Date(Math.min(...dates))).date} to ${istParts(new Date(Math.max(...dates))).date}`);
  }
}

async function apply(roster, plan, existingDemoPatients) {
  const now = new Date();
  const hospitalByKey = new Map(roster.hospitals.map((h) => [h.key, h.hospital]));
  const patientsToTouch = new Set(plan.assignments.map((a) => a.patientId));
  let links = 0;

  for (const patientId of patientsToTouch) {
    if (existingDemoPatients.has(patientId)) continue;
    const patient = await Patient.findById(patientId);
    for (const a of plan.assignments.filter((x) => x.patientId === patientId)) {
      const hospital = hospitalByKey.get(a.hospitalKey);
      patient.assignedDoctors.push({
        doctorId: a.doctorId,
        facilityId: hospital._id,
        assignedAt: new Date(now.getTime() - 150 * 86400000),
        assignedBy: a.doctorId,
        isPrimary: a.isPrimary,
        status: 'active',
        notes: MARKER,
      });
      if (!(patient.facilities || []).some((f) => String(f.facilityId) === String(hospital._id))) {
        patient.facilities.push({ facilityId: hospital._id });
      }
      links++;
    }
    await patient.save();
  }

  const docs = plan.appointments.filter((a) => !existingDemoPatients.has(a.patientId)).map((a) => {
    const { time } = istParts(a.when);
    const done = a.status === 'completed';
    const end = new Date(a.when.getTime() + a.durationMin * 60000);
    return {
      patientId: a.patientId,
      providerId: a.providerId,
      hospitalId: hospitalByKey.get(a.hospitalKey)._id,
      appointmentDate: a.when,
      scheduledDateTime: a.when,
      startTime: time,
      endTime: addMinutes(time, a.durationMin),
      duration: a.durationMin,
      appointmentType: a.appointmentType,
      reasonForVisit: a.reasonForVisit,
      status: a.status,
      notes: MARKER,
      ...(done && { completedAt: end, checkedInAt: new Date(a.when.getTime() - 10 * 60000), paymentStatus: 'paid' }),
      ...(a.status === 'cancelled' && {
        cancelledAt: new Date(a.when.getTime() - 2 * 86400000),
        cancelledBy: a.providerId,
        cancellationReason: 'Patient requested a different day',
      }),
    };
  });

  const created = docs.length ? await Appointment.insertMany(docs) : [];
  console.log(`\nWrote ${links} doctor links and ${created.length} appointments.`);
}

async function removeDemo(apply_) {
  const appointments = await Appointment.countDocuments({ notes: MARKER });
  const patients = await Patient.countDocuments({ 'assignedDoctors.notes': MARKER });
  console.log(`\nDemo data to remove: ${appointments} appointments, doctor links on ${patients} patients.`);
  if (!apply_) return console.log('DRY RUN: nothing removed. Add --apply to remove it.');
  const a = await Appointment.deleteMany({ notes: MARKER });
  const p = await Patient.updateMany({ 'assignedDoctors.notes': MARKER }, { $pull: { assignedDoctors: { notes: MARKER } } });
  console.log(`Removed ${a.deletedCount} appointments and cleaned ${p.modifiedCount} patients.`);
}

export async function main(argv = process.argv.slice(2)) {
  const opts = parseArgs(argv);
  const uri = process.env[opts.uriEnv];
  if (!uri) throw new Error(`Environment variable ${opts.uriEnv} is not set`);

  console.log(opts.apply ? 'MODE: APPLY (will write)' : 'MODE: DRY RUN (read only)');
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to database "${mongoose.connection.db.databaseName}" at ${maskedTarget(uri)}`);

  try {
    if (opts.remove) return await removeDemo(opts.apply);

    const roster = await loadRoster();
    roster.warnings.forEach((w) => console.log(`WARNING: ${w}`));
    if (roster.hospitals.length === 0) throw new Error('No demo hospitals found, nothing to do.');

    const plan = planDemoLinks({
      hospitals: roster.hospitals.map(({ key, doctors, patients }) => ({ key, doctors, patients })),
      now: new Date(),
      seed: opts.seed,
    });

    const withDemoVisits = await Appointment.distinct('patientId', { notes: MARKER });
    const existingDemoPatients = new Set(withDemoVisits.map(String));

    printPlan(roster, plan, existingDemoPatients);
    if (!opts.apply) return console.log('\nDRY RUN: nothing written. Re-run with --apply to write this plan.');
    await apply(roster, plan, existingDemoPatients);
  } finally {
    await mongoose.disconnect();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\nFAILED: ${err.message}`);
    process.exit(1);
  });
}
