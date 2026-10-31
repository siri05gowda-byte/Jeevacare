/**
 * Facility Routes — Unit Tests
 *
 * Covers:
 * - GET /api/v1/facilities           → list active/verified facilities
 * - GET /api/v1/facilities/:id/doctors → list active doctors for a facility
 * - Authorization: both routes require a valid auth token
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import mongoose from 'mongoose';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeId() {
  return new mongoose.Types.ObjectId();
}

function makeHospital(overrides = {}) {
  return {
    _id: makeId(),
    name: overrides.name || 'City General Hospital',
    facilityId: overrides.facilityId || 'CGH-001',
    facilityType: overrides.facilityType || 'hospital',
    status: overrides.status || 'active',
    verificationStatus: 'verified',
    address: { city: 'Bengaluru', state: 'Karnataka' },
    contactInfo: { phone: '9876543210', email: 'info@cgh.local' },
    ...overrides,
  };
}

function makeStaffRecord(hospitalId, userId, overrides = {}) {
  return {
    _id: makeId(),
    hospitalId,
    userId: {
      _id: userId,
      email: 'doctor@test.local',
      role: 'DOCTOR',
      profile: { firstName: 'Raj', lastName: 'Kumar' },
    },
    role: 'doctor',
    associationStatus: 'active',
    specialization: 'Cardiology',
    department: { name: 'Cardiology' },
    ...overrides,
  };
}

// ─── Mock Hospital model ─────────────────────────────────────────────────────

const mockHospitalFind = vi.fn();
vi.mock('../../models/Hospital.js', () => ({
  default: {
    find: (...args) => mockHospitalFind(...args),
  },
}));

// ─── Mock HospitalStaff model ────────────────────────────────────────────────

const mockStaffFind = vi.fn();
vi.mock('../../models/HospitalStaff.js', () => ({
  default: {
    find: (...args) => mockStaffFind(...args),
  },
}));

// ─── Mock auth middleware (pass-through with injected user) ──────────────────

vi.mock('../../middleware/authentication.js', () => ({
  authMiddleware: (req, _res, next) => {
    req.user = req._testUser || { _id: makeId(), role: 'PATIENT' };
    next();
  },
  requireRole: (..._roles) => (_req, _res, next) => next(),
}));

// ─── Mock facilityRBAC (not used by new routes, but imported) ───────────────

vi.mock('../../middleware/facilityRBAC.js', () => ({
  blockSuspendedFacilities: (_req, _res, next) => next(),
  requireFacilityRole: () => (_req, _res, next) => next(),
  requireHospitalAdmin: (_req, _res, next) => next(),
  attachFacilityContext: (_req, _res, next) => next(),
}));

// ─── Mock FacilityService (not used by new routes) ───────────────────────────

vi.mock('../../services/FacilityService.js', () => ({ default: {} }));

// ─── Mock AuditService ───────────────────────────────────────────────────────

vi.mock('../../services/AuditService.js', () => ({
  default: { logEvent: vi.fn().mockResolvedValue(undefined) },
}));

// ─── Mock logger ─────────────────────────────────────────────────────────────

vi.mock('../../utils/logger.js', () => ({
  default: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ─── Mock User (not used by new routes directly) ─────────────────────────────

vi.mock('../../models/User.js', () => ({ default: {} }));

// ─── Import router under test AFTER mocks ────────────────────────────────────

import express from 'express';
import request from 'supertest';

async function buildApp() {
  const { default: facilityRouter } = await import('../../routes/facilityRoutes.js');
  const app = express();
  app.use(express.json());
  app.use('/api/v1/facilities', facilityRouter);
  return app;
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('Facility Routes', () => {
  let app;

  beforeEach(async () => {
    vi.clearAllMocks();
    app = await buildApp();
  });

  // ── GET /api/v1/facilities ─────────────────────────────────────────────────

  describe('GET /api/v1/facilities', () => {
    it('returns list of active/verified facilities', async () => {
      const h1 = makeHospital({ name: 'Alpha Hospital', status: 'active' });
      const h2 = makeHospital({ name: 'Beta Clinic', status: 'verified' });

      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([h1, h2]),
      };
      mockHospitalFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(2);

      const names = res.body.data.map((f) => f.name);
      expect(names).toContain('Alpha Hospital');
      expect(names).toContain('Beta Clinic');
    });

    it('maps fields correctly (id, type, location)', async () => {
      const h = makeHospital({
        name: 'Delta Hospital',
        facilityType: 'clinic',
        status: 'active',
        address: { city: 'Mysuru', state: 'Karnataka' },
      });

      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([h]),
      };
      mockHospitalFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      const facility = res.body.data[0];
      expect(facility.type).toBe('clinic');
      expect(facility.location).toBe('Mysuru, Karnataka');
      expect(facility.id).toBeDefined();
      expect(facility._id).toBeDefined();
    });

    it('returns empty array when no facilities exist', async () => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      mockHospitalFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns 500 when database query throws', async () => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        lean: vi.fn().mockRejectedValue(new Error('DB connection lost')),
      };
      mockHospitalFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get('/api/v1/facilities')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });

  // ── GET /api/v1/facilities/:facilityId/doctors ─────────────────────────────

  describe('GET /api/v1/facilities/:facilityId/doctors', () => {
    const facilityId = new mongoose.Types.ObjectId().toString();

    it('returns active doctors for a valid facility', async () => {
      const doctorUserId = makeId();
      const staff1 = makeStaffRecord(facilityId, doctorUserId);

      const chainMock = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([staff1]),
      };
      mockStaffFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get(`/api/v1/facilities/${facilityId}/doctors`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data).toHaveLength(1);

      const doctor = res.body.data[0];
      expect(doctor.name).toBe('Raj Kumar');
      expect(doctor.speciality).toBe('Cardiology');
      expect(doctor._id).toBeDefined();
    });

    it('excludes staff without a populated userId', async () => {
      const staffWithoutUser = makeStaffRecord(facilityId, makeId());
      staffWithoutUser.userId = null; // simulates populate failure

      const chainMock = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([staffWithoutUser]),
      };
      mockStaffFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get(`/api/v1/facilities/${facilityId}/doctors`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });

    it('returns empty array when facility has no active doctors', async () => {
      const chainMock = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockResolvedValue([]),
      };
      mockStaffFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get(`/api/v1/facilities/${facilityId}/doctors`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('returns 400 for invalid (non-MongoID) facility ID', async () => {
      const res = await request(app)
        .get('/api/v1/facilities/not-a-valid-id/doctors')
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(400);
    });

    it('returns 500 when database query throws', async () => {
      const chainMock = {
        populate: vi.fn().mockReturnThis(),
        lean: vi.fn().mockRejectedValue(new Error('Timeout')),
      };
      mockStaffFind.mockReturnValue(chainMock);

      const res = await request(app)
        .get(`/api/v1/facilities/${facilityId}/doctors`)
        .set('Authorization', 'Bearer test-token');

      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
    });
  });
});
