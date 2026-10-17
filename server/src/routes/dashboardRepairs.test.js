import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import HospitalStaff from '../models/HospitalStaff.js';
import Notification from '../models/Notification.js';
import patientRoutes from './patientRoutes.js';
import appointmentRoutes from './appointmentRoutes.js';
import notificationRoutes from './notificationRoutes.js';
import documentRoutes from './documentRoutes.js';
import PatientService from '../services/PatientService.js';
import AppointmentService from '../services/AppointmentService.js';
import DocumentService from '../services/DocumentService.js';
import AuditService from '../services/AuditService.js';

describe('JeevaCare Dashboard End-to-End Repairs', () => {
  let app;
  const patientUserId = '507f1f77bcf86cd799439011';
  const patientDocId = '507f1f77bcf86cd799439012';
  const doctorUserId = '507f1f77bcf86cd799439013';
  const facilityId = '507f1f77bcf86cd799439014';

  const mockPatientUser = {
    _id: patientUserId,
    id: patientUserId,
    role: 'PATIENT',
    email: 'patient@jeevacare.com',
    status: 'active',
    verificationStatus: 'verified',
    profile: { firstName: 'Aarav', lastName: 'Sharma' },
  };

  const mockDoctorUser = {
    _id: doctorUserId,
    id: doctorUserId,
    role: 'DOCTOR',
    email: 'doctor@jeevacare.com',
    status: 'active',
    verificationStatus: 'verified',
    facilityId: facilityId,
    profile: { firstName: 'Dr. Priya', lastName: 'Rao', licenseNumber: 'MED123' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(AuditService, 'logEvent').mockResolvedValue(true);
    vi.spyOn(AuditService, 'logPatientAccess').mockResolvedValue(true);
  });

  describe('1. Patient Verification Defaults', () => {
    it('defaults PATIENT and GUARDIAN accounts to verified status', () => {
      const patient = new User({
        email: 'patient-test@jeevacare.com',
        passwordHash: 'dummyhash',
        role: 'PATIENT',
        profile: { firstName: 'Test', lastName: 'Patient' },
      });
      expect(patient.verificationStatus).toBe('verified');

      const guardian = new User({
        email: 'guardian-test@jeevacare.com',
        passwordHash: 'dummyhash',
        role: 'GUARDIAN',
        profile: { firstName: 'Test', lastName: 'Guardian' },
      });
      expect(guardian.verificationStatus).toBe('verified');
    });

    it('requires DOCTOR and other healthcare staff accounts to remain pending verification', () => {
      const doctor = new User({
        email: 'doctor-test@jeevacare.com',
        passwordHash: 'dummyhash',
        role: 'DOCTOR',
        profile: { firstName: 'Dr. Test', lastName: 'Physician' },
      });
      expect(doctor.verificationStatus).toBe('pending');
    });
  });

  describe('2. Notification Authentication & Polling Protection', () => {
    it('returns 401 when no token is provided to notification routes', async () => {
      const notifApp = express();
      notifApp.use(express.json());
      notifApp.use('/notifications', notificationRoutes);
      notifApp.use((err, req, res, next) => {
        res.status(err.statusCode || 401).json({ error: { message: err.message, code: err.code } });
      });

      const res = await request(notifApp).get('/notifications/unread-count');
      expect(res.status).toBe(401);
      const errMsg = res.body.error?.message || res.body.message || '';
      expect(errMsg).toMatch(/No token provided/i);
    });

    it('returns unread count successfully for authenticated user', async () => {
      const notifApp = express();
      notifApp.use(express.json());
      notifApp.use((req, res, next) => {
        req.user = mockPatientUser;
        next();
      });
      notifApp.use('/notifications', notificationRoutes);

      vi.spyOn(Notification, 'getUnreadCount').mockResolvedValue(4);

      const res = await request(notifApp).get('/notifications/unread-count');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.count).toBe(4);
    });
  });

  describe('3. Patient Profile ID Resolution & Profile Auto-Creation', () => {
    it('resolves existing Patient profile on GET /patients/profile', async () => {
      const pApp = express();
      pApp.use(express.json());
      pApp.use((req, res, next) => {
        req.user = mockPatientUser;
        next();
      });
      pApp.use('/patients', patientRoutes);

      const mockPatientRecord = {
        _id: patientDocId,
        userId: patientUserId,
        personalIdentity: { firstName: 'Aarav', lastName: 'Sharma' },
      };
      vi.spyOn(PatientService, 'getPatientByUserId').mockResolvedValue(mockPatientRecord);

      const res = await request(pApp).get('/patients/profile');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(patientDocId);
    });

    it('auto-creates Patient profile if missing for authenticated patient', async () => {
      const pApp = express();
      pApp.use(express.json());
      pApp.use((req, res, next) => {
        req.user = mockPatientUser;
        next();
      });
      pApp.use('/patients', patientRoutes);

      vi.spyOn(PatientService, 'getPatientByUserId').mockRejectedValue(new Error('Patient not found'));
      vi.spyOn(User, 'findById').mockResolvedValue(mockPatientUser);
      const createdPatient = {
        _id: patientDocId,
        userId: patientUserId,
        personalIdentity: { firstName: 'Aarav', lastName: 'Sharma' },
      };
      vi.spyOn(Patient.prototype, 'save').mockResolvedValue(createdPatient);

      const res = await request(pApp).get('/patients/profile');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data._id).toBe(patientDocId);
    });
  });

  describe('4. Doctor Patient Search & Facility Isolation', () => {
    it('routes /search correctly without route shadowing by /:patientId', async () => {
      const pApp = express();
      pApp.use(express.json());
      pApp.use((req, res, next) => {
        req.user = mockDoctorUser;
        next();
      });
      pApp.use('/patients', patientRoutes);

      vi.spyOn(PatientService, 'searchPatients').mockResolvedValue({
        patients: [{ _id: patientDocId, personalIdentity: { firstName: 'Aarav' } }],
        pagination: { page: 1, limit: 10, total: 1 },
      });

      const res = await request(pApp).get('/patients/search?q=Aarav');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.patients).toHaveLength(1);
    });

    it('enforces facility isolation: rejects search when doctor has no facility association', async () => {
      const pApp = express();
      pApp.use(express.json());
      pApp.use((req, res, next) => {
        req.user = { ...mockDoctorUser, facilityId: null };
        next();
      });
      pApp.use('/patients', patientRoutes);

      vi.spyOn(HospitalStaff, 'findOne').mockResolvedValue(null);

      const res = await request(pApp).get('/patients/search?q=Aarav');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('NO_FACILITY_ASSOCIATION');
    });
  });

  describe('5. Doctor Appointments Role Checks & Facility Association', () => {
    it('permits authorized DOCTOR to access doctor appointments', async () => {
      const aApp = express();
      aApp.use(express.json());
      aApp.use((req, res, next) => {
        req.user = mockDoctorUser;
        next();
      });
      aApp.use('/appointments', appointmentRoutes);

      vi.spyOn(AppointmentService, 'getDoctorAppointments').mockResolvedValue([]);

      const res = await request(aApp).get(`/appointments/doctor/${doctorUserId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });

    it('resolves doctor facility from HospitalStaff when facilityId not in user store', async () => {
      const aApp = express();
      aApp.use(express.json());
      aApp.use((req, res, next) => {
        req.user = { ...mockDoctorUser, facilityId: null };
        next();
      });
      aApp.use('/appointments', appointmentRoutes);

      vi.spyOn(HospitalStaff, 'findOne').mockReturnValue({
        sort: vi.fn().mockResolvedValue({ hospitalId: facilityId }),
      });
      vi.spyOn(AppointmentService, 'getDoctorAppointments').mockResolvedValue([]);

      const res = await request(aApp).get(`/appointments/doctor/${doctorUserId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('6. Patient Appointments Retrieval & Empty State', () => {
    it('returns empty list instead of error when patient has no appointments', async () => {
      const aApp = express();
      aApp.use(express.json());
      aApp.use((req, res, next) => {
        req.user = mockPatientUser;
        next();
      });
      aApp.use('/appointments', appointmentRoutes);

      vi.spyOn(AppointmentService, 'getPatientAppointments').mockResolvedValue([]);

      const res = await request(aApp).get(`/appointments/patient/${patientDocId}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toEqual([]);
    });
  });

  describe('7. Document Upload Storage Error Sanitization', () => {
    it('returns 503 STORAGE_NOT_CONFIGURED when Cloudinary is not configured', async () => {
      const dApp = express();
      dApp.use(express.json());
      dApp.use((req, res, next) => {
        req.user = mockDoctorUser;
        next();
      });
      dApp.use('/documents', documentRoutes);

      vi.spyOn(DocumentService, 'uploadDocument').mockRejectedValue(
        Object.assign(new Error('Cloudinary not configured'), { code: 'STORAGE_NOT_CONFIGURED' })
      );

      // Testing upload endpoint with storage failure
      const res = await request(dApp)
        .post('/documents/upload')
        .attach('file', Buffer.from('test document content'), 'report.pdf')
        .field('patientId', patientDocId)
        .field('documentType', 'prescription');

      expect(res.status).toBe(503);
      expect(res.body.code).toBe('STORAGE_NOT_CONFIGURED');
    });
  });
});
