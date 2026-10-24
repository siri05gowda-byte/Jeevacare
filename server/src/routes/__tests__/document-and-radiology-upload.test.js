import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import mongoose from 'mongoose';
import documentRoutes from '../documentRoutes.js';
import radiologyRoutes from '../radiologyRoutes.js';
import CloudinaryAdapter from '../../adapters/CloudinaryAdapter.js';
import DocumentService from '../../services/DocumentService.js';
import RadiologyService from '../../services/RadiologyService.js';
import Patient from '../../models/Patient.js';
import User from '../../models/User.js';
import Hospital from '../../models/Hospital.js';
import ClinicalAuthorizationBoundary from '../../utils/clinicalAuthorizationBoundary.js';

// Setup mock test app
const app = express();
app.use(express.json());

// Mock auth middleware to inject user context dynamically
let mockUser = {
  _id: '507f1f77bcf86cd799439001',
  id: '507f1f77bcf86cd799439001',
  email: 'patient@jeevacare.demo',
  role: 'PATIENT',
  status: 'active',
  patientId: '507f1f77bcf86cd799439002',
};

// Bypass auth middleware with dynamic mockUser in tests
vi.mock('../../middleware/authentication.js', () => ({
  authMiddleware: (req, res, next) => {
    if (!mockUser) {
      return res.status(401).json({ error: 'No token provided' });
    }
    req.user = { ...mockUser };
    req.token = 'mock-jwt-token';
    next();
  },
  requireRole: (...allowedRoles) => {
    const roles = allowedRoles.flat();
    return (req, res, next) => {
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Access denied: insufficient role' });
      }
      next();
    };
  },
  requirePatientIsolation: () => (req, res, next) => next(),
}));

app.use('/api/v1/documents', documentRoutes);
app.use('/api/radiology', radiologyRoutes);

describe('Patient Documents & Radiology Upload Integration Tests', () => {
  const testPatientId = '507f1f77bcf86cd799439002';
  const testHospitalId = '507f1f77bcf86cd799439003';
  const mockBuffer = Buffer.from('%PDF-1.4 test document content');

  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      _id: '507f1f77bcf86cd799439001',
      id: '507f1f77bcf86cd799439001',
      email: 'patient@jeevacare.demo',
      role: 'PATIENT',
      status: 'active',
      patientId: testPatientId,
    };

    vi.spyOn(Patient, 'findOne').mockResolvedValue({
      _id: testPatientId,
      userId: '507f1f77bcf86cd799439001',
      facilities: [{ facilityId: testHospitalId }],
      status: 'active',
    });

    vi.spyOn(Patient, 'findById').mockResolvedValue({
      _id: testPatientId,
      userId: '507f1f77bcf86cd799439001',
      facilities: [{ facilityId: testHospitalId }],
      status: 'active',
    });

    vi.spyOn(Hospital, 'findOne').mockResolvedValue({
      _id: testHospitalId,
      name: 'Sanjivani Hospital',
      status: 'active',
    });

    vi.spyOn(CloudinaryAdapter, 'uploadFile').mockResolvedValue({
      publicId: 'jeevacare/documents/test_doc',
      url: 'https://res.cloudinary.com/demo/image/upload/test_doc.pdf',
      secureUrl: 'https://res.cloudinary.com/demo/image/upload/test_doc.pdf',
      format: 'pdf',
      bytes: 1024,
    });
  });

  describe('1. Patient Documents Upload (/api/v1/documents/upload)', () => {
    it('successfully uploads patient document with valid PDF and derives patient ID from session', async () => {
      vi.spyOn(DocumentService, 'uploadDocument').mockResolvedValue({
        success: true,
        document: {
          _id: '507f1f77bcf86cd799439099',
          patientId: testPatientId,
          documentType: 'medical_record',
          verificationStatus: 'patient_uploaded',
          fileReference: {
            cloudinaryPublicId: 'jeevacare/documents/test_doc',
            cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/test_doc.pdf',
          },
        },
      });

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .attach('file', mockBuffer, 'blood_test.pdf')
        .field('documentType', 'medical_record');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.document).toBeDefined();
      expect(DocumentService.uploadDocument).toHaveBeenCalled();
      const uploadArgs = vi.mocked(DocumentService.uploadDocument).mock.calls[0];
      expect(uploadArgs[0].patientId).toBe(testPatientId);
      expect(uploadArgs[0].documentType).toBe('medical_record');
    });

    it('rejects upload when no file is attached', async () => {
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .field('documentType', 'medical_record');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Please select a document file to upload/i);
    });

    it('rejects unsupported file types with understandable message', async () => {
      const exeBuffer = Buffer.from('MZ binary executable content');
      const res = await request(app)
        .post('/api/v1/documents/upload')
        .attach('file', exeBuffer, 'malicious.exe')
        .field('documentType', 'medical_record');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Allowed: PDF, JPEG, PNG, TIFF, DOCX, DOC, TXT/i);
    });

    it('rejects unauthenticated document upload', async () => {
      mockUser = null; // simulate no token

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .attach('file', mockBuffer, 'report.pdf')
        .field('documentType', 'medical_record');

      expect(res.status).toBe(401);
    });

    it('handles storage-provider failure gracefully (returns 503)', async () => {
      vi.spyOn(DocumentService, 'uploadDocument').mockResolvedValue({
        success: false,
        error: 'Persistent document storage is not configured',
        code: 'STORAGE_NOT_CONFIGURED',
      });

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .attach('file', mockBuffer, 'report.pdf')
        .field('documentType', 'medical_record');

      expect(res.status).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.code).toBe('STORAGE_NOT_CONFIGURED');
    });

    it('handles database-persistence failure cleanly', async () => {
      vi.spyOn(DocumentService, 'uploadDocument').mockRejectedValue(new Error('Database write connection timed out'));

      const res = await request(app)
        .post('/api/v1/documents/upload')
        .attach('file', mockBuffer, 'report.pdf')
        .field('documentType', 'medical_record');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to upload document');
    });
  });

  describe('2. Radiology Report Upload (/api/radiology/upload-report)', () => {
    it('successfully uploads radiology report as authenticated patient with valid metadata', async () => {
      vi.spyOn(RadiologyService, 'createRadiologyRecord').mockResolvedValue({
        _id: '507f1f77bcf86cd799439088',
        patientId: testPatientId,
        facilityId: testHospitalId,
        modalityType: 'x_ray',
        bodyPart: 'Chest',
        verificationStatus: 'patient_uploaded',
        imageReference: {
          cloudinaryPublicId: 'jeevacare/documents/test_doc',
          cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/test_doc.pdf',
        },
      });

      const res = await request(app)
        .post('/api/radiology/upload-report')
        .attach('file', mockBuffer, 'chest_xray.png')
        .field('bodyPart', 'Chest')
        .field('modalityType', 'X_RAY')
        .field('studyDate', '2026-10-24')
        .field('reportDate', '2026-10-24')
        .field('radiologistName', 'Dr. Matthews');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.aiStatus).toBe('pending_on_demand');
      expect(res.body.data.verificationStatus).toBe('patient_uploaded');
      expect(RadiologyService.createRadiologyRecord).toHaveBeenCalled();
      const [data, user, options] = vi.mocked(RadiologyService.createRadiologyRecord).mock.calls[0];
      expect(data.modalityType).toBe('x_ray'); // Normalized to lowercase
      expect(options.isPatientUpload).toBe(true);
    });

    it('rejects upload when file is missing', async () => {
      const res = await request(app)
        .post('/api/radiology/upload-report')
        .field('bodyPart', 'Chest')
        .field('modalityType', 'x_ray')
        .field('studyDate', '2026-10-24')
        .field('reportDate', '2026-10-24');

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Please select a radiology report file/i);
    });

    it('rejects upload when required metadata fields are missing', async () => {
      const res = await request(app)
        .post('/api/radiology/upload-report')
        .attach('file', mockBuffer, 'chest_xray.png')
        .field('modalityType', 'x_ray'); // missing bodyPart, studyDate, reportDate

      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/required/i);
    });

    it('rejects unauthenticated radiology upload', async () => {
      mockUser = null;

      const res = await request(app)
        .post('/api/radiology/upload-report')
        .attach('file', mockBuffer, 'chest_xray.png')
        .field('bodyPart', 'Chest')
        .field('modalityType', 'x_ray')
        .field('studyDate', '2026-10-24')
        .field('reportDate', '2026-10-24');

      expect(res.status).toBe(401);
    });

    it('handles storage failure on radiology upload gracefully', async () => {
      vi.spyOn(CloudinaryAdapter, 'uploadFile').mockRejectedValue(new Error('Cloudinary connection timed out'));

      const res = await request(app)
        .post('/api/radiology/upload-report')
        .attach('file', mockBuffer, 'chest_xray.png')
        .field('bodyPart', 'Chest')
        .field('modalityType', 'x_ray')
        .field('studyDate', '2026-10-24')
        .field('reportDate', '2026-10-24');

      expect(res.status).toBe(500);
      expect(res.body.error).toMatch(/Cloudinary connection timed out/i);
    });
  });
});
