/**
 * Every user has exactly one JeevaCare ID, and a patient's account shares the ID shown on their dashboard.
 * Uses the guarded test database (TEST_MONGODB_URI -> jeevacare-test), like the other database tests.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../config/testDatabase.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { ensureJeevaIds } from '../utils/jeevaIdBackfill.js';
import { validateJeevaIdFormat } from '../utils/jeevaIdGenerator.js';

const HASH = 'x'.repeat(60);
let counter = 0;

// Insert documents the way old data looks: straight into the collection, so no model hooks run.
async function legacyUser(role = 'PATIENT', jeevaId) {
  counter += 1;
  const doc = {
    email: `legacy${counter}@example.com`,
    passwordHash: HASH,
    role,
    status: 'active',
    verificationStatus: 'verified',
    profile: { firstName: 'Legacy', lastName: `User${counter}` },
    ...(jeevaId && { jeevaId }),
  };
  const { insertedId } = await User.collection.insertOne(doc);
  return insertedId;
}

async function legacyPatient(userId, jeevaId) {
  const { insertedId } = await Patient.collection.insertOne({
    userId,
    personalIdentity: { firstName: 'Legacy', lastName: 'Patient', dateOfBirth: new Date('1990-01-01'), sex: 'F' },
    status: 'active',
    ...(jeevaId && { jeevaId }),
  });
  return insertedId;
}

const idOfUser = async (id) => (await User.collection.findOne({ _id: id })).jeevaId;
const idOfPatient = async (id) => (await Patient.collection.findOne({ _id: id })).jeevaId;

describe('JeevaCare ID for every user', () => {
  beforeAll(async () => {
    await connectTestDatabase();
  }, 60000);
  afterAll(async () => {
    await disconnectTestDatabase();
  });
  beforeEach(async () => {
    await clearTestDatabase();
  });

  describe('ensureJeevaIds (existing data)', () => {
    it('gives every user of every role a valid, unique ID', async () => {
      const roles = ['PATIENT', 'DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN', 'NURSE', 'LAB_TECHNICIAN', 'PARAMEDIC', 'OTHER_STAFF'];
      const ids = [];
      for (const role of roles) ids.push(await legacyUser(role));
      const result = await ensureJeevaIds();
      expect(result.usersUpdated).toBe(roles.length);
      const assigned = [];
      for (const id of ids) assigned.push(await idOfUser(id));
      assigned.forEach((a) => expect(validateJeevaIdFormat(a)).toBe(true));
      expect(new Set(assigned).size).toBe(roles.length);
    });

    it("makes a patient's account use the ID their dashboard already shows", async () => {
      const userId = await legacyUser('PATIENT');
      await legacyPatient(userId, 'JJ26-GJGVF');
      await ensureJeevaIds();
      expect(await idOfUser(userId)).toBe('JJ26-GJGVF');
    });

    it('gives a patient the ID their account already has', async () => {
      const userId = await legacyUser('PATIENT', 'JJ26-CCCCC');
      const patientId = await legacyPatient(userId);
      await ensureJeevaIds();
      expect(await idOfPatient(patientId)).toBe('JJ26-CCCCC');
    });

    it('settles on the dashboard ID when account and patient disagree', async () => {
      const userId = await legacyUser('PATIENT', 'JJ26-AAAAA');
      const patientId = await legacyPatient(userId, 'JJ26-BBBBB');
      await ensureJeevaIds();
      expect(await idOfUser(userId)).toBe('JJ26-BBBBB');
      expect(await idOfPatient(patientId)).toBe('JJ26-BBBBB');
    });

    it('creates one new ID for both when neither has one', async () => {
      const userId = await legacyUser('PATIENT');
      const patientId = await legacyPatient(userId);
      await ensureJeevaIds();
      const a = await idOfUser(userId);
      expect(validateJeevaIdFormat(a)).toBe(true);
      expect(await idOfPatient(patientId)).toBe(a);
    });

    it('is safe to run again: nothing changes the second time', async () => {
      const userId = await legacyUser('PATIENT');
      await legacyPatient(userId);
      await legacyUser('DOCTOR');
      await ensureJeevaIds();
      const before = await idOfUser(userId);
      const again = await ensureJeevaIds();
      expect(again).toEqual({ usersUpdated: 0, patientsUpdated: 0 });
      expect(await idOfUser(userId)).toBe(before);
    });

    it('never gives two people the same ID', async () => {
      const ids = [];
      for (let i = 0; i < 40; i++) ids.push(await legacyUser(i % 2 ? 'DOCTOR' : 'PATIENT'));
      await ensureJeevaIds();
      const all = [];
      for (const id of ids) all.push(await idOfUser(id));
      expect(new Set(all).size).toBe(40);
    });
  });

  describe('new users', () => {
    it('gets an ID the moment any user is saved, whatever the role', async () => {
      for (const role of ['DOCTOR', 'HOSPITAL_ADMIN', 'PARAMEDIC', 'OTHER_STAFF', 'SYSTEM_ADMIN']) {
        const user = new User({ email: `new-${role.toLowerCase()}@example.com`, passwordHash: HASH, role, profile: { firstName: 'N', lastName: role } });
        await user.save();
        expect(validateJeevaIdFormat(user.jeevaId)).toBe(true);
      }
    });

    it("keeps an ID that was set on purpose", async () => {
      const user = new User({ email: 'fixed@example.com', passwordHash: HASH, role: 'DOCTOR', jeevaId: 'JJ26-FIXED', profile: { firstName: 'F', lastName: 'X' } });
      await user.save();
      expect(user.jeevaId).toBe('JJ26-FIXED');
    });

    it("gives a new patient record the same ID as their account", async () => {
      const user = new User({ email: 'pat@example.com', passwordHash: HASH, role: 'PATIENT', profile: { firstName: 'P', lastName: 'T' } });
      await user.save();
      const patient = new Patient({
        userId: user._id,
        personalIdentity: { firstName: 'P', lastName: 'T', dateOfBirth: new Date('1990-01-01'), sex: 'F' },
      });
      await patient.save();
      expect(patient.jeevaId).toBe(user.jeevaId);
    });

    it('gives a patient record created for an account with no ID one shared ID', async () => {
      const userId = await legacyUser('PATIENT');
      const patient = new Patient({
        userId,
        personalIdentity: { firstName: 'L', lastName: 'P', dateOfBirth: new Date('1990-01-01'), sex: 'F' },
      });
      await patient.save();
      expect(validateJeevaIdFormat(patient.jeevaId)).toBe(true);
      expect(await idOfUser(userId)).toBe(patient.jeevaId);
    });
  });
});
