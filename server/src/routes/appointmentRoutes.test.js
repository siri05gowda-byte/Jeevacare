import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import appointmentRoutes from './appointmentRoutes.js';
import AppointmentService from '../services/AppointmentService.js';
import HospitalStaff from '../models/HospitalStaff.js';
import { authMiddleware } from '../middleware/authentication.js';

describe('Appointment Routes - Production Fixes', () => {
  let app;
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    role: 'PATIENT',
    email: 'patient@test.com',
    facilityId: null,
  };

  const mockDoctor = {
    _id: '507f1f77bcf86cd799439012',
    role: 'DOCTOR',
    email: 'doctor@test.com',
    facilityId: '507f1f77bcf86cd799439013',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      if (req.headers['x-test-no-facility']) {
        req.user = { ...mockDoctor, facilityId: null };
      } else {
        req.user = req.headers['x-test-role'] === 'DOCTOR' ? mockDoctor : mockUser;
      }
      next();
    });
    
    app.use('/appointments', appointmentRoutes);
  });

  describe('GET /appointments/patient/:patientId - Fix for HTTP 400', () => {
    it('should pass correct user object structure to AppointmentService', async () => {
      const getPatientAppointmentsSpy = vi.spyOn(AppointmentService, 'getPatientAppointments')
        .mockResolvedValue([]);

      await request(app)
        .get('/appointments/patient/507f1f77bcf86cd799439011')
        .expect(200);

      expect(getPatientAppointmentsSpy).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.objectContaining({
          _id: mockUser._id,
          id: mockUser._id,  // Both _id and id for compatibility
          role: 'PATIENT',
        }),
        {}
      );
    });

    it('should pass date filters correctly', async () => {
      const getPatientAppointmentsSpy = vi.spyOn(AppointmentService, 'getPatientAppointments')
        .mockResolvedValue([]);

      await request(app)
        .get('/appointments/patient/507f1f77bcf86cd799439011?startDate=2026-10-01&endDate=2026-10-31')
        .expect(200);

      expect(getPatientAppointmentsSpy).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439011',
        expect.any(Object),
        expect.objectContaining({
          startDate: expect.any(Date),
          endDate: expect.any(Date),
        })
      );
    });
  });

  describe('GET /appointments/doctor/:doctorId - Fix for HTTP 403', () => {
    it('should use facilityId from user object when not in query', async () => {
      const getDoctorAppointmentsSpy = vi.spyOn(AppointmentService, 'getDoctorAppointments')
        .mockResolvedValue([]);

      await request(app)
        .get('/appointments/doctor/507f1f77bcf86cd799439012')
        .set('x-test-role', 'DOCTOR')
        .expect(200);

      expect(getDoctorAppointmentsSpy).toHaveBeenCalledWith(
        '507f1f77bcf86cd799439012',
        expect.objectContaining({
          _id: mockDoctor._id,
          id: mockDoctor._id,
          role: 'DOCTOR',
          facilityId: mockDoctor.facilityId,
        }),
        expect.objectContaining({
          facilityId: mockDoctor.facilityId,
        })
      );
    });

    it('should return helpful error when no facility associated', async () => {
      vi.spyOn(HospitalStaff, 'findOne').mockResolvedValue(null);

      const response = await request(app)
        .get('/appointments/doctor/507f1f77bcf86cd799439012')
        .set('x-test-role', 'DOCTOR')
        .set('x-test-no-facility', 'true')
        .send();

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code', 'NO_FACILITY_ASSOCIATION');
      expect(response.body).toHaveProperty('action', 'contact_admin');
    });
  });

  describe('POST /appointments/book - User object structure fix', () => {
    it('should pass both _id and id for compatibility', async () => {
      const bookAppointmentSpy = vi.spyOn(AppointmentService, 'bookAppointment')
        .mockResolvedValue({ _id: 'apt123', status: 'scheduled' });

      await request(app)
        .post('/appointments/book')
        .send({
          patientId: '507f1f77bcf86cd799439011',
          providerId: '507f1f77bcf86cd799439012',
          facilityId: '507f1f77bcf86cd799439013',
          scheduledDateTime: '2026-10-15T10:00:00Z',
          duration: 30,
          reason: 'Checkup',
        })
        .expect(201);

      expect(bookAppointmentSpy).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          _id: mockUser._id,
          id: mockUser._id,
          role: 'PATIENT',
        })
      );
    });

    it('should support POST /appointments as alias for booking', async () => {
      const bookAppointmentSpy = vi.spyOn(AppointmentService, 'bookAppointment')
        .mockResolvedValue({ _id: 'apt124', status: 'scheduled' });

      const response = await request(app)
        .post('/appointments')
        .send({
          patientId: '507f1f77bcf86cd799439011',
          providerId: '507f1f77bcf86cd799439012',
          facilityId: '507f1f77bcf86cd799439013',
          scheduledDateTime: '2026-10-15T11:00:00Z',
          duration: 30,
          reason: 'Follow-up',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(bookAppointmentSpy).toHaveBeenCalled();
    });
  });

  describe('GET /appointments/available-slots', () => {
    it('should return available slots successfully', async () => {
      vi.spyOn(AppointmentService, 'getAvailableSlots').mockResolvedValue([
        '09:00', '09:30', '10:00', '10:30', '11:00', '14:00', '14:30', '15:00'
      ]);

      const response = await request(app)
        .get('/appointments/available-slots?doctorId=507f1f77bcf86cd799439012&facilityId=507f1f77bcf86cd799439013&date=2026-10-30')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toContain('09:00');
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should validate missing query parameters for available slots', async () => {
      const response = await request(app)
        .get('/appointments/available-slots?doctorId=507f1f77bcf86cd799439012')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing required query parameters');
    });
  });

  describe('POST /appointments/:id/reschedule and POST /appointments/:id/cancel', () => {
    it('should reschedule appointment via POST', async () => {
      vi.spyOn(AppointmentService, 'rescheduleAppointment').mockResolvedValue({
        _id: 'apt123',
        status: 'scheduled',
        scheduledDateTime: '2026-10-20T10:00:00.000Z',
      });

      const response = await request(app)
        .post('/appointments/apt123/reschedule')
        .send({
          newScheduledDateTime: '2026-10-20T10:00:00.000Z',
          reason: 'Need earlier slot',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('rescheduled');
    });

    it('should cancel appointment via POST', async () => {
      vi.spyOn(AppointmentService, 'cancelAppointment').mockResolvedValue({
        _id: 'apt123',
        status: 'cancelled',
      });

      const response = await request(app)
        .post('/appointments/apt123/cancel')
        .send({ reason: 'Feeling better' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('cancelled');
    });

    it('should update appointment status', async () => {
      vi.spyOn(AppointmentService, 'updateAppointmentStatus').mockResolvedValue({
        _id: 'apt123',
        status: 'completed',
      });

      const response = await request(app)
        .patch('/appointments/apt123/status')
        .send({ status: 'completed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
    });
  });
});
