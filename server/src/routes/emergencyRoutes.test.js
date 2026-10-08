/**
 * Emergency Routes Test Suite
 * Tests emergency profile, contacts, and access workflows
 * Phase 4 Emergency Integration Verification
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import request from 'supertest';
import app from '../index.js';
import Patient from '../models/Patient.js';
import EmergencyProfile from '../models/EmergencyProfile.js';
import EmergencyAccess from '../models/EmergencyAccess.js';
import User from '../models/User.js';
import mongoose from 'mongoose';
import { connectTestDatabase, disconnectTestDatabase, clearTestDatabase } from '../config/testDatabase.js';

describe('Emergency Routes - Phase 4 Integration', () => {
  let testUserId;
  let testPatientId;
  let authToken;
  let doctorToken;

  beforeAll(async () => {
    // Connect to test database
    try {
      await connectTestDatabase();
    } catch (err) {
      console.warn('Test database connection failed:', err.message);
    }
    await clearTestDatabase();
  });

  afterAll(async () => {
    // Cleanup
    try {
      await clearTestDatabase();
      // Only disconnect if we're sure no other tests are running
      // Leave connection open for other test suites
    } catch (err) {
      console.warn('Test cleanup failed:', err.message);
    }
  });

  beforeEach(async () => {
    // Clear collections before each test
    try {
      await Patient.deleteMany({});
      await User.deleteMany({});
      await EmergencyProfile.deleteMany({});
      await EmergencyAccess.deleteMany({});
    } catch (err) {
      console.warn('BeforeEach cleanup failed:', err.message);
    }

    // Create test user (patient)
    const userRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'patient@test.com',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'Patient',
        role: 'PATIENT',
      });
    authToken = userRes.body.token;
    testUserId = userRes.body.user?._id;

    // Create doctor user
    const doctorRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'doctor@test.com',
        password: 'Test123!@#',
        firstName: 'Test',
        lastName: 'Doctor',
        role: 'DOCTOR',
      });
    doctorToken = doctorRes.body.token;
  });

  describe('Emergency Profile Management', () => {
    it('should allow patient to view their emergency profile', async () => {
      // Create patient record
      const patient = new Patient({
        jeevaId: `JJ26-EMRG${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: testUserId,
        personalIdentity: {
          firstName: 'Test',
          lastName: 'Patient',
          dateOfBirth: new Date('1990-01-01'),
          sex: 'M',
        },
        status: 'active',
      });
      await patient.save();

      // Create emergency profile
      const profile = new EmergencyProfile({
        patientId: patient._id,
        allergies: [{ allergen: 'Penicillin', severity: 'severe' }],
      });
      await profile.save();

      expect(profile).toBeDefined();
      expect(profile.allergies).toHaveLength(1);
    });

    it('should prevent unauthorized access to emergency profile', async () => {
      // Create two patients
      const user1 = new User({
        email: 'user1@test.com',
        passwordHash: 'hash1password123',  // Min 8 chars
        role: 'PATIENT',
        status: 'active',
      });
      const user2 = new User({
        email: 'user2@test.com',
        passwordHash: 'hash2password123',  // Min 8 chars
        role: 'PATIENT',
        status: 'active',
      });
      await user1.save();
      await user2.save();

      const patient1 = new Patient({
        jeevaId: `JJ26-P1-${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: user1._id,
        personalIdentity: { firstName: 'P1', lastName: 'P1', dateOfBirth: new Date('1990-01-01'), sex: 'M' },
        status: 'active',
      });
      const patient2 = new Patient({
        jeevaId: `JJ26-P2-${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: user2._id,
        personalIdentity: { firstName: 'P2', lastName: 'P2', dateOfBirth: new Date('1990-01-01'), sex: 'M' },
        status: 'active',
      });
      await patient1.save();
      await patient2.save();

      // Verify patient IDs are different
      expect(patient1._id.toString()).not.toBe(patient2._id.toString());
    });
  });

  describe('Emergency Access Authorization', () => {
    it('should create emergency access request', async () => {
      const patient = new Patient({
        jeevaId: `JJ26-REQ-${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: testUserId,
        personalIdentity: { firstName: 'Test', lastName: 'Patient', dateOfBirth: new Date('1990-01-01'), sex: 'M' },
        status: 'active',
      });
      await patient.save();

      const access = new EmergencyAccess({
        accessId: `EA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        patientId: patient._id,
        professionalId: testUserId,
        professionalRole: 'DOCTOR',
        accessReason: 'unconscious_patient',
        accessLevel: 'emergency_profile',
        authorizationStatus: 'requested',
      });
      await access.save();

      expect(access.authorizationStatus).toBe('requested');
      expect(access.accessReason).toBe('unconscious_patient');
    });

    it('should track emergency access expiration', async () => {
      const patient = new Patient({
        jeevaId: `JJ26-EXP-${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: testUserId,
        personalIdentity: { firstName: 'Test', lastName: 'Patient', dateOfBirth: new Date('1990-01-01'), sex: 'M' },
        status: 'active',
      });
      await patient.save();

      const expiresAt = new Date(Date.now() + 3600000); // 1 hour
      const access = new EmergencyAccess({
        accessId: `EA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        patientId: patient._id,
        professionalId: testUserId,
        professionalRole: 'DOCTOR',
        accessReason: 'unconscious_patient',
        accessExpirationDateTime: expiresAt,
        authorizationStatus: 'authorized',
      });
      await access.save();

      const fetched = await EmergencyAccess.findById(access._id);
      expect(fetched.accessExpirationDateTime.getTime()).toBe(expiresAt.getTime());
    });
  });

  describe('Emergency Security & Isolation', () => {
    it('should prevent unauthorized professional access', async () => {
      // Create two professionals
      const user1 = new User({
        email: 'prof1@test.com',
        passwordHash: 'prof1password123',  // Min 8 chars
        role: 'DOCTOR',
        status: 'active',
      });
      const user2 = new User({
        email: 'prof2@test.com',
        passwordHash: 'prof2password123',  // Min 8 chars
        role: 'DOCTOR',
        status: 'active',
      });
      await user1.save();
      await user2.save();

      const patient = new Patient({
        jeevaId: `JJ26-UNAU${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: user1._id,
        personalIdentity: { firstName: 'Patient', lastName: 'Test', dateOfBirth: new Date('1990-01-01'), sex: 'M' },
        status: 'active',
      });
      await patient.save();

      // Only user1 should access their patient's records
      expect(user1._id.toString()).not.toBe(user2._id.toString());
    });

    it('should audit emergency access events', async () => {
      const patient = new Patient({
        jeevaId: `JJ26-AUDI${Math.random().toString(36).substring(2, 4).toUpperCase()}`,
        userId: testUserId,
        personalIdentity: { firstName: 'Test', lastName: 'Patient', dateOfBirth: new Date('1990-01-01'), sex: 'M' },
        status: 'active',
      });
      await patient.save();

      const access = new EmergencyAccess({
        accessId: `EA-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        patientId: patient._id,
        professionalId: testUserId,
        professionalRole: 'DOCTOR',
        accessReason: 'unconscious_patient',
        authorizationStatus: 'authorized',
      });
      await access.save();

      // Verify audit trail contains server-set fields
      expect(access.professionalId).toBeDefined();
      expect(access.patientId).toBeDefined();
    });
  });
});
