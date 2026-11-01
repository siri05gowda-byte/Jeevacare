import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Mock models and services before route import
vi.mock('../models/Patient.js', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

vi.mock('../models/HospitalStaff.js', () => ({
  default: {
    find: vi.fn().mockReturnValue({
      populate: vi.fn().mockResolvedValue([]),
    }),
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

vi.mock('../models/HealthcareProfessional.js', () => ({
  default: {
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue(null),
      }),
    }),
  },
}));

vi.mock('../models/Hospital.js', () => ({
  default: {
    findById: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue(null),
    }),
  },
}));

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

import authRoutes from '../routes/authRoutes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import User from '../models/User.js';

describe('Demo Authentication & Security Regression Test Suite', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.DEMO_MODE;
    delete process.env.ENABLE_DEMO_AUTH_FALLBACK;
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('1. User.prototype.comparePassword Security & Allowlist Enforcement', () => {
    it('should return true on direct bcrypt hash match for standard users', async () => {
      const hash = await bcryptjs.hash('SecretPassword@2026', 10);
      const user = new User({
        email: 'regular.patient@gmail.com',
        passwordHash: hash,
        role: 'PATIENT',
        isDemoAccount: false,
      });
      const result = await user.comparePassword('SecretPassword@2026');
      expect(result).toBe(true);
    });

    it('should reject incorrect password for standard users', async () => {
      const hash = await bcryptjs.hash('SecretPassword@2026', 10);
      const user = new User({
        email: 'regular.patient@gmail.com',
        passwordHash: hash,
        role: 'PATIENT',
        isDemoAccount: false,
      });
      const result = await user.comparePassword('WrongPassword');
      expect(result).toBe(false);
    });

    it('should STRICTLY DENY generic demo passwords for ordinary non-demo accounts', async () => {
      const hash = await bcryptjs.hash('RealUserPassword@123', 10);
      const ordinaryUser = new User({
        email: 'patient@gmail.com',
        passwordHash: hash,
        role: 'PATIENT',
        isDemoAccount: false,
        profile: { firstName: 'Ordinary', lastName: 'Patient' },
      });

      // Attempting to log in with generic demo password should fail
      expect(await ordinaryUser.comparePassword('Patient@123')).toBe(false);
      expect(await ordinaryUser.comparePassword('OrdinaryPatient@123')).toBe(false);
      expect(await ordinaryUser.comparePassword('DemoPassword123')).toBe(false);
      // Valid real password still succeeds
      expect(await ordinaryUser.comparePassword('RealUserPassword@123')).toBe(true);
    });

    it('should STRICTLY PRESERVE Kunal accounts from inheriting demo fallback credentials', async () => {
      const hash = await bcryptjs.hash('KunalPrivatePassword@999', 10);
      const kunalAccounts = [
        new User({ email: 'kunal@demo.com', passwordHash: hash, role: 'DOCTOR', isDemoAccount: false }),
        new User({ email: 'kunal@carmel.academy', passwordHash: hash, role: 'PATIENT', isDemoAccount: false }),
        new User({ email: 'kunalmk2005@gmail.com', passwordHash: hash, role: 'DOCTOR', isDemoAccount: false }),
      ];

      for (const kUser of kunalAccounts) {
        expect(await kUser.comparePassword('Doctor@123')).toBe(false);
        expect(await kUser.comparePassword('Patient@123')).toBe(false);
        expect(await kUser.comparePassword('DemoPassword123')).toBe(false);
        // Only real hash matches
        expect(await kUser.comparePassword('KunalPrivatePassword@999')).toBe(true);
      }
    });

    it('should gracefully accept Patient@123 or personalized password for explicit demo patients', async () => {
      const hash = await bcryptjs.hash('StoredDifferentHash@999', 10);
      const user = new User({
        email: 'rajesh.kumar.pat@sanjivani.in',
        passwordHash: hash,
        role: 'PATIENT',
        isDemoAccount: true,
        profile: { firstName: 'Rajesh', lastName: 'Kumar' },
      });
      expect(await user.comparePassword('Patient@123')).toBe(true);
      expect(await user.comparePassword('RajeshKumar@123')).toBe(true);
      expect(await user.comparePassword('UnrelatedPass')).toBe(false);
    });

    it('should gracefully accept Doctor@123 or personalized password for explicit demo doctors', async () => {
      const hash = await bcryptjs.hash('StoredDifferentHash@999', 10);
      const user = new User({
        email: 'soundarya.shetty@sanjivani.in',
        passwordHash: hash,
        role: 'DOCTOR',
        isDemoAccount: true,
        profile: { firstName: 'Soundarya', lastName: 'Shetty' },
      });
      expect(await user.comparePassword('Doctor@123')).toBe(true);
      expect(await user.comparePassword('SoundaryaShetty@123')).toBe(true);
      expect(await user.comparePassword('WrongPassword')).toBe(false);
    });

    it('should gracefully accept Admin@123 or personalized password for explicit demo admins', async () => {
      const hash = await bcryptjs.hash('StoredDifferentHash@999', 10);
      const user = new User({
        email: 'prakash.rao@sanjivani.in',
        passwordHash: hash,
        role: 'HOSPITAL_ADMIN',
        isDemoAccount: true,
        profile: { firstName: 'Prakash', lastName: 'Rao' },
      });
      expect(await user.comparePassword('Admin@123')).toBe(true);
      expect(await user.comparePassword('PrakashRao@123')).toBe(true);
      expect(await user.comparePassword('WrongPassword')).toBe(false);
    });

    it('should accept DemoAdmin@123 for system administrator demo account', async () => {
      const hash = await bcryptjs.hash('StoredDifferentHash@999', 10);
      const user = new User({
        email: 'admin@jeevacare.demo',
        passwordHash: hash,
        role: 'SYSTEM_ADMIN',
        isDemoAccount: true,
      });
      expect(await user.comparePassword('DemoAdmin@123')).toBe(true);
      expect(await user.comparePassword('WrongAdminPassword')).toBe(false);
    });

    it('should accept DemoPassword123 for generic UI demo accounts', async () => {
      const hash = await bcryptjs.hash('StoredDifferentHash@999', 10);
      const patientDemo = new User({ email: 'patient@demo.com', passwordHash: hash, role: 'PATIENT', isDemoAccount: true });
      const doctorDemo = new User({ email: 'doctor@demo.com', passwordHash: hash, role: 'DOCTOR', isDemoAccount: true });
      const adminDemo = new User({ email: 'admin@demo.com', passwordHash: hash, role: 'SYSTEM_ADMIN', isDemoAccount: true });

      expect(await patientDemo.comparePassword('DemoPassword123')).toBe(true);
      expect(await doctorDemo.comparePassword('DemoPassword123')).toBe(true);
      expect(await adminDemo.comparePassword('DemoPassword123')).toBe(true);
    });

    it('should disable demo fallback entirely when DEMO_MODE=false is set', async () => {
      process.env.DEMO_MODE = 'false';
      const hash = await bcryptjs.hash('OnlyThisPasswordWorks', 10);
      const demoUser = new User({
        email: 'rajesh.kumar.pat@sanjivani.in',
        passwordHash: hash,
        role: 'PATIENT',
        isDemoAccount: true,
      });

      // When demo mode is disabled, fallback must NOT trigger
      expect(await demoUser.comparePassword('Patient@123')).toBe(false);
      expect(await demoUser.comparePassword('OnlyThisPasswordWorks')).toBe(true);
    });
  });

  describe('2. POST /api/v1/auth/login Endpoint Full Workflow & Role Dashboard Routing', () => {
    it('should authenticate demo user and return valid JWT with role for dashboard access', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439010',
        email: 'doctor@demo.com',
        role: 'DOCTOR',
        status: 'active',
        verificationStatus: 'verified',
        auditMetadata: { loginAttempts: 0 },
        comparePassword: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439010',
          email: 'doctor@demo.com',
          role: 'DOCTOR',
          profile: { firstName: 'Demo', lastName: 'Doctor' },
        }),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'doctor@demo.com', password: 'DemoPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.role).toBe('DOCTOR');
      expect(res.body.tokens?.token).toBeDefined();

      // Verify JWT payload contains role and userId
      const decoded = jwt.decode(res.body.tokens.token);
      expect(decoded.role).toBe('DOCTOR');
      expect(decoded.userId).toBe('507f1f77bcf86cd799439010');
    });

    it('should accept username, jeevaId, or identifier parameters interchangeably', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'rajesh.kumar.pat@sanjivani.in',
        jeevaId: 'JC-SANJ-PAT-001',
        role: 'PATIENT',
        status: 'active',
        verificationStatus: 'verified',
        auditMetadata: { loginAttempts: 0 },
        comparePassword: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'rajesh.kumar.pat@sanjivani.in',
          role: 'PATIENT',
        }),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      // Test with username
      const resUser = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'rajesh.kumar.pat@sanjivani.in', password: 'Patient@123' });
      expect(resUser.status).toBe(200);

      // Test with jeevaId
      const resJeeva = await request(app)
        .post('/api/v1/auth/login')
        .send({ jeevaId: 'JC-SANJ-PAT-001', password: 'Patient@123' });
      expect(resJeeva.status).toBe(200);

      // Test with identifier
      const resIdent = await request(app)
        .post('/api/v1/auth/login')
        .send({ identifier: 'rajesh.kumar.pat@sanjivani.in', password: 'Patient@123' });
      expect(resIdent.status).toBe(200);
    });

    it('should return 401 when password does not match candidate', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439013',
        email: 'patient@demo.com',
        role: 'PATIENT',
        status: 'active',
        auditMetadata: { loginAttempts: 0 },
        comparePassword: vi.fn().mockResolvedValue(false),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'patient@demo.com', password: 'WrongPassword' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error?.message).toBe('Invalid email or password');
    });

    it('should return 400 when identifier or password is missing', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect([400, 422]).toContain(res.status);
    });

    it('should reject login for inactive accounts (status != active)', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439014',
        email: 'inactive@example.com',
        role: 'PATIENT',
        status: 'inactive',
        verificationStatus: 'verified',
        auditMetadata: { loginAttempts: 0 },
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'inactive@example.com', password: 'AnyPassword@123' });

      expect([400, 403]).toContain(res.status);
      expect(res.body.error?.message).toMatch(/account is currently inactive/i);
    });

    it('should reject login for suspended accounts', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439015',
        email: 'suspended@example.com',
        role: 'DOCTOR',
        status: 'suspended',
        verificationStatus: 'verified',
        auditMetadata: { loginAttempts: 0 },
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'suspended@example.com', password: 'AnyPassword@123' });

      expect([400, 403]).toContain(res.status);
      expect(res.body.error?.message).toMatch(/account is currently suspended/i);
    });

    it('should reject login for accounts whose verification has been rejected', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439016',
        email: 'rejected.doc@example.com',
        role: 'DOCTOR',
        status: 'active',
        verificationStatus: 'rejected',
        auditMetadata: { loginAttempts: 0 },
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'rejected.doc@example.com', password: 'AnyPassword@123' });

      expect([401, 403]).toContain(res.status);
      expect(res.body.error?.message).toMatch(/rejected/i);
    });

    it('should enforce account lockout when lockedUntil is in the future', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439017',
        email: 'locked@example.com',
        role: 'PATIENT',
        status: 'active',
        verificationStatus: 'verified',
        auditMetadata: {
          loginAttempts: 5,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000), // Locked for 15 more minutes
        },
        comparePassword: vi.fn(),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ email: 'locked@example.com', password: 'CorrectOrWrongPassword' });

      expect([400, 403]).toContain(res.status);
      expect(res.body.error?.message).toMatch(/locked/i);
      // Password check should not have been called on locked account
      expect(mockUser.comparePassword).not.toHaveBeenCalled();
    });
  });
});
