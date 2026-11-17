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
  const REJECTED = { email: 'rejected.doctor.signup@example.test', password: 'Rejected@123' };
  const DIRECT = { email: 'direct.doctor.signup@example.test', password: 'Direct@123' };
  const LATE = { email: 'late.doctor.signup@example.test', password: 'LateDoctor@123' };
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
    await User.deleteOne({ email: LATE.email });
    await User.create({
      email: LATE.email,
      passwordHash: LATE.password,
      role: 'DOCTOR',
      verificationStatus: 'pending',
      profile: { firstName: 'Savi', lastName: 'Forgetful' },
    });
    for (const person of [REJECTED, DIRECT]) {
      await User.deleteOne({ email: person.email });
      await User.create({
        email: person.email,
        passwordHash: person.password,
        role: 'DOCTOR',
        verificationStatus: 'pending',
        profile: { firstName: person === REJECTED ? 'Rita' : 'Dev', lastName: 'Tester' },
      });
    }
    const [auth, registration, staffRoutes, patientRoutes, encounterRoutes, errors] = await Promise.all([
      import('../routes/authRoutes.js'),
      import('../routes/staffRegistrationRoutes.js'),
      import('../routes/staffRoutes.js'),
      import('../routes/patientRoutes.js'),
      import('../routes/encounterRoutes.js'),
      import('../middleware/errorHandler.js'),
    ]);
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', auth.default);
    app.use('/api/v1/staff-registration', registration.default);
    app.use('/api/v1/staff', staffRoutes.default);
    app.use('/api/v1/patients', patientRoutes.default);
    app.use('/api/v1/encounters', encounterRoutes.default);
    app.use(errors.errorHandler);
    tokens.admin = await login(ADMIN);
    tokens.newbie = await login(NEWBIE);
    tokens.late = await login(LATE);
    tokens.rejected = await login(REJECTED);
    tokens.direct = await login(DIRECT);
    tokens.doctor = await login({ email: 'soundarya.shetty@sanjivani.in', password: 'SoundaryaShetty@123' });
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
    for (const email of [LATE.email, REJECTED.email, DIRECT.email]) {
      const extra = await User.findOne({ email });
      if (extra) {
        const pro = await HealthcareProfessional.findOne({ userId: extra._id });
        if (pro) await ProfessionalCredential.deleteMany({ professionalId: pro._id });
        await Promise.all([
          HealthcareProfessional.deleteMany({ userId: extra._id }),
          HospitalStaff.deleteMany({ userId: extra._id }),
          StaffRegistrationRequest.deleteMany({ userId: extra._id }),
          Notification.deleteMany({ userId: extra._id }),
          User.deleteOne({ _id: extra._id }),
        ]);
      }
    }
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

  it('the admin sees unverified sign-ups, marking who has already asked to join', async () => {
    const res = await as('get', '/api/v1/staff/unverified-users', 'admin');
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
    const byEmail = Object.fromEntries(res.body.data.map((u) => [u.email, u]));
    expect(byEmail[NEWBIE.email].requested).toBe(true);
    expect(byEmail[LATE.email].requested).toBe(false);
    expect(byEmail[LATE.email].name).toBe('Savi Forgetful');
    // People who are already verified staff are not offered.
    expect(byEmail['soundarya.shetty@sanjivani.in']).toBeUndefined();
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

  it('the admin can list the hospital\'s staff, with names', async () => {
    const res = await as('get', `/api/v1/staff/facility/${hospital._id}`, 'admin');
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
    const names = res.body.data.map((s) => s.userName);
    expect(names).toContain('Soundarya Shetty');
    expect(names).toContain('Nina Newcomer');
  });

  it('a doctor who never asked can be invited by the admin, and is then verified staff', async () => {
    const { default: User } = await import('../models/User.js');
    const late = await User.findOne({ email: LATE.email });
    const res = await as('post', '/api/v1/staff/invite', 'admin').send({
      userId: String(late._id),
      hospitalId: String(hospital._id),
      role: 'doctor',
      employmentStatus: 'active',
      startDate: new Date().toISOString().split('T')[0],
    });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(201);
    expect(res.body.data.associationStatus).toBe('active');

    const me = await as('get', '/api/v1/auth/current-user', 'late');
    expect(me.body.user.verificationStatus).toBe('verified');

    const list = await as('get', '/api/v1/staff/unverified-users', 'admin');
    expect(list.body.data.map((u) => u.email)).not.toContain(LATE.email);

    const again = await as('post', '/api/v1/staff/invite', 'admin').send({
      userId: String(late._id),
      hospitalId: String(hospital._id),
      role: 'doctor',
      employmentStatus: 'active',
      startDate: new Date().toISOString().split('T')[0],
    });
    expect(again.status).toBe(409);
  });

  it('the admin can reject a request, with a reason, and it leaves Pending', async () => {
    const asked = await as('post', '/api/v1/staff-registration/request', 'rejected').send({ hospitalId: String(hospital._id) });
    expect(asked.status).toBe(201);
    const res = await as('post', `/api/v1/staff-registration/${asked.body.data._id}/reject`, 'admin').send({
      rejectionReason: 'Licence could not be checked',
    });
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);

    const list = await as('get', `/api/v1/staff-registration/hospital/${hospital._id}/pending?status=pending`, 'admin');
    expect(list.body.requests.map((r) => r.email)).not.toContain(REJECTED.email);
    const me = await as('get', '/api/v1/auth/current-user', 'rejected');
    expect(me.body.user.verificationStatus).not.toBe('verified');
  });

  it('someone who is added directly never lingers under Pending, even if they had asked first', async () => {
    const asked = await as('post', '/api/v1/staff-registration/request', 'direct').send({ hospitalId: String(hospital._id) });
    expect(asked.status).toBe(201);
    const { default: HospitalStaff } = await import('../models/HospitalStaff.js');
    const { default: User } = await import('../models/User.js');
    const direct = await User.findOne({ email: DIRECT.email });
    // Added without going through the invite route, as older data was.
    await HospitalStaff.create({
      userId: direct._id, hospitalId: hospital._id, role: 'doctor', associationStatus: 'active',
      employmentStatus: 'active', startDate: new Date(),
    });
    const list = await as('get', `/api/v1/staff-registration/hospital/${hospital._id}/pending?status=pending`, 'admin');
    expect(list.body.requests.map((r) => r.email)).not.toContain(DIRECT.email);
    const all = await as('get', `/api/v1/staff-registration/hospital/${hospital._id}/pending?status=all`, 'admin');
    expect(all.body.requests.find((r) => r.email === DIRECT.email).status).toBe('approved');
  });

  it('the staff list leaves out records whose account no longer exists', async () => {
    const { default: HospitalStaff } = await import('../models/HospitalStaff.js');
    const ghost = await HospitalStaff.create({
      userId: new mongoose.Types.ObjectId(), hospitalId: hospital._id, role: 'doctor',
      associationStatus: 'active', employmentStatus: 'active', startDate: new Date(),
    });
    const res = await as('get', `/api/v1/staff/facility/${hospital._id}`, 'admin');
    expect(res.body.data.map((m) => String(m.staffId))).not.toContain(String(ghost._id));
    expect(res.body.data.every((m) => m.userName || m.userEmail)).toBe(true);
    await HospitalStaff.deleteOne({ _id: ghost._id });
  });

  it('records for deleted accounts are removed from the database, and real staff are kept', async () => {
    const { default: HospitalStaff } = await import('../models/HospitalStaff.js');
    const { default: StaffRegistrationRequest } = await import('../models/StaffRegistrationRequest.js');
    const { removeOrphanedStaffRecords } = await import('../utils/orphanStaffCleanup.js');
    const ghostUser = new mongoose.Types.ObjectId();
    await HospitalStaff.create({
      userId: ghostUser, hospitalId: hospital._id, role: 'doctor', associationStatus: 'active',
      employmentStatus: 'active', startDate: new Date(),
    });
    await StaffRegistrationRequest.collection.insertOne({
      userId: ghostUser, hospitalId: hospital._id, status: 'pending', requestedRole: 'doctor',
      email: 'gone@example.test', firstName: 'Gone', lastName: 'Away', submittedAt: new Date(),
    });
    const before = await HospitalStaff.countDocuments({ hospitalId: hospital._id });

    const removed = await removeOrphanedStaffRecords();

    expect(removed.staff).toBeGreaterThanOrEqual(1);
    expect(removed.requests).toBeGreaterThanOrEqual(1);
    expect(await HospitalStaff.countDocuments({ userId: ghostUser })).toBe(0);
    expect(await StaffRegistrationRequest.countDocuments({ userId: ghostUser })).toBe(0);
    expect(await HospitalStaff.countDocuments({ hospitalId: hospital._id })).toBe(before - removed.staff);
    // The demo doctors and the admin are untouched.
    const { default: User } = await import('../models/User.js');
    const soundarya = await User.findOne({ email: 'soundarya.shetty@sanjivani.in' });
    expect(await HospitalStaff.countDocuments({ userId: soundarya._id, associationStatus: 'active' })).toBeGreaterThanOrEqual(1);
    // Running it again finds nothing more.
    expect(await removeOrphanedStaffRecords()).toEqual({ staff: 0, requests: 0 });
  });

  it('the admin gets a read-only patient list for their hospital; a doctor does not', async () => {
    const res = await as('get', '/api/v1/patients/facility-list', 'admin');
    expect(res.status, JSON.stringify(res.body).slice(0, 300)).toBe(200);
    expect(res.body.data.length).toBeGreaterThanOrEqual(10);
    expect(res.body.data[0].personalIdentity.firstName).toBeTruthy();
    const denied = await as('get', '/api/v1/patients/facility-list', 'doctor');
    expect(denied.status).toBe(403);
  });

  it('an admin cannot start an encounter', async () => {
    const mine = await as('get', '/api/v1/patients/facility-list', 'admin');
    const res = await as('post', '/api/v1/encounters', 'admin').send({
      patientId: mine.body.data[0]._id, facilityId: String(hospital._id), encounterType: 'consultation',
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it('asking again after approval is refused politely, not with a crash', async () => {
    const res = await as('post', '/api/v1/staff-registration/request', 'newbie').send({ hospitalId: String(hospital._id) });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(res.status).toBeLessThan(500);
  });
});
