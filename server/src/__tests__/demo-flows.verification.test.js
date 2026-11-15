/**
 * End-to-end check of the user-input flows against a LOCAL copy of the demo data:
 * login, dashboard data, profile update, password change, document upload, appointment booking,
 * and that doctors see their linked patients and appointments.
 *
 * It mounts the real route files on a throwaway Express app. Cloudinary is stubbed, so nothing is
 * uploaded anywhere. It runs only when FLOW_TEST_MONGODB_URI is set (a database you can throw away,
 * already holding the demo seed); it deliberately never reads MONGODB_URI, so it cannot touch live data.
 *
 *   FLOW_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/jeevacare-test npx vitest run src/__tests__/demo-flows.verification.test.js
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';

const FLOW_URI = process.env.FLOW_TEST_MONGODB_URI;

vi.mock('../adapters/CloudinaryAdapter.js', () => ({
  default: {
    uploadFile: async (buffer, options = {}) => ({
      success: true,
      publicId: `test/${Date.now()}`,
      url: 'https://example.invalid/test-upload',
      bytes: buffer.length,
      format: 'pdf',
      ...options,
    }),
    deleteFile: async () => ({ success: true }),
    isDemoMode: () => true,
    getStatus: () => ({ configured: true }),
  },
}));

// The bootstrap reports users to Google Sheets; never let a test do that.
vi.mock('../services/GoogleSheetsService.js', () => ({
  default: new Proxy({}, { get: () => async () => ({}) }),
}));

const describeFlows = FLOW_URI ? describe : describe.skip;

describeFlows('demo user-input flows (local database)', () => {
  let app;
  const PATIENT = { email: 'rajesh.kumar.pat@sanjivani.in', password: 'Patient@123' };
  const DOCTOR = { email: 'soundarya.shetty@sanjivani.in', password: 'SoundaryaShetty@123' };
  const tokens = {};

  const login = async ({ email, password }) => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: email, password });
    return res;
  };
  const authed = (method, url, role) => request(app)[method](url).set('Authorization', `Bearer ${tokens[role]}`);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await mongoose.connect(FLOW_URI);
    // Build the demo hospitals, doctors and patients exactly as the live server does on startup.
    const { bootstrapDemoHospitalsAndAccounts } = await import('../utils/bootstrapDemoData.js');
    await bootstrapDemoHospitalsAndAccounts();
    // Same startup step the server runs: every user gets a JeevaCare ID.
    const { ensureJeevaIds } = await import('../utils/jeevaIdBackfill.js');
    await ensureJeevaIds();
    // Link doctors to patients exactly as the server does on startup, and fail loudly if it cannot.
    const warnings = [];
    const { linkDemoDataOnStartup } = await import('../utils/demoLinkStartup.js');
    await linkDemoDataOnStartup({
      env: {},
      logger: { info: () => {}, warn: (m) => warnings.push(m) },
    });
    if (warnings.length) throw new Error(`Startup linking failed: ${warnings.join('; ')}`);
    const [auth, patients, appointments, facilities, documents, errors] = await Promise.all([
      import('../routes/authRoutes.js'),
      import('../routes/patientRoutes.js'),
      import('../routes/appointmentRoutes.js'),
      import('../routes/facilityRoutes.js'),
      import('../routes/documentRoutes.js'),
      import('../middleware/errorHandler.js'),
    ]);
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', auth.default);
    app.use('/api/v1/patients', patients.default);
    app.use('/api/v1/appointments', appointments.default);
    app.use('/api/v1/facilities', facilities.default);
    app.use('/api/v1/documents', documents.default);
    app.use(errors.errorHandler); // same error mapping as the real server (e.g. bad token -> 401)
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  describe('demo doctors can see patients (needed for booking)', () => {
    it('every demo doctor passes the clinical authorization gate at their hospital', async () => {
      const [{ default: HospitalStaff }, { default: Patient }, { default: ClinicalAuth }] = await Promise.all([
        import('../models/HospitalStaff.js'),
        import('../models/Patient.js'),
        import('../utils/clinicalAuthorizationBoundary.js'),
      ]);
      const staff = await HospitalStaff.find({ role: 'doctor', associationStatus: 'active' });
      expect(staff.length).toBeGreaterThanOrEqual(11);
      const failures = [];
      for (const s of staff) {
        const patient = await Patient.findOne({ 'facilities.facilityId': s.hospitalId });
        const result = await ClinicalAuth.canCreateOfficialClinicalRecord(s.userId, s.hospitalId, patient._id);
        if (!result.authorized) failures.push(`${s.userId}: ${result.error}`);
      }
      expect(failures).toEqual([]);
    });
  });

  describe('JeevaCare ID', () => {
    it('every user has one, and every patient account matches the ID on their record', async () => {
      const [{ default: User }, { default: Patient }, { validateJeevaIdFormat }] = await Promise.all([
        import('../models/User.js'),
        import('../models/Patient.js'),
        import('../utils/jeevaIdGenerator.js'),
      ]);
      const users = await User.find({});
      expect(users.length).toBeGreaterThanOrEqual(33);
      const missing = users.filter((u) => !validateJeevaIdFormat(u.jeevaId)).map((u) => u.email);
      expect(missing).toEqual([]);
      expect(new Set(users.map((u) => u.jeevaId)).size).toBe(users.length);
      const mismatched = [];
      for (const p of await Patient.find({ userId: { $exists: true } })) {
        const u = users.find((x) => String(x._id) === String(p.userId));
        if (u && u.jeevaId !== p.jeevaId) mismatched.push(u.email);
      }
      expect(mismatched).toEqual([]);
    });
  });

  describe('login', () => {
    it('lets the demo patient and doctor sign in and returns a token', async () => {
      for (const [role, creds] of [['patient', PATIENT], ['doctor', DOCTOR]]) {
        const res = await login(creds);
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        const token = res.body.tokens?.token;
        expect(token).toBeTruthy();
        tokens[role] = token;
      }
    });

    it('rejects a wrong password', async () => {
      const res = await login({ email: PATIENT.email, password: 'definitely-wrong' });
      expect(res.status).toBe(401);
    });
  });

  describe('JeevaCare ID in the signed-in account', () => {
    it('shows a signed-in patient the same ID in their account and on the dashboard', async () => {
      const me = await authed('get', '/api/v1/auth/current-user', 'patient');
      const profile = await authed('get', '/api/v1/patients/profile', 'patient');
      const accountId = (me.body.user || me.body.data || me.body).jeevaId;
      const dashboardId = (profile.body.data || profile.body.patient).jeevaId;
      expect(accountId).toBeTruthy();
      expect(accountId).toBe(dashboardId);
    });
  });

  describe('patient dashboard data', () => {
    it('returns the patient profile used by the dashboard', async () => {
      const res = await authed('get', '/api/v1/patients/profile', 'patient');
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.patient || res.body.data).toBeTruthy();
    });
  });

  describe('doctor sees linked patients', () => {
    it('lists the patients assigned to the doctor', async () => {
      const res = await authed('get', '/api/v1/patients/assigned-to/me', 'doctor');
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      const list = res.body.patients || res.body.data || [];
      expect(list.length).toBeGreaterThan(0);
    });

    it('lists the doctor\'s appointments, past and upcoming', async () => {
      const me = await authed('get', '/api/v1/auth/current-user', 'doctor');
      const doctorId = (me.body.user || me.body.data || me.body)._id;
      const res = await authed('get', `/api/v1/appointments/doctor/${doctorId}`, 'doctor');
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      const list = res.body.data || res.body.appointments || [];
      expect(list.length).toBeGreaterThan(0);
      const times = list.map((a) => new Date(a.scheduledDateTime || a.appointmentDate).getTime());
      expect(times.some((t) => t < Date.now())).toBe(true);
      expect(times.some((t) => t > Date.now())).toBe(true);
    });
  });

  describe('settings: update profile', () => {
    it('updates name and phone and reads them back', async () => {
      const res = await authed('put', '/api/v1/auth/profile', 'patient').send({
        firstName: 'Rajesh',
        lastName: 'Kumar-Test',
        phone: '+91-9000000001',
      });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.success).toBe(true);
      const me = await authed('get', '/api/v1/auth/current-user', 'patient');
      expect(me.status).toBe(200);
      const user = me.body.user || me.body.data || me.body;
      expect(user.profile?.lastName).toBe('Kumar-Test');
      expect(user.profile?.phone).toBe('+91-9000000001');
      await authed('put', '/api/v1/auth/profile', 'patient').send({ firstName: 'Rajesh', lastName: 'Kumar', phone: '+91-9845110001' });
    });

    it('rejects an empty first name', async () => {
      const res = await authed('put', '/api/v1/auth/profile', 'patient').send({ firstName: '   ', lastName: 'Kumar' });
      expect(res.status).toBe(400);
    });
  });

  describe('settings: profile picture', () => {
    const PNG_1X1 = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64'
    );

    it('accepts a PNG', async () => {
      const res = await authed('post', '/api/v1/auth/upload-profile-picture', 'patient').attach('profilePicture', PNG_1X1, {
        filename: 'me.png',
        contentType: 'image/png',
      });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('rejects a non-image file', async () => {
      const res = await authed('post', '/api/v1/auth/upload-profile-picture', 'patient').attach('profilePicture', Buffer.from('hello'), {
        filename: 'notes.txt',
        contentType: 'text/plain',
      });
      expect(res.status).toBe(400);
    });

    it('rejects a request with no file', async () => {
      const res = await authed('post', '/api/v1/auth/upload-profile-picture', 'patient');
      expect(res.status).toBe(400);
    });
  });

  describe('settings: change password', () => {
    it('rejects a wrong current password', async () => {
      const res = await authed('post', '/api/v1/auth/change-password', 'patient').send({
        currentPassword: 'not-the-password',
        newPassword: 'NewPassw0rd!Test',
      });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });

    const NEW_PASSWORD = 'NewPassw0rd!Test';
    const changePassword = (current, next) =>
      authed('post', '/api/v1/auth/change-password', 'patient').send({
        currentPassword: current,
        newPassword: next,
      });

    it('changes the password and the new one signs in', async () => {
      const change = await changePassword(PATIENT.password, NEW_PASSWORD);
      expect(change.status, JSON.stringify(change.body)).toBe(200);
      const fresh = await login({ email: PATIENT.email, password: NEW_PASSWORD });
      expect(fresh.status).toBe(200);
      tokens.patient = fresh.body.tokens?.token;
      // restore the demo password so the demo data is left as it was found
      const back = await changePassword(NEW_PASSWORD, PATIENT.password);
      expect(back.status, JSON.stringify(back.body)).toBe(200);
    });

    it('demo mode (the default) keeps the built-in demo password working even after a change', async () => {
      // Known behaviour of User.comparePassword: demo accounts also accept fixed passwords such as
      // Patient@123 unless DEMO_MODE=false. This test documents it; see the next test for the safe setting.
      expect((await changePassword(PATIENT.password, NEW_PASSWORD)).status).toBe(200);
      try {
        expect((await login({ email: PATIENT.email, password: PATIENT.password })).status).toBe(200);
      } finally {
        const fresh = await login({ email: PATIENT.email, password: NEW_PASSWORD });
        tokens.patient = fresh.body.tokens?.token;
        await changePassword(NEW_PASSWORD, PATIENT.password);
      }
    });

    it('with DEMO_MODE=false the old password really stops working after a change', async () => {
      expect((await changePassword(PATIENT.password, NEW_PASSWORD)).status).toBe(200);
      process.env.DEMO_MODE = 'false';
      try {
        expect((await login({ email: PATIENT.email, password: PATIENT.password })).status).toBe(401);
        const fresh = await login({ email: PATIENT.email, password: NEW_PASSWORD });
        expect(fresh.status).toBe(200);
        tokens.patient = fresh.body.tokens?.token;
      } finally {
        delete process.env.DEMO_MODE;
        await changePassword(NEW_PASSWORD, PATIENT.password);
      }
      expect((await login(PATIENT)).status).toBe(200);
    });
  });

  describe('document upload (patient)', () => {
    it('accepts a PDF and lists it back', async () => {
      const res = await authed('post', '/api/v1/documents/upload', 'patient')
        .field('documentType', 'lab_result')
        .attach('file', Buffer.from('%PDF-1.4 test document'), { filename: 'cbc.pdf', contentType: 'application/pdf' });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.success).toBe(true);
      const pid = res.body.document.patientId;
      const list = await authed('get', `/api/v1/documents/patient/${pid}`, 'patient');
      expect(list.status, JSON.stringify(list.body).slice(0, 300)).toBe(200);
    });

    it('rejects a file type that is not allowed', async () => {
      const res = await authed('post', '/api/v1/documents/upload', 'patient')
        .field('documentType', 'lab_result')
        .attach('file', Buffer.from('MZ binary'), { filename: 'virus.exe', contentType: 'application/x-msdownload' });
      expect(res.status).toBe(400);
    });

    it('rejects an upload with no file', async () => {
      const res = await authed('post', '/api/v1/documents/upload', 'patient').field('documentType', 'lab_result');
      expect(res.status).toBe(400);
    });
  });

  describe('document upload (doctor for a patient)', () => {
    it('finds a patient by name and uploads a document for them', async () => {
      const found = await authed('get', '/api/v1/patients/search?q=Meera&limit=10', 'doctor');
      expect(found.status, JSON.stringify(found.body).slice(0, 300)).toBe(200);
      const list = found.body.data?.patients || found.body.patients || [];
      expect(list.length).toBeGreaterThan(0);
      const patientId = list[0]._id || list[0].id;

      const res = await authed('post', '/api/v1/documents/upload', 'doctor')
        .field('patientId', String(patientId))
        .field('documentType', 'prescription')
        .attach('file', Buffer.from('%PDF-1.4 prescription'), { filename: 'rx.pdf', contentType: 'application/pdf' });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('refuses an upload for a patient that does not exist', async () => {
      const res = await authed('post', '/api/v1/documents/upload', 'doctor')
        .field('patientId', '000000000000000000000000')
        .field('documentType', 'prescription')
        .attach('file', Buffer.from('%PDF-1.4 x'), { filename: 'rx.pdf', contentType: 'application/pdf' });
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('appointment booking', () => {
    it('shows facilities and their doctors, then books an appointment that appears for the patient and doctor', async () => {
      const fac = await authed('get', '/api/v1/facilities', 'patient');
      expect(fac.status, JSON.stringify(fac.body).slice(0, 300)).toBe(200);
      const facilities = fac.body.facilities || fac.body.data || [];
      expect(facilities.length).toBeGreaterThan(0);
      const sanjivani = facilities.find((f) => /sanjivani/i.test(f.name)) || facilities[0];
      const docs = await authed('get', `/api/v1/facilities/${sanjivani._id}/doctors`, 'patient');
      expect(docs.status, JSON.stringify(docs.body).slice(0, 300)).toBe(200);
      const doctors = docs.body.doctors || docs.body.data || [];
      expect(doctors.length).toBeGreaterThan(0);
      const doctor = doctors.find((d) => d.email === DOCTOR.email);
      expect(doctor, 'Dr. Shetty should be bookable at Sanjivani').toBeTruthy();

      const when = new Date(Date.now() + 40 * 86400000);
      when.setUTCHours(5, 0, 0, 0); // 10:30 IST
      const book = await authed('post', '/api/v1/appointments/book', 'patient').send({
        providerId: doctor._id || doctor.userId || doctor.id,
        hospitalId: sanjivani._id,
        appointmentDate: when.toISOString(),
        scheduledDateTime: when.toISOString(),
        appointmentType: 'consultation',
        reasonForVisit: 'Flow verification booking',
      });
      expect(book.status, JSON.stringify(book.body).slice(0, 400)).toBeLessThan(300);
      const created = book.body.data;
      expect(created?._id).toBeTruthy();

      const mine = await authed('get', `/api/v1/appointments/patient/${created.patientId}`, 'patient');
      expect(mine.status, JSON.stringify(mine.body).slice(0, 300)).toBe(200);
      const patientList = mine.body.data || mine.body.appointments || [];
      expect(patientList.some((a) => String(a._id) === String(created._id))).toBe(true);

      const theirs = await authed('get', `/api/v1/appointments/doctor/${doctor._id}`, 'doctor');
      expect(theirs.status, JSON.stringify(theirs.body).slice(0, 300)).toBe(200);
      const doctorList = theirs.body.data || theirs.body.appointments || [];
      expect(doctorList.some((a) => String(a._id) === String(created._id))).toBe(true);
    });

    it('rejects a booking with missing details', async () => {
      const res = await authed('post', '/api/v1/appointments/book', 'patient').send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
    });
  });

  describe('a brand-new patient: register, upload, book', () => {
    const NEWBIE = { email: 'new.patient.flow@example.com', password: 'Str0ngPassw0rd!', firstName: 'Nisha', lastName: 'Flowtest' };
    let patientId;

    it('registers through the form and gets signed in', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        ...NEWBIE,
        role: 'PATIENT',
        phone: '+91-9000000002',
        dateOfBirth: '1995-04-12',
        sex: 'F',
        termsAccepted: true,
        privacyPolicyAccepted: true,
      });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
      tokens.newPatient = res.body.tokens?.token;
      expect(tokens.newPatient).toBeTruthy();
      expect(res.body.user.role).toBe('PATIENT');
      expect(res.body.user.verificationStatus).toBe('verified'); // patients need no approval
    });

    it('can sign in again with the password they chose', async () => {
      const res = await login({ email: NEWBIE.email, password: NEWBIE.password });
      expect(res.status, JSON.stringify(res.body).slice(0, 200)).toBe(200);
      tokens.newPatient = res.body.tokens?.token;
    });

    it('gives a newly registered staff member a JeevaCare ID straight away', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'new.paramedic.flow@example.com',
        password: 'Str0ngPassw0rd!',
        firstName: 'Pavan',
        lastName: 'Medic',
        role: 'PARAMEDIC',
      });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
      expect(res.body.user.jeevaId).toMatch(/^JJ\d{2}-[0-9A-Z]{5}$/);
    });

    it('rejects a second registration with the same email, a weak password, and an admin role', async () => {
      const dup = await request(app).post('/api/v1/auth/register').send({ ...NEWBIE, role: 'PATIENT' });
      expect(dup.status).toBe(409);
      const weak = await request(app).post('/api/v1/auth/register').send({ ...NEWBIE, email: 'weak@example.com', password: 'short' });
      expect(weak.status).toBe(400);
      const admin = await request(app).post('/api/v1/auth/register').send({ ...NEWBIE, email: 'sneaky@example.com', role: 'SYSTEM_ADMIN' });
      expect(admin.status).toBeGreaterThanOrEqual(400);
      expect(admin.status).toBeLessThan(500);
    });

    it('has the same JeevaCare ID in their account and on their dashboard', async () => {
      const me = await authed('get', '/api/v1/auth/current-user', 'newPatient');
      const profile = await authed('get', '/api/v1/patients/profile', 'newPatient');
      const accountId = (me.body.user || me.body.data || me.body).jeevaId;
      const dashboardId = (profile.body.data || profile.body.patient).jeevaId;
      expect(accountId).toMatch(/^JJ\d{2}-[0-9A-Z]{5}$/);
      expect(accountId).toBe(dashboardId);
    });

    it('has a dashboard profile', async () => {
      const res = await authed('get', '/api/v1/patients/profile', 'newPatient');
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      patientId = (res.body.data || res.body.patient)._id;
      expect(patientId).toBeTruthy();
    });

    it('uploads a document', async () => {
      const res = await authed('post', '/api/v1/documents/upload', 'newPatient')
        .field('documentType', 'lab_result')
        .attach('file', Buffer.from('%PDF-1.4 new patient report'), { filename: 'report.pdf', contentType: 'application/pdf' });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('books an appointment with a doctor at a hospital they have never visited', async () => {
      const fac = await authed('get', '/api/v1/facilities', 'newPatient');
      expect(fac.status, JSON.stringify(fac.body).slice(0, 300)).toBe(200);
      const hospital = (fac.body.facilities || fac.body.data || []).find((f) => /sanjivani/i.test(f.name));
      const docs = await authed('get', `/api/v1/facilities/${hospital._id}/doctors`, 'newPatient');
      const doctor = (docs.body.doctors || docs.body.data || []).find((d) => d.email === DOCTOR.email);
      expect(doctor).toBeTruthy();

      const when = new Date(Date.now() + 45 * 86400000);
      when.setUTCHours(6, 0, 0, 0);
      const book = await authed('post', '/api/v1/appointments/book', 'newPatient').send({
        providerId: doctor._id,
        hospitalId: hospital._id,
        appointmentDate: when.toISOString(),
        scheduledDateTime: when.toISOString(),
        reasonForVisit: 'First visit',
      });
      expect(book.status, JSON.stringify(book.body).slice(0, 400)).toBeLessThan(300);
      const created = book.body.data;

      const mine = await authed('get', `/api/v1/appointments/patient/${patientId}`, 'newPatient');
      expect(mine.status).toBe(200);
      expect((mine.body.data || mine.body.appointments || []).some((a) => String(a._id) === String(created._id))).toBe(true);
      const theirs = await authed('get', `/api/v1/appointments/doctor/${doctor._id}`, 'doctor');
      expect((theirs.body.data || theirs.body.appointments || []).some((a) => String(a._id) === String(created._id))).toBe(true);
    });

    it('is now registered at that hospital, so the doctor can see them', async () => {
      const { default: Patient } = await import('../models/Patient.js');
      const patient = await Patient.findById(patientId);
      expect(patient.facilities.length).toBe(1);
    });
  });

  describe('cancel and reschedule', () => {
    // Books a fresh appointment for the signed-in patient with Dr. Shetty at Sanjivani.
    const bookFresh = async (role, daysAhead, hourUtc) => {
      const fac = await authed('get', '/api/v1/facilities', role);
      const hospital = (fac.body.facilities || fac.body.data || []).find((f) => /sanjivani/i.test(f.name));
      const docs = await authed('get', `/api/v1/facilities/${hospital._id}/doctors`, role);
      const doctor = (docs.body.doctors || docs.body.data || []).find((d) => d.email === DOCTOR.email);
      const when = new Date(Date.now() + daysAhead * 86400000);
      when.setUTCHours(hourUtc, 0, 0, 0);
      const book = await authed('post', '/api/v1/appointments/book', role).send({
        providerId: doctor._id,
        hospitalId: hospital._id,
        appointmentDate: when.toISOString(),
        scheduledDateTime: when.toISOString(),
        reasonForVisit: 'Cancel and reschedule check',
      });
      expect(book.status, JSON.stringify(book.body).slice(0, 300)).toBeLessThan(300);
      return book.body.data;
    };
    const listFor = async (role, patientId) => {
      const res = await authed('get', `/api/v1/appointments/patient/${patientId}`, role);
      return res.body.data || res.body.appointments || [];
    };

    it('lets a patient cancel their own appointment, keeping the reason', async () => {
      const apt = await bookFresh('patient', 50, 4);
      const res = await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'patient').send({ reason: 'Cancelled by patient' });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
      expect(res.body.data.cancellationReason).toBe('Cancelled by patient');
      const after = (await listFor('patient', apt.patientId)).find((a) => String(a._id) === String(apt._id));
      expect(after.status).toBe('cancelled');
    });

    it('cancels without a reason too', async () => {
      const apt = await bookFresh('patient', 51, 4);
      const res = await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'patient').send({});
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('refuses to cancel an appointment that is already cancelled', async () => {
      const apt = await bookFresh('patient', 52, 4);
      await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'patient').send({});
      const again = await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'patient').send({});
      expect(again.status).toBeGreaterThanOrEqual(400);
      expect(again.status).toBeLessThan(500);
    });

    it("does not let another patient cancel someone else's appointment", async () => {
      const apt = await bookFresh('patient', 53, 4);
      const res = await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'newPatient').send({});
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect(res.status).toBeLessThan(500);
      const still = (await listFor('patient', apt.patientId)).find((a) => String(a._id) === String(apt._id));
      expect(still.status).toBe('scheduled');
    });

    it('lets the doctor cancel an appointment too', async () => {
      const apt = await bookFresh('patient', 54, 4);
      const res = await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'doctor').send({ reason: 'Doctor unavailable' });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(res.body.data.status).toBe('cancelled');
    });

    it('notifies the patient (their user, not the patient record) when an appointment is cancelled or rescheduled', async () => {
      const { default: Notification } = await import('../models/Notification.js');
      const me = await authed('get', '/api/v1/auth/current-user', 'patient');
      const userId = (me.body.user || me.body.data || me.body)._id;
      const apt = await bookFresh('patient', 57, 4);
      await authed('post', `/api/v1/appointments/${apt._id}/cancel`, 'doctor').send({ reason: 'Doctor unavailable' });
      const cancelled = await Notification.findOne({ userId, type: 'appointment_cancelled', 'metadata.appointmentId': String(apt._id) });
      expect(cancelled, 'patient should get a cancellation notification').toBeTruthy();

      const apt2 = await bookFresh('patient', 58, 4);
      const later = new Date(Date.now() + 61 * 86400000);
      later.setUTCHours(5, 0, 0, 0);
      await authed('post', `/api/v1/appointments/${apt2._id}/reschedule`, 'doctor').send({ newScheduledDateTime: later.toISOString(), reason: 'Clinic moved' });
      const moved = await Notification.findOne({ userId, type: 'appointment_updated' });
      expect(moved, 'patient should get a reschedule notification').toBeTruthy();
    });

    it('lets a patient reschedule their own appointment', async () => {
      const apt = await bookFresh('patient', 55, 4);
      const later = new Date(Date.now() + 58 * 86400000);
      later.setUTCHours(5, 0, 0, 0);
      const res = await authed('post', `/api/v1/appointments/${apt._id}/reschedule`, 'patient').send({
        newScheduledDateTime: later.toISOString(),
        reason: 'Travelling that week',
      });
      expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
      expect(new Date(res.body.data.scheduledDateTime || res.body.data.appointmentDate).toISOString()).toBe(later.toISOString());
    });

    it('rejects a reschedule with no new time', async () => {
      const apt = await bookFresh('patient', 56, 4);
      const res = await authed('post', `/api/v1/appointments/${apt._id}/reschedule`, 'patient').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('access control', () => {
    it('refuses requests without a token', async () => {
      expect((await request(app).get('/api/v1/patients/profile')).status).toBe(401);
      expect((await request(app).post('/api/v1/auth/change-password').send({})).status).toBe(401);
    });
  });
});
