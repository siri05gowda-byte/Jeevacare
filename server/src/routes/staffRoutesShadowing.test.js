import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import staffRoutes from './staffRoutes.js';
import StaffService from '../services/StaffService.js';
import HospitalStaff from '../models/HospitalStaff.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';

describe('Staff Routes - Route Shadowing Regression Tests', () => {
  let app;
  const adminUserId = '507f1f77bcf86cd799439011';
  const sampleStaffId = '507f1f77bcf86cd799439099';

  beforeEach(() => {
    vi.clearAllMocks();

    app = express();
    app.use(express.json());

    // Mock authenticated SYSTEM_ADMIN user
    app.use((req, res, next) => {
      req.user = {
        _id: adminUserId,
        role: 'SYSTEM_ADMIN',
        email: 'admin@demo.com',
      };
      next();
    });

    app.use('/staff', staffRoutes);
  });

  it('GET /staff/pending-associations is not shadowed by /:staffId', async () => {
    vi.spyOn(StaffService, 'getPendingAssociations').mockResolvedValue([
      {
        _id: sampleStaffId,
        userId: { _id: '507f1f77bcf86cd799439022', name: 'Dr. Jane' },
        hospitalId: { _id: '507f1f77bcf86cd799439033', name: 'General Hospital' },
        role: 'doctor',
        associationStatus: 'pending',
      },
    ]);

    const res = await request(app).get('/staff/pending-associations');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].role).toBe('doctor');
  });

  it('GET /staff/search-users is not shadowed by /:staffId and returns _id and userId', async () => {
    vi.spyOn(User, 'find').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439022',
          email: 'doctor@demo.com',
          role: 'DOCTOR',
          profile: { firstName: 'Demo', lastName: 'Doctor' },
          jeevaId: 'JEV12345',
        },
      ]),
    });

    const res = await request(app).get('/staff/search-users?q=doctor');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe('507f1f77bcf86cd799439022');
    expect(res.body.data[0].userId).toBe('507f1f77bcf86cd799439022');
    expect(res.body.data[0].firstName).toBe('Demo');
    expect(res.body.data[0].lastName).toBe('Doctor');
  });

  it('GET /staff/search-facilities is not shadowed by /:staffId and returns _id and hospitalId', async () => {
    vi.spyOn(Hospital, 'find').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      sort: vi.fn().mockResolvedValue([
        {
          _id: '507f1f77bcf86cd799439033',
          name: 'City Care Hospital',
          facilityId: 'FAC001',
          address: { city: 'Bengaluru' },
        },
      ]),
    });

    const res = await request(app).get('/staff/search-facilities?q=City');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]._id).toBe('507f1f77bcf86cd799439033');
    expect(res.body.data[0].hospitalId).toBe('507f1f77bcf86cd799439033');
    expect(res.body.data[0].name).toBe('City Care Hospital');
  });

  it('GET /staff/:staffId still resolves correctly when given a valid MongoID', async () => {
    vi.spyOn(StaffService, 'getStaffRecord').mockResolvedValue({
      _id: sampleStaffId,
      userId: { _id: '507f1f77bcf86cd799439022', name: 'Dr. Jane' },
      hospitalId: { _id: '507f1f77bcf86cd799439033', name: 'General Hospital' },
      role: 'doctor',
      department: 'Cardiology',
      employmentStatus: 'active',
      associationStatus: 'active',
      startDate: new Date('2026-01-01'),
    });

    const res = await request(app).get(`/staff/${sampleStaffId}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.staffId).toBe(sampleStaffId);
    expect(res.body.data.role).toBe('doctor');
  });
});
