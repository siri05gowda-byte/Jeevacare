import { describe, it, expect, vi, beforeEach } from 'vitest';
import RadiologyService from '../services/RadiologyService.js';
import express from 'express';
import request from 'supertest';
import radiologyRoutes from './radiologyRoutes.js';
import * as authMiddlewareModule from '../middleware/authentication.js';

// Setup mock express app
const app = express();
app.use(express.json());

describe('Radiology Service & Routes Authorization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Critical Indicators Helper', () => {
    it('detects acute and emergent clinical keywords', () => {
      expect(RadiologyService._hasCriticalIndicators('Acute pulmonary embolism identified in right main pulmonary artery')).toBe(true);
      expect(RadiologyService._hasCriticalIndicators('Suspicious mass with irregular borders in upper lobe')).toBe(true);
      expect(RadiologyService._hasCriticalIndicators('Intracranial hemorrhage noted in left temporal lobe')).toBe(true);
      expect(RadiologyService._hasCriticalIndicators('Tension pneumothorax requiring urgent decompression')).toBe(true);
      expect(RadiologyService._hasCriticalIndicators('Comminuted fracture of distal radius')).toBe(true);
    });

    it('returns false for normal unremarkable findings', () => {
      expect(RadiologyService._hasCriticalIndicators('Normal chest radiograph with clear lungs and normal cardiac silhouette')).toBe(false);
      expect(RadiologyService._hasCriticalIndicators('Unremarkable ultrasound study with no pathology')).toBe(false);
      expect(RadiologyService._hasCriticalIndicators('Normal study. No intervention required.')).toBe(false);
    });
  });

  describe('Radiology Creation Authorization', () => {
    it('rejects NURSE role when attempting to create official radiology records', async () => {
      const nurseUser = {
        _id: '507f1f77bcf86cd799439011',
        role: 'NURSE',
      };
      
      await expect(
        RadiologyService.createRadiologyRecord(
          { patientId: '507f1f77bcf86cd799439012', hospitalId: '507f1f77bcf86cd799439013' },
          nurseUser
        )
      ).rejects.toThrow('Only doctors and radiology technicians can create radiology records');
    });

    it('rejects PATIENT role when attempting to create official radiology records', async () => {
      const patientUser = {
        _id: '507f1f77bcf86cd799439014',
        role: 'PATIENT',
      };
      
      await expect(
        RadiologyService.createRadiologyRecord(
          { patientId: '507f1f77bcf86cd799439014', hospitalId: '507f1f77bcf86cd799439013' },
          patientUser
        )
      ).rejects.toThrow('Only doctors and radiology technicians can create radiology records');
    });

    it('rejects NURSE role when attempting to amend radiology records', async () => {
      const nurseUser = {
        _id: '507f1f77bcf86cd799439011',
        role: 'NURSE',
      };
      
      // Attempting amendment as nurse
      await expect(
        RadiologyService.updateRadiologyRecord(
          '507f1f77bcf86cd799439015',
          { reason: 'Nurse note' },
          nurseUser
        )
      ).rejects.toThrow();
    });
  });
});
