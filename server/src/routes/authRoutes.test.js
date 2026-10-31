import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

// Mock mongoose models at module level BEFORE importing the route,
// so mongoose never attempts to buffer queries against a real connection.
vi.mock('../models/User.js', () => {
  const createMockUser = (data = {}) => ({
    _id: '507f1f77bcf86cd799439099',
    email: data.email || 'test@jeevacare.com',
    role: data.role || 'PATIENT',
    jeevaId: 'JJ25-TEST01',
    profile: data.profile || {},
    status: 'active',
    verificationStatus: (data.role === 'PATIENT' || data.role === 'GUARDIAN') ? 'verified' : 'pending',
    save: vi.fn().mockResolvedValue(true),
    toJSON: vi.fn().mockReturnValue({
      _id: '507f1f77bcf86cd799439099',
      email: data.email || 'test@jeevacare.com',
      role: data.role || 'PATIENT',
      jeevaId: 'JJ25-TEST01',
    }),
    ...data,
  });
  const MockUser = vi.fn((data) => createMockUser(data));
  MockUser.findOne = vi.fn().mockResolvedValue(null);
  return { default: MockUser };
});

vi.mock('../models/Patient.js', () => {
  const mockPatientInstance = { _id: 'patient123', save: vi.fn().mockResolvedValue(true) };
  const MockPatient = vi.fn(() => mockPatientInstance);
  return { default: MockPatient };
});

vi.mock('../services/AuditService.js', () => ({
  default: {
    logAuthenticationEvent: vi.fn().mockResolvedValue(true),
    logEvent: vi.fn().mockResolvedValue(true),
  },
}));

vi.mock('../services/GoogleSheetsService.js', () => ({
  default: {
    recordUser: vi.fn().mockResolvedValue(true),
    isConfigured: false,
  },
}));

vi.mock('../utils/jeevaIdGenerator.js', () => ({
  generateJeevaId: vi.fn().mockResolvedValue('JJ25-TEST01'),
}));

import authRoutes from './authRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import AuditService from '../services/AuditService.js';

describe('Auth Registration & Role Security Route Tests', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('Task 3 — Enforce Safe Role Registration & Privilege Escalation Prevention', () => {
    it('allows staff registration attempt with DOCTOR role with pending verification status', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'dr.smith@hospital.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Doctor',
          role: 'DOCTOR',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('DOCTOR');
    });

    it('rejects self-registration attempt with HOSPITAL_ADMIN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'admin@hospital.com',
          password: 'Password123!',
          firstName: 'Admin',
          lastName: 'User',
          role: 'HOSPITAL_ADMIN',
        });

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Self-registration for');
    });

    it('rejects self-registration attempt with SYSTEM_ADMIN role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'sysadmin@system.com',
          password: 'Password123!',
          firstName: 'System',
          lastName: 'Admin',
          role: 'SYSTEM_ADMIN',
        });

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Self-registration for');
    });

    it('rejects self-registration attempt with EMERGENCY role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'emergency@ems.org',
          password: 'Password123!',
          firstName: 'First',
          lastName: 'Responder',
          role: 'EMERGENCY',
        });

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Self-registration for');
    });

    it('rejects arbitrary or unknown role', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'unknown@user.com',
          password: 'Password123!',
          firstName: 'Unknown',
          lastName: 'Role',
          role: 'SUPER_USER',
        });

      expect([400, 403]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Task 2 — Field Validation & Schema Compliance', () => {
    it('rejects registration when email is missing or malformed', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'not-an-email',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('rejects registration when password is less than 8 characters', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'patient@example.com',
          password: 'short',
          firstName: 'John',
          lastName: 'Doe',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Password must be at least 8 characters');
    });

    it('rejects registration when first name or last name is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'patient@example.com',
          password: 'Password123!',
          firstName: '',
          lastName: 'Doe',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('rejects date of birth in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'future@example.com',
          password: 'Password123!',
          firstName: 'Future',
          lastName: 'Baby',
          dateOfBirth: futureDate.toISOString().split('T')[0],
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Date of birth cannot be in the future');
    });

    it('rejects invalid sex value not in schema enum', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'patient@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          sex: 'INVALID_SEX',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(JSON.stringify(res.body)).toContain('Sex must be M, F, O, or Prefer not to say');
    });
  });

  describe('Task 2 — Duplicate Email Handling & Successful Creation', () => {
    it('returns HTTP 409 Conflict with safe message when email is already registered', async () => {
      User.findOne.mockResolvedValueOnce({
        _id: '507f1f77bcf86cd799439011',
        email: 'existing@jeevacare.com',
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'existing@jeevacare.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Existing',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('An account with this email address already exists');
    });

    it('handles MongoDB duplicate key E11000 gracefully as HTTP 409 Conflict', async () => {
      // findOne returns null (no existing user), but save throws E11000
      User.findOne.mockResolvedValueOnce(null);
      const mongoError = new Error('E11000 duplicate key error collection: users index: email_1');
      mongoError.code = 11000;
      // The User constructor returns an instance; mock that instance's save to throw
      const saveMock = vi.fn().mockRejectedValueOnce(mongoError);
      User.mockImplementationOnce(() => ({ save: saveMock }));

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'racecondition@jeevacare.com',
          password: 'Password123!',
          firstName: 'Race',
          lastName: 'Condition',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
      expect(res.body.error.message).toContain('An account with this email address already exists');
    });

    it('successfully registers patient and returns 201 with JWT tokens and user record', async () => {
      User.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'newpatient@jeevacare.com',
          password: 'Password123!',
          firstName: 'Aarav',
          lastName: 'Sharma',
          role: 'PATIENT',
          dateOfBirth: '1995-05-15',
          sex: 'M',
          termsAccepted: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('User registered successfully');
      expect(res.body.user).toBeDefined();
      expect(res.body.tokens).toBeDefined();
      expect(res.body.tokens.token).toBeDefined();
      expect(res.body.tokens.refreshToken).toBeDefined();
    });

    it('defaults omitted role to PATIENT and permits GUARDIAN self-registration', async () => {
      // 1. Omitted role — defaults to PATIENT
      User.findOne.mockResolvedValueOnce(null);

      const resOmitted = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'defaultpatient@jeevacare.com',
          password: 'Password123!',
          firstName: 'Meera',
          lastName: 'Patel',
        });

      expect(resOmitted.status).toBe(201);
      expect(resOmitted.body.user.role).toBe('PATIENT');

      // 2. GUARDIAN role
      User.findOne.mockResolvedValueOnce(null);

      const resGuardian = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'guardian@jeevacare.com',
          password: 'Password123!',
          firstName: 'Ananya',
          lastName: 'Patel',
          role: 'GUARDIAN',
        });

      expect(resGuardian.status).toBe(201);
      expect(resGuardian.body.user.role).toBe('GUARDIAN');
    });
  });
});
