/**
 * Fix Patient-Doctor Assignments Script
 * 
 * Assigns the 20 seeded patients to their respective doctors:
 * - Sanjivani Hospital: 10 patients → 5 doctors (2 patients per doctor)
 * - Aarogya Kendra: 10 patients → 5 doctors (2 patients per doctor)
 * - Dr. Swami Murti: Single identity affiliated with both hospitals
 * 
 * This script is idempotent and can be safely re-run.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import logger from '../utils/logger.js';

// Sanjivani Hospital Doctors
const SANJIVANI_DOCTORS = [
  'soundarya.shetty@sanjivani.in',
  'christopher.matthews@sanjivani.in',
  'manjunath.rao@sanjivani.in',
  'asia.begum@sanjivani.in',
  'ansh.kumar@sanjivani.in',
];

// Aarogya Kendra Doctors
const AAROGYA_DOCTORS = [
  'harshith.bagrecha@aarogya.in',
  'ashwin.s@aarogya.in',
  'apoorva.santosh@aarogya.in',
  'siri.mn@aarogya.in',
  'vinay.kumar@aarogya.in',
];

// Sanjivani Hospital Patients
const SANJIVANI_PATIENTS = [
  'rajesh.kumar.pat@sanjivani.in',
  'meera.singh.pat@sanjivani.in',
  'anil.patel.pat@sanjivani.in',
  'divya.sharma.pat@sanjivani.in',
  'suresh.desai.pat@sanjivani.in',
  'priya.nair.pat@sanjivani.in',
  'vikram.rao.pat@sanjivani.in',
  'anjali.chopra.pat@sanjivani.in',
  'arjun.gupta.pat@sanjivani.in',
  'kavya.iyer.pat@sanjivani.in',
];

// Aarogya Kendra Patients
const AAROGYA_PATIENTS = [
  'ramesh.krishnan.pat@aarogya.in',
  'sneha.verma.pat@aarogya.in',
  'nikhil.pandey.pat@aarogya.in',
  'isha.joshi.pat@aarogya.in',
  'rohan.bansal.pat@aarogya.in',
  'neha.menon.pat@aarogya.in',
  'sanjay.agarwal.pat@aarogya.in',
  'pallavi.saxena.pat@aarogya.in',
  'ashok.tripathi.pat@aarogya.in',
  'ritika.pathak.pat@aarogya.in',
];

async function fixPatientAssignments() {
  try {
    console.log('🔧 Starting Patient-Doctor Assignment Fix...\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jeevacare', {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('✅ Connected to MongoDB\n');

    // Fetch hospitals
    const sanjivani = await Hospital.findOne({ name: /Sanjivani/i });
    const aarogya = await Hospital.findOne({ name: /Aarogya/i });

    if (!sanjivani || !aarogya) {
      throw new Error('Required hospitals not found. Please run seed script first.');
    }

    console.log(`📍 Sanjivani Hospital ID: ${sanjivani._id}`);
    console.log(`📍 Aarogya Kendra ID: ${aarogya._id}\n`);

    // Process Sanjivani assignments
    console.log('🏥 Processing Sanjivani Hospital assignments...');
    let sanjivaniAssignments = 0;
    
    for (let i = 0; i < SANJIVANI_PATIENTS.length; i++) {
      const patientEmail = SANJIVANI_PATIENTS[i];
      const doctorEmail = SANJIVANI_DOCTORS[i % SANJIVANI_DOCTORS.length]; // Rotate through doctors
      
      try {
        // Find patient
        const patientUser = await User.findOne({ email: patientEmail });
        if (!patientUser) {
          console.log(`  ⚠ Patient user not found: ${patientEmail}`);
          continue;
        }

        const patient = await Patient.findOne({ userId: patientUser._id });
        if (!patient) {
          console.log(`  ⚠ Patient record not found for: ${patientEmail}`);
          continue;
        }

        // Find doctor
        const doctorUser = await User.findOne({ email: doctorEmail });
        if (!doctorUser) {
          console.log(`  ⚠ Doctor user not found: ${doctorEmail}`);
          continue;
        }

        // Verify doctor is affiliated with hospital
        const staffRecord = await HospitalStaff.findOne({
          userId: doctorUser._id,
          hospitalId: sanjivani._id,
          associationStatus: 'active',
        });

        if (!staffRecord) {
          console.log(`  ⚠ Doctor ${doctorEmail} is not affiliated with Sanjivani Hospital`);
          continue;
        }

        // Check if assignment already exists
        const existingAssignment = patient.assignedDoctors.find(
          (a) =>
            a.doctorId.toString() === doctorUser._id.toString() &&
            a.facilityId.toString() === sanjivani._id.toString() &&
            a.status === 'active'
        );

        if (existingAssignment) {
          console.log(`  ✓ Assignment already exists: ${patientEmail} → ${doctorEmail}`);
          sanjivaniAssignments++;
          continue;
        }

        // Create assignment
        patient.assignedDoctors.push({
          doctorId: doctorUser._id,
          facilityId: sanjivani._id,
          assignedAt: new Date(),
          assignedBy: doctorUser._id, // Self-assigned for seed data
          isPrimary: true,
          status: 'active',
        });

        await patient.save();
        console.log(`  ✅ Assigned: ${patientEmail} → ${doctorEmail}`);
        sanjivaniAssignments++;
      } catch (err) {
        console.error(`  ✗ Error assigning ${patientEmail}: ${err.message}`);
      }
    }

    console.log(`\n✅ Sanjivani assignments completed: ${sanjivaniAssignments}/${SANJIVANI_PATIENTS.length}\n`);

    // Process Aarogya Kendra assignments
    console.log('🏥 Processing Aarogya Kendra assignments...');
    let aarogyaAssignments = 0;
    
    for (let i = 0; i < AAROGYA_PATIENTS.length; i++) {
      const patientEmail = AAROGYA_PATIENTS[i];
      const doctorEmail = AAROGYA_DOCTORS[i % AAROGYA_DOCTORS.length]; // Rotate through doctors
      
      try {
        // Find patient
        const patientUser = await User.findOne({ email: patientEmail });
        if (!patientUser) {
          console.log(`  ⚠ Patient user not found: ${patientEmail}`);
          continue;
        }

        const patient = await Patient.findOne({ userId: patientUser._id });
        if (!patient) {
          console.log(`  ⚠ Patient record not found for: ${patientEmail}`);
          continue;
        }

        // Find doctor
        const doctorUser = await User.findOne({ email: doctorEmail });
        if (!doctorUser) {
          console.log(`  ⚠ Doctor user not found: ${doctorEmail}`);
          continue;
        }

        // Verify doctor is affiliated with hospital
        const staffRecord = await HospitalStaff.findOne({
          userId: doctorUser._id,
          hospitalId: aarogya._id,
          associationStatus: 'active',
        });

        if (!staffRecord) {
          console.log(`  ⚠ Doctor ${doctorEmail} is not affiliated with Aarogya Kendra`);
          continue;
        }

        // Check if assignment already exists
        const existingAssignment = patient.assignedDoctors.find(
          (a) =>
            a.doctorId.toString() === doctorUser._id.toString() &&
            a.facilityId.toString() === aarogya._id.toString() &&
            a.status === 'active'
        );

        if (existingAssignment) {
          console.log(`  ✓ Assignment already exists: ${patientEmail} → ${doctorEmail}`);
          aarogyaAssignments++;
          continue;
        }

        // Create assignment
        patient.assignedDoctors.push({
          doctorId: doctorUser._id,
          facilityId: aarogya._id,
          assignedAt: new Date(),
          assignedBy: doctorUser._id, // Self-assigned for seed data
          isPrimary: true,
          status: 'active',
        });

        await patient.save();
        console.log(`  ✅ Assigned: ${patientEmail} → ${doctorEmail}`);
        aarogyaAssignments++;
      } catch (err) {
        console.error(`  ✗ Error assigning ${patientEmail}: ${err.message}`);
      }
    }

    console.log(`\n✅ Aarogya Kendra assignments completed: ${aarogyaAssignments}/${AAROGYA_PATIENTS.length}\n`);

    // Generate Assignment Audit
    console.log('\n' + '='.repeat(80));
    console.log('📊 ASSIGNMENT AUDIT SUMMARY');
    console.log('='.repeat(80));

    console.log('\n🏥 SANJIVANI HOSPITAL');
    console.log('-'.repeat(80));
    for (const doctorEmail of SANJIVANI_DOCTORS) {
      const doctorUser = await User.findOne({ email: doctorEmail });
      if (!doctorUser) continue;

      const assignedPatients = await Patient.find({
        'assignedDoctors': {
          $elemMatch: {
            doctorId: doctorUser._id,
            facilityId: sanjivani._id,
            status: 'active',
          },
        },
      }).populate('userId', 'email profile');

      console.log(`${doctorUser.profile?.firstName} ${doctorUser.profile?.lastName} (${doctorEmail})`);
      console.log(`  Assigned Patients: ${assignedPatients.length}`);
      if (assignedPatients.length > 0) {
        assignedPatients.forEach((p) => {
          console.log(`    - ${p.personalIdentity.firstName} ${p.personalIdentity.lastName} (${p.userId?.email || p.jeevaId})`);
        });
      }
      console.log('');
    }

    console.log('\n🏥 AAROGYA KENDRA');
    console.log('-'.repeat(80));
    for (const doctorEmail of AAROGYA_DOCTORS) {
      const doctorUser = await User.findOne({ email: doctorEmail });
      if (!doctorUser) continue;

      const assignedPatients = await Patient.find({
        'assignedDoctors': {
          $elemMatch: {
            doctorId: doctorUser._id,
            facilityId: aarogya._id,
            status: 'active',
          },
        },
      }).populate('userId', 'email profile');

      console.log(`${doctorUser.profile?.firstName} ${doctorUser.profile?.lastName} (${doctorEmail})`);
      console.log(`  Assigned Patients: ${assignedPatients.length}`);
      if (assignedPatients.length > 0) {
        assignedPatients.forEach((p) => {
          console.log(`    - ${p.personalIdentity.firstName} ${p.personalIdentity.lastName} (${p.userId?.email || p.jeevaId})`);
        });
      }
      console.log('');
    }

    // Check Dr. Swami Murti's dual affiliation
    console.log('\n👨‍⚕️ SHARED DOCTOR (Dr. Swami Murti)');
    console.log('-'.repeat(80));
    const swamiUser = await User.findOne({ email: 'swami.murti@jeevacare.in' });
    if (swamiUser) {
      const swamiStaffRecords = await HospitalStaff.find({
        userId: swamiUser._id,
        associationStatus: 'active',
      }).populate('hospitalId', 'name');

      console.log(`Email: ${swamiUser.email}`);
      console.log(`Affiliations: ${swamiStaffRecords.length}`);
      swamiStaffRecords.forEach((staff) => {
        console.log(`  - ${staff.hospitalId?.name} (Role: ${staff.role})`);
      });

      const swamiPatientsSanjivani = await Patient.find({
        'assignedDoctors': {
          $elemMatch: {
            doctorId: swamiUser._id,
            facilityId: sanjivani._id,
            status: 'active',
          },
        },
      });

      const swamiPatientsAarogya = await Patient.find({
        'assignedDoctors': {
          $elemMatch: {
            doctorId: swamiUser._id,
            facilityId: aarogya._id,
            status: 'active',
          },
        },
      });

      console.log(`  Assigned Patients (Sanjivani): ${swamiPatientsSanjivani.length}`);
      console.log(`  Assigned Patients (Aarogya): ${swamiPatientsAarogya.length}`);
    } else {
      console.log('⚠ Dr. Swami Murti user not found');
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Patient-Doctor Assignment Fix Complete!');
    console.log('='.repeat(80) + '\n');

  } catch (error) {
    console.error('\n❌ Error during patient assignment fix:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 MongoDB connection closed');
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  fixPatientAssignments();
}

export default fixPatientAssignments;
