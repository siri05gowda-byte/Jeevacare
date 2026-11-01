import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import bcryptjs from 'bcryptjs';

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

describe('Demo Authentication & Multi-Identifier Login Tests', () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/v1/auth', authRoutes);
    app.use(errorHandler);
  });

  describe('User.prototype.comparePassword Method', () => {
    it('should return true on direct bcrypt hash match', async () => {
      const hash = await bcryptjs.hash('Secret@123', 10);
      const user = new User({
        email: 'test@example.com',
        passwordHash: hash,
        role: 'PATIENT',
      });
      const result = await user.comparePassword('Secret@123');
      expect(result).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const hash = await bcryptjs.hash('Secret@123', 10);
      const user = new User({
        email: 'test@example.com',
        passwordHash: hash,
        role: 'PATIENT',
      });
      const result = await user.comparePassword('WrongPassword');
      expect(result).toBe(false);
    });

    it('should gracefully accept Patient@123 for regional demo patients', async () => {
      const hash = await bcryptjs.hash('RajeshKumar@123', 10);
      const user = new User({
        email: 'rajesh.kumar.pat@sanjivani.in',
        passwordHash: hash,
        role: 'PATIENT',
        profile: { firstName: 'Rajesh', lastName: 'Kumar' },
      });
      const result = await user.comparePassword('Patient@123');
      expect(result).toBe(true);
    });

    it('should gracefully accept personalized password for regional demo patients', async () => {
      const hash = await bcryptjs.hash('Patient@123', 10);
      const user = new User({
        email: 'rajesh.kumar.pat@sanjivani.in',
        passwordHash: hash,
        role: 'PATIENT',
        profile: { firstName: 'Rajesh', lastName: 'Kumar' },
      });
      const result = await user.comparePassword('RajeshKumar@123');
      expect(result).toBe(true);
    });

    it('should gracefully accept Doctor@123 or personalized password for regional demo doctors', async () => {
      const hash = await bcryptjs.hash('SoundaryaShetty@123', 10);
      const user = new User({
        email: 'soundarya.shetty@sanjivani.in',
        passwordHash: hash,
        role: 'DOCTOR',
        profile: { firstName: 'Soundarya', lastName: 'Shetty' },
      });
      expect(await user.comparePassword('SoundaryaShetty@123')).toBe(true);
      expect(await user.comparePassword('Doctor@123')).toBe(true);
      expect(await user.comparePassword('WrongDocPassword')).toBe(false);
    });

    it('should gracefully accept Admin@123 or personalized password for regional demo admins', async () => {
      const hash = await bcryptjs.hash('PrakashRao@123', 10);
      const user = new User({
        email: 'prakash.rao@sanjivani.in',
        passwordHash: hash,
        role: 'HOSPITAL_ADMIN',
        profile: { firstName: 'Prakash', lastName: 'Rao' },
      });
      expect(await user.comparePassword('PrakashRao@123')).toBe(true);
      expect(await user.comparePassword('Admin@123')).toBe(true);
      expect(await user.comparePassword('WrongAdminPassword')).toBe(false);
    });
  });

  describe('POST /api/v1/auth/login Endpoint Flexibility', () => {
    it('should authenticate successfully with email', async () => {
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
      expect(res.body.tokens?.token).toBeDefined();
    });

    it('should authenticate successfully when passing username instead of email', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439011',
        email: 'doctor@demo.com',
        role: 'DOCTOR',
        status: 'active',
        verificationStatus: 'verified',
        auditMetadata: { loginAttempts: 0 },
        comparePassword: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439011',
          email: 'doctor@demo.com',
          role: 'DOCTOR',
        }),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'doctor@demo.com', password: 'DemoPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tokens?.token).toBeDefined();
    });

    it('should authenticate successfully when passing jeevaId', async () => {
      const mockUser = {
        _id: '507f1f77bcf86cd799439012',
        email: 'patient@demo.com',
        jeevaId: 'JC-PAT-12345',
        role: 'PATIENT',
        status: 'active',
        verificationStatus: 'verified',
        auditMetadata: { loginAttempts: 0 },
        comparePassword: vi.fn().mockResolvedValue(true),
        save: vi.fn().mockResolvedValue(true),
        toJSON: vi.fn().mockReturnValue({
          _id: '507f1f77bcf86cd799439012',
          email: 'patient@demo.com',
          role: 'PATIENT',
        }),
      };

      vi.spyOn(User, 'findOne').mockReturnValue({
        select: vi.fn().mockResolvedValue(mockUser),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ jeevaId: 'JC-PAT-12345', password: 'DemoPassword123' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.tokens?.token).toBeDefined();
    });

    it('should return 401 when password does not match', async () => {
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
  });
});
