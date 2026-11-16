/**
 * The new-staff workflow, end to end against a throwaway local database:
 * a new doctor signs up, asks to join a hospital, that hospital's admin approves,
 * and the doctor ends up verified with an active staff record and a JeevaCare ID.
 *
 *   FLOW_TEST_MONGODB_URI=mongodb://127.0.0.1:27017/jeevacare-test npx vitest run src/__tests__/staff-registration.flow.test.js
 */
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';

const FLOW_URI = process.env.FLOW_TEST_MONGODB_URI;

vi.mock('../services/GoogleSheetsService.js', () => ({
  default: new Proxy({}, { get: () => async () => ({}) }),
}));

const describeFlows = FLOW_URI ? describe : describe.skip;

describeFlows('new staff registration and approval (local database)', () => {
  let app;
  let hospital;
  const ADMIN = { email: 'prakash.rao@sanjivani.in', password: 'PrakashRao@123' };
  const NEWBIE = { email: 'new.doctor.signup@example.test', password: 'NewDoctor@123' };
  const tokens = {};
  let requestId;

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
    const { default: User } = await import('../models/User.js');
    const { default: Hospital } = await import('../models/Hospital.js');
    hospital = await Hospital.findOne({ name: 'Sanjivani Hospital' });
    await User.deleteOne({ email: NEWBIE.email });
    await User.create({
      email: NEWBIE.email,
      passwordHash: NEWBIE.password,
      role: 'DOCTOR',
      verificationStatus: 'pending',
      profile: { firstName: 'Nina', lastName: 'Newcomer' },
    });
    const [auth, registration, errors] = await Promise.all([
      import('../routes/authRoutes.js'),
      import('../routes/staffRegistrationRoutes.js'),
      import('../middleware/errorHandler.js'),
    ]);
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', auth.default);
    app.use('/api/v1/staff-registration', registration.default);
    app.use(errors.errorHandler);
    tokens.admin = await login(ADMIN);
    tokens.newbie = await login(NEWBIE);
  }, 60000);

  afterAll(async () => {
    // Remove what this test created so other tests on the same database see only the demo seed.
    const [{ default: User }, { default: HospitalStaff }, { default: HealthcareProfessional }, { default: ProfessionalCredential }, { default: StaffRegistrationRequest }, { default: Notification }] =
      await Promise.all([
        import('../models/User.js'),
        import('../models/HospitalStaff.js'),
        import('../models/HealthcareProfessional.js'),
        import('../models/ProfessionalCredential.js'),
        import('../models/StaffRegistrationRequest.js'),
        import('../models/Notification.js'),
      ]);
    const user = await User.findOne({ email: NEWBIE.email });
    if (user) {
      const professional = await HealthcareProfessional.findOne({ userId: user._id });
      if (professional) await ProfessionalCredential.deleteMany({ professionalId: professional._id });
      await Promise.all([
        HealthcareProfessional.deleteMany({ userId: user._id }),
        HospitalStaff.deleteMany({ userId: user._id }),
        StaffRegistrationRequest.deleteMany({ userId: user._id }),
        Notification.deleteMany({ userId: user._id }),
        Notification.deleteMany({ title: /Nina Newcomer/ }),
        User.deleteOne({ _id: user._id }),
      ]);
    }
    await mongoose.disconnect();
  });

  it('starts unverified, with a JeevaCare ID from sign-up', async () => {
    const res = await as('get', '/api/v1/auth/current-user', 'newbie');
    expect(res.body.user.verificationStatus).toBe('pending');
    expect(res.body.user.jeevaId).toMatch(/^JJ\d{2}-/);
  });

  it('the new doctor asks to join a hospital', async () => {
    const res = await as('post', '/api/v1/staff-registration/request', 'newbie').send({
      hospitalId: String(hospital._id),
      specialization: ['Cardiology'],
      licenseNumber: `KA-TEST-${Date.now()}`,
    });
    expect(res.status).toBe(201);
    requestId = res.body.data._id;
  });

  it('the hospital admin is told about it and sees it as pending', async () => {
    const { default: Notification } = await import('../models/Notification.js');
    const { default: User } = await import('../models/User.js');
    const admin = await User.findOne({ email: ADMIN.email });
    const note = await Notification.findOne({ userId: admin._id, title: /Nina Newcomer/ });
    expect(note).toBeTruthy();

    const res = await as('get', `/api/v1/staff-registration/hospital/${hospital._id}/pending?status=all`, 'admin');
    expect(res.status).toBe(200);
    expect(res.body.requests.some((r) => String(r._id) === String(requestId) && r.status === 'pending')).toBe(true);
  });

  it('approval makes them verified, active staff', async () => {
    const res = await as('post', `/api/v1/staff-registration/${requestId}/approve`, 'admin').send({});
    expect(res.status).toBe(200);

    const me = await as('get', '/api/v1/auth/current-user', 'newbie');
    expect(me.body.user.verificationStatus).toBe('verified');
    expect(me.body.user.jeevaId).toMatch(/^JJ\d{2}-/);

    const { default: HospitalStaff } = await import('../models/HospitalStaff.js');
    const staff = await HospitalStaff.findOne({ userId: me.body.user._id, hospitalId: hospital._id });
    expect(staff.associationStatus).toBe('active');
    expect(staff.role).toBe('doctor');

    const { default: Notification } = await import('../models/Notification.js');
    expect(await Notification.findOne({ userId: me.body.user._id, type: 'staff_approval' })).toBeTruthy();
  });

  it('an approved doctor passes the clinical access check at that hospital', async () => {
    const [{ default: Patient }, { default: ClinicalAuth }, { default: User }] = await Promise.all([
      import('../models/Patient.js'),
      import('../utils/clinicalAuthorizationBoundary.js'),
      import('../models/User.js'),
    ]);
    const user = await User.findOne({ email: NEWBIE.email });
    const patient = await Patient.findOne({ 'facilities.facilityId': hospital._id });
    const result = await ClinicalAuth.canCreateOfficialClinicalRecord(user._id, hospital._id, patient._id);
    expect(result.error).toBeFalsy();
    expect(result.authorized).toBe(true);
  });

  it('asking again after approval is refused politely, not with a crash', async () => {
    const res = await as('post', '/api/v1/staff-registration/request', 'newbie').send({ hospitalId: String(hospital._id) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
