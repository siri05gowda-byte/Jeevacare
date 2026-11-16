/**
 * What a doctor does with the patients assigned to them, against a throwaway local database:
 * see them, start an encounter, upload a document, and the patient sees that document.
 *
 *   FLOW_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/jeevacare-test npx vitest run src/__tests__/doctor-patient.flow.test.js
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
vi.mock('../services/GoogleSheetsService.js', () => ({
  default: new Proxy({}, { get: () => async () => ({}) }),
}));

const describeFlows = FLOW_URI ? describe : describe.skip;

describeFlows('doctor and assigned patients (local database)', () => {
  let app;
  let assigned;
  let patientUser;
  let encounter;
  let facilityId;
  const DOCTOR = { email: 'soundarya.shetty@sanjivani.in', password: 'SoundaryaShetty@123' };
  const tokens = {};

  const login = async ({ email, password }) => {
    const res = await request(app).post('/api/v1/auth/login').send({ username: email, password });
    expect(res.status).toBe(200);
    return res.body.tokens.token;
  };
  const as = (method, url, who) => request(app)[method](url).set('Authorization', `Bearer ${tokens[who]}`);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    await mongoose.connect(FLOW_URI);
    const { bootstrapDemoHospitalsAndAccounts } = await import('../utils/bootstrapDemoData.js');
    await bootstrapDemoHospitalsAndAccounts();
    const { ensureJeevaIds } = await import('../utils/jeevaIdBackfill.js');
    await ensureJeevaIds();
    const { linkDemoDataOnStartup } = await import('../utils/demoLinkStartup.js');
    await linkDemoDataOnStartup({ env: {}, logger: { info: () => {}, warn: () => {} } });

    const [auth, patients, documents, encounters, records, errors] = await Promise.all([
      import('../routes/authRoutes.js'),
      import('../routes/patientRoutes.js'),
      import('../routes/documentRoutes.js'),
      import('../routes/encounterRoutes.js'),
      import('../routes/clinicalRecordRoutes.js'),
      import('../middleware/errorHandler.js'),
    ]);
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', auth.default);
    app.use('/api/v1/patients', patients.default);
    app.use('/api/v1/documents', documents.default);
    app.use('/api/v1/encounters', encounters.default);
    app.use('/api/v1/records', records.default);
    app.use(errors.errorHandler);

    tokens.doctor = await login(DOCTOR);
    const mine = await as('get', '/api/v1/patients/assigned-to/me', 'doctor');
    assigned = mine.body.data;
    const { default: Patient } = await import('../models/Patient.js');
    const { default: User } = await import('../models/User.js');
    const patientDoc = await Patient.findById(assigned[0]._id);
    patientUser = await User.findById(patientDoc.userId);
    tokens.patient = await login({ email: patientUser.email, password: 'Patient@123' });
  }, 60000);

  afterAll(async () => {
    await mongoose.disconnect();
  });

  it('the doctor has assigned patients, with names and JeevaCare IDs', () => {
    expect(assigned.length).toBeGreaterThanOrEqual(1);
    expect(assigned[0].personalIdentity.firstName).toBeTruthy();
    expect(assigned[0].jeevaId).toMatch(/^JJ\d{2}-/);
  });

  it('can start a walk-in encounter for an assigned patient, without an appointment', async () => {
    facilityId = assigned[0].assignedDoctors.find((a) => a.status === 'active').facilityId._id;
    const me = await as('get', '/api/v1/auth/current-user', 'doctor');
    const res = await as('post', '/api/v1/encounters', 'doctor').send({
      patientId: assigned[0]._id,
      doctorId: me.body.user._id,
      facilityId,
      encounterType: 'consultation',
      notes: 'Walk-in visit',
    });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    expect(String(res.body.data.patientId)).toBe(String(assigned[0]._id));
    expect(res.body.data.appointmentId).toBeUndefined();
    encounter = res.body.data;
  });

  it('can save a clinical note for that encounter', async () => {
    const me = await as('get', '/api/v1/auth/current-user', 'doctor');
    const res = await as('post', '/api/v1/records', 'doctor').send({
      patientId: assigned[0]._id,
      encounterId: encounter._id,
      facilityId,
      providerId: me.body.user._id,
      recordType: 'clinical_note',
      data: { diagnosis: 'Seasonal flu', symptoms: 'Fever', medications: ['Paracetamol'] },
      provider_verified: true,
    });
    expect(res.status, JSON.stringify(res.body).slice(0, 400)).toBeLessThan(300);
  });

  it('a document the doctor uploads shows up in that patient\'s own documents', async () => {
    const up = await as('post', '/api/v1/documents/upload', 'doctor')
      .field('patientId', String(assigned[0]._id))
      .field('documentType', 'prescription')
      .field('title', 'Doctor test prescription')
      .attach('file', Buffer.from('%PDF-1.4 rx'), { filename: 'rx.pdf', contentType: 'application/pdf' });
    expect(up.status, JSON.stringify(up.body).slice(0, 300)).toBe(200);

    const list = await as('get', `/api/v1/documents/patient/${assigned[0]._id}`, 'patient');
    expect(list.status, JSON.stringify(list.body).slice(0, 300)).toBe(200);
    const found = list.body.documents.find((d) => String(d._id) === String(up.body.document._id));
    expect(found).toBeTruthy();
    expect(found.verificationStatus).toBe('provider_verified');
  });

  it('the doctor can open the patient record: profile, documents and clinical notes', async () => {
    const profile = await as('get', `/api/v1/patients/${assigned[0]._id}`, 'doctor');
    expect(profile.status, JSON.stringify(profile.body).slice(0, 200)).toBe(200);
    const docs = await as('get', `/api/v1/documents/patient/${assigned[0]._id}`, 'doctor');
    expect(docs.status, JSON.stringify(docs.body).slice(0, 200)).toBe(200);
    expect(docs.body.documents.length).toBeGreaterThanOrEqual(1);
    const notes = await as('get', `/api/v1/records/patient/${assigned[0]._id}`, 'doctor');
    expect(notes.status, JSON.stringify(notes.body).slice(0, 300)).toBe(200);
    expect(notes.body.data.length).toBeGreaterThanOrEqual(1);
  });

  it('refuses an encounter for a facility the doctor does not work at', async () => {
    const { default: Hospital } = await import('../models/Hospital.js');
    const other = await Hospital.findOne({ name: 'Aarogya Kendra' });
    const res = await as('post', '/api/v1/encounters', 'doctor').send({
      patientId: assigned[0]._id,
      doctorId: 'x',
      facilityId: String(other._id),
      encounterType: 'consultation',
    });
    expect(res.status).toBe(403);
  });
});
