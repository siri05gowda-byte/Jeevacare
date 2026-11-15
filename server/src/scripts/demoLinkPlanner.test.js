import { describe, it, expect } from 'vitest';
import { planDemoLinks, mulberry32 } from './demoLinkPlanner.js';

const NOW = new Date('2026-11-15T10:00:00.000Z');

function pool() {
  const sanjivaniDoctors = ['s1', 's2', 's3', 's4', 's5'].map((id, i) => ({
    id,
    name: `Dr ${id}`,
    specialization: ['Internal Medicine', 'Cardiology', 'Orthopedics', 'Pediatrics', 'Neurology'][i],
  }));
  const aarogyaDoctors = ['a1', 'a2', 'a3', 'a4', 'a5'].map((id, i) => ({
    id,
    name: `Dr ${id}`,
    specialization: ['General Surgery', 'ENT', 'Obstetrics & Gynecology', 'Dermatology', 'Radiology'][i],
  }));
  const shared = { id: 'swami', name: 'Dr Swami', specialization: 'Anesthesiology' };
  const patients = (prefix) => Array.from({ length: 10 }, (_, i) => ({ id: `${prefix}${i + 1}`, name: `${prefix} ${i + 1}` }));
  return [
    { key: 'sanjivani', doctors: [...sanjivaniDoctors, shared], patients: patients('ps') },
    { key: 'aarogya', doctors: [...aarogyaDoctors, shared], patients: patients('pa') },
  ];
}

const plan = (seed = 1) => planDemoLinks({ hospitals: pool(), now: NOW, seed });
const hospitalOf = (patientId) => (patientId.startsWith('ps') ? 'sanjivani' : 'aarogya');
const doctorIdsOf = (hospitalKey) => pool().find((h) => h.key === hospitalKey).doctors.map((d) => d.id);

describe('planDemoLinks: doctor-patient assignments', () => {
  it('gives every patient exactly one primary doctor from their own hospital', () => {
    const { assignments } = plan();
    for (const h of pool()) {
      for (const p of h.patients) {
        const primary = assignments.filter((a) => a.patientId === p.id && a.isPrimary);
        expect(primary).toHaveLength(1);
        expect(doctorIdsOf(h.key)).toContain(primary[0].doctorId);
        expect(primary[0].hospitalKey).toBe(h.key);
      }
    }
  });

  it('spreads patients evenly: every doctor in the pool has a primary patient, counts differ by at most one', () => {
    const { assignments } = plan();
    for (const h of pool()) {
      const counts = h.doctors.map(
        (d) => assignments.filter((a) => a.isPrimary && a.hospitalKey === h.key && a.doctorId === d.id).length
      );
      expect(Math.min(...counts)).toBeGreaterThanOrEqual(1);
      expect(Math.max(...counts) - Math.min(...counts)).toBeLessThanOrEqual(1);
    }
  });

  it('adds a different second doctor from the same hospital for some patients', () => {
    const { assignments } = plan();
    const secondary = assignments.filter((a) => !a.isPrimary);
    expect(secondary.length).toBeGreaterThan(0);
    for (const s of secondary) {
      const primary = assignments.find((a) => a.patientId === s.patientId && a.isPrimary);
      expect(s.doctorId).not.toBe(primary.doctorId);
      expect(doctorIdsOf(s.hospitalKey)).toContain(s.doctorId);
      expect(s.hospitalKey).toBe(hospitalOf(s.patientId));
    }
    // no patient has more than two doctors
    for (const h of pool()) for (const p of h.patients) {
      expect(assignments.filter((a) => a.patientId === p.id).length).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for a seed and varies between seeds', () => {
    expect(plan(7)).toEqual(plan(7));
    expect(plan(7).assignments).not.toEqual(plan(8).assignments);
  });
});

describe('planDemoLinks: appointments', () => {
  it('gives every patient at least two past visits and one upcoming visit', () => {
    const { appointments } = plan();
    for (const h of pool()) for (const p of h.patients) {
      const mine = appointments.filter((a) => a.patientId === p.id);
      expect(mine.filter((a) => a.when < NOW).length).toBeGreaterThanOrEqual(2);
      expect(mine.filter((a) => a.when > NOW).length).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps past visits in the past (1-6 months back) and upcoming ones within three weeks', () => {
    const DAY = 86400000;
    for (const a of plan().appointments) {
      const days = (a.when - NOW) / DAY;
      if (a.when < NOW) expect(days).toBeGreaterThanOrEqual(-185);
      else expect(days).toBeLessThanOrEqual(22);
    }
  });

  it('uses statuses that fit the date: upcoming visits are scheduled or confirmed, past ones are finished', () => {
    for (const a of plan().appointments) {
      if (a.when > NOW) expect(['scheduled', 'confirmed']).toContain(a.status);
      else expect(['completed', 'cancelled', 'no_show']).toContain(a.status);
    }
    const past = plan().appointments.filter((a) => a.when < NOW);
    expect(past.filter((a) => a.status === 'completed').length / past.length).toBeGreaterThan(0.6);
  });

  it('only books a patient with their own assigned doctors, at that patient\'s hospital', () => {
    const { assignments, appointments } = plan();
    for (const a of appointments) {
      const linked = assignments.some((x) => x.patientId === a.patientId && x.doctorId === a.providerId);
      expect(linked).toBe(true);
      expect(a.hospitalKey).toBe(hospitalOf(a.patientId));
    }
  });

  it('never double-books a doctor, and only uses weekday working hours (IST)', () => {
    const seen = new Set();
    for (const a of plan().appointments) {
      const key = `${a.providerId}@${a.when.toISOString()}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
      const ist = new Date(a.when.getTime() + 330 * 60000); // clinics are in India (UTC+05:30)
      const day = ist.getUTCDay();
      expect(day).toBeGreaterThanOrEqual(1);
      expect(day).toBeLessThanOrEqual(5);
      const minutes = ist.getUTCHours() * 60 + ist.getUTCMinutes();
      expect(minutes).toBeGreaterThanOrEqual(9 * 60);
      expect(minutes + a.durationMin).toBeLessThanOrEqual(17 * 60);
    }
  });

  it('never double-books a patient at the same time', () => {
    const seen = new Set();
    for (const a of plan().appointments) {
      const key = `${a.patientId}@${a.when.toISOString()}`;
      expect(seen.has(key)).toBe(false);
      seen.add(key);
    }
  });

  it('uses only appointment types and fields the Appointment model accepts', () => {
    const types = ['consultation', 'follow_up', 'procedure', 'vaccination', 'checkup', 'emergency', 'other'];
    for (const a of plan().appointments) {
      expect(types).toContain(a.appointmentType);
      expect(a.reasonForVisit.length).toBeGreaterThan(3);
      expect(a.durationMin).toBeGreaterThan(0);
    }
  });

  it('picks a reason that fits the doctor\'s specialty', () => {
    const { appointments } = plan(3);
    const cardiology = appointments.filter((a) => a.providerId === 's2');
    expect(cardiology.length).toBeGreaterThan(0);
    expect(cardiology.every((a) => /heart|blood pressure|cardiac|chest|ecg|cholesterol|palpitation/i.test(a.reasonForVisit))).toBe(true);
  });
});

describe('planDemoLinks: patients that already have a doctor', () => {
  const withExisting = () => {
    const hospitals = pool();
    hospitals[0].patients[0].existingDoctorIds = ['s3']; // ps1 already sees Dr s3
    hospitals[0].patients[1].existingDoctorIds = ['s1', 's2']; // ps2 already has two doctors
    return hospitals;
  };
  const planExisting = () => planDemoLinks({ hospitals: withExisting(), now: NOW, seed: 5 });

  it('keeps the existing doctor and does not add a new primary', () => {
    const { assignments } = planExisting();
    expect(assignments.filter((a) => a.patientId === 'ps1' && a.isPrimary)).toHaveLength(0);
    expect(assignments.filter((a) => a.patientId === 'ps2')).toHaveLength(0);
  });

  it('never gives a patient more than two doctors in total', () => {
    const { assignments } = planExisting();
    expect(assignments.filter((a) => a.patientId === 'ps1').length).toBeLessThanOrEqual(1); // 1 existing + at most 1 new
  });

  it('books the patient with their existing doctors only (plus any new second doctor)', () => {
    const { assignments, appointments } = planExisting();
    const allowed = new Set(['s3', ...assignments.filter((a) => a.patientId === 'ps1').map((a) => a.doctorId)]);
    const mine = appointments.filter((a) => a.patientId === 'ps1');
    expect(mine.length).toBeGreaterThanOrEqual(3);
    for (const a of mine) expect(allowed.has(a.providerId)).toBe(true);
    const two = new Set(['s1', 's2']);
    for (const a of appointments.filter((x) => x.patientId === 'ps2')) expect(two.has(a.providerId)).toBe(true);
  });

  it('still plans normally for patients without a doctor', () => {
    const { assignments } = planExisting();
    expect(assignments.filter((a) => a.patientId === 'ps3' && a.isPrimary)).toHaveLength(1);
  });
});

describe('mulberry32', () => {
  it('is repeatable and stays in [0, 1)', () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 50; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});
