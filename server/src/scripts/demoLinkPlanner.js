/**
 * Demo doctor-patient links and appointments: the planning logic.
 *
 * Pure functions, no database. Given who the doctors and patients of each hospital
 * are, produce a random-looking but reproducible plan: which doctors look after which
 * patients, and a believable appointment history for each patient. The same seed
 * always yields the same plan, so a dry run shows exactly what a real run will write.
 */

const DAY_MS = 86400000;
const IST_OFFSET_MIN = 330; // clinics are in Karnataka, India
const DAY_START_MIN = 9 * 60;
const DAY_END_MIN = 17 * 60;
const SLOT_MIN = 30;

/** Small seeded PRNG (mulberry32): returns a function giving floats in [0, 1). */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pick = (arr, rnd) => arr[Math.floor(rnd() * arr.length)];

function shuffled(arr, rnd) {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

const REASONS = [
  [/cardio/i, ['Chest discomfort and palpitations review', 'Blood pressure and cholesterol follow-up', 'ECG and heart health check']],
  [/internal/i, ['Fever and persistent fatigue', 'Diabetes and thyroid review', 'General health check-up']],
  [/ortho/i, ['Knee pain assessment', 'Lower back pain follow-up', 'Joint stiffness and mobility review']],
  [/pediatric/i, ['Child growth and nutrition check', 'Seasonal cough and cold', 'Routine vaccination review']],
  [/neuro/i, ['Recurring headaches evaluation', 'Dizziness and balance review', 'Sleep and migraine follow-up']],
  [/surgery/i, ['Post-operative wound review', 'Hernia assessment', 'Pre-surgical consultation']],
  [/\bent\b/i, ['Sinus congestion and ear pain', 'Throat infection follow-up', 'Hearing check']],
  [/obstetric|gyn/i, ['Routine antenatal check-up', 'Menstrual health consultation', 'Prenatal ultrasound review']],
  [/dermat/i, ['Skin rash and allergy review', 'Acne treatment follow-up', 'Hair fall consultation']],
  [/radiolog/i, ['Review of imaging results', 'Chest X-ray follow-up consultation', 'Imaging advice before treatment']],
  [/anesth|anaesth/i, ['Pre-anesthesia assessment', 'Pain management consultation', 'Post-procedure pain review']],
];
const GENERIC_REASONS = ['General consultation', 'Routine health check-up', 'Follow-up on recent symptoms'];

function reasonFor(specialization, rnd) {
  const match = REASONS.find(([pattern]) => pattern.test(specialization || ''));
  return pick(match ? match[1] : GENERIC_REASONS, rnd);
}

/** Moves a UTC instant to the nearest working day in IST (Mon-Fri), keeping the direction of travel. */
function toWeekday(dayStartUtc, forward) {
  let t = dayStartUtc;
  for (;;) {
    const istDay = new Date(t + IST_OFFSET_MIN * 60000).getUTCDay();
    if (istDay >= 1 && istDay <= 5) return t;
    t += forward ? DAY_MS : -DAY_MS;
  }
}

/** A free 30-minute slot on a working day roughly `daysFromNow` away, for both doctor and patient. */
function findSlot({ now, daysFromNow, providerId, patientId, taken, rnd }) {
  const forward = daysFromNow > 0;
  for (let attempt = 0; attempt < 60; attempt++) {
    const jitter = attempt === 0 ? 0 : Math.ceil(attempt / 4) * (forward ? 1 : -1);
    const base = now.getTime() + (daysFromNow + jitter) * DAY_MS;
    // Midnight IST of the target day, as a UTC instant.
    const istMidnight = Math.floor((base + IST_OFFSET_MIN * 60000) / DAY_MS) * DAY_MS - IST_OFFSET_MIN * 60000;
    const dayStart = toWeekday(istMidnight, forward);
    const slots = (DAY_END_MIN - DAY_START_MIN) / SLOT_MIN;
    const startMin = DAY_START_MIN + Math.floor(rnd() * slots) * SLOT_MIN;
    const when = new Date(dayStart + startMin * 60000);
    if (forward ? when <= now : when >= now) continue;
    const providerKey = `p:${providerId}@${when.toISOString()}`;
    const patientKey = `u:${patientId}@${when.toISOString()}`;
    if (taken.has(providerKey) || taken.has(patientKey)) continue;
    taken.add(providerKey);
    taken.add(patientKey);
    return when;
  }
  throw new Error(`Could not find a free appointment slot for ${patientId} / ${providerId}`);
}

/**
 * @param {Object} input
 * @param {Array<{key:string, doctors:Array<{id,name,specialization}>, patients:Array<{id,name}>}>} input.hospitals
 *        a doctor may appear in several hospitals (a shared doctor)
 * @param {Date} input.now
 * @param {number} [input.seed]
 * @returns {{assignments: Array, appointments: Array}}
 */
export function planDemoLinks({ hospitals, now, seed = 1 }) {
  const rnd = mulberry32(seed);
  const assignments = [];
  const appointments = [];
  const taken = new Set();

  for (const hospital of hospitals) {
    const doctors = shuffled(hospital.doctors, rnd);
    const patients = shuffled(hospital.patients, rnd);

    const byId = new Map(hospital.doctors.map((d) => [d.id, d]));
    let nextPrimary = 0;

    patients.forEach((patient) => {
      // Doctors this patient already sees are kept as they are; only patients without one get a new primary.
      const existing = (patient.existingDoctorIds || []).map((id) => byId.get(id) || { id, name: id, specialization: '' });
      const mine = [...existing];

      if (existing.length === 0) {
        // Round-robin over a shuffled doctor list: random, yet nobody ends up with more than one extra patient.
        const primary = doctors[nextPrimary++ % doctors.length];
        mine.push(primary);
        assignments.push({ patientId: patient.id, doctorId: primary.id, hospitalKey: hospital.key, isPrimary: true });
      }

      if (mine.length < 2 && doctors.length > 1 && rnd() < 0.5) {
        const secondary = pick(doctors.filter((d) => !mine.some((m) => m.id === d.id)), rnd);
        mine.push(secondary);
        assignments.push({ patientId: patient.id, doctorId: secondary.id, hospitalKey: hospital.key, isPrimary: false });
      }

      const primary = mine[0];
      const book = (doctor, daysFromNow, status, appointmentType) => {
        const when = findSlot({ now, daysFromNow, providerId: doctor.id, patientId: patient.id, taken, rnd });
        appointments.push({
          patientId: patient.id,
          providerId: doctor.id,
          hospitalKey: hospital.key,
          when,
          durationMin: appointmentType === 'follow_up' ? 20 : 30,
          status,
          appointmentType,
          reasonForVisit: reasonFor(doctor.specialization, rnd),
        });
      };

      const visitDoctor = () => pick(mine, rnd);
      // Two finished visits, a few months apart, the earlier one a first consultation.
      book(primary, -(110 + Math.floor(rnd() * 65)), 'completed', 'consultation');
      book(visitDoctor(), -(20 + Math.floor(rnd() * 80)), 'completed', pick(['follow_up', 'checkup'], rnd));
      // Now and then a visit that did not happen.
      if (rnd() < 0.3) book(visitDoctor(), -(5 + Math.floor(rnd() * 100)), pick(['cancelled', 'no_show'], rnd), 'consultation');
      // At least one visit coming up, sometimes two.
      book(visitDoctor(), 2 + Math.floor(rnd() * 19), pick(['scheduled', 'confirmed'], rnd), pick(['follow_up', 'checkup'], rnd));
      if (rnd() < 0.3) book(visitDoctor(), 3 + Math.floor(rnd() * 18), 'scheduled', 'consultation');
    });
  }

  return { assignments, appointments };
}
