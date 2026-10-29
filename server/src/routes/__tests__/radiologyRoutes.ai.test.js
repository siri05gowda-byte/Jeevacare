import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import radiologyRoutes from '../radiologyRoutes.js';
import RadiologyAIService from '../../services/RadiologyAIService.js';
import RadiologyService from '../../services/RadiologyService.js';

let mockUser = {
  _id: 'user123',
  id: 'user123',
  name: 'Dr. Test',
  role: 'DOCTOR',
  facilityId: 'facility123',
};
let authError = null;
let roleError = null;

// Mock authentication middleware
vi.mock('../../middleware/authentication.js', () => ({
  authMiddleware: (req, res, next) => {
    if (authError) {
      return res.status(authError.status || 401).json({ success: false, message: authError.message || 'Unauthorized' });
    }
    req.user = { ...mockUser };
    req.token = 'mock-token';
    next();
  },
  requireRole: (...allowedRoles) => {
    const roles = allowedRoles.flat();
    return (req, res, next) => {
      if (roleError) {
        return res.status(roleError.status || 403).json({ success: false, message: roleError.message || 'Forbidden' });
      }
      if (!req.user || !roles.includes(req.user.role)) {
        return res.status(403).json({ success: false, message: 'Forbidden' });
      }
      next();
    };
  },
}));

vi.mock('../../services/GoogleSheetsService.js', () => ({
  default: {
    recordMedicalReport: vi.fn().mockResolvedValue({}),
  },
}));

const app = express();
app.use(express.json());
app.use('/api/radiology', radiologyRoutes);

describe('Radiology AI Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authError = null;
    roleError = null;
    mockUser = {
      _id: 'user123',
      id: 'user123',
      name: 'Dr. Test',
      role: 'DOCTOR',
      facilityId: 'facility123',
    };

    // Default radiology record mock
    vi.spyOn(RadiologyService, 'getRadiologyRecord').mockResolvedValue({
      _id: 'rad123',
      patientId: 'patient123',
      hospitalId: 'facility123',
      modalityType: 'x_ray',
      bodyPart: 'chest',
      imageReference: {
        cloudinaryUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg',
      },
      toObject: () => ({ _id: 'rad123' }),
    });
  });

  describe('POST /api/radiology/:radiologyId/analyze-image', () => {
    it('should successfully trigger AI analysis', async () => {
      const mockAnalysisResult = {
        success: true,
        cached: false,
        analysis: {
          status: 'completed',
          model: 'TorchXRayVision-resnet50-res512-all',
          detectedModality: 'chest_xray',
          findings: [{ pathology: 'Cardiomegaly', confidence: 0.85 }],
          summary: 'Normal cardiac silhouette',
          explanation: 'Patient explanation',
          confidence: 0.85,
          isMockData: false,
          analyzedAt: new Date(),
        },
        disclaimers: ['This analysis is AI-generated and NOT a medical diagnosis.'],
        message: 'Analysis completed successfully',
      };

      vi.spyOn(RadiologyAIService, 'analyzeRadiologyImage').mockResolvedValue(mockAnalysisResult);

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('completed');
      expect(response.body.data.findings).toHaveLength(1);
      expect(RadiologyAIService.analyzeRadiologyImage).toHaveBeenCalledWith(
        'rad123',
        expect.objectContaining({ _id: 'user123', role: 'DOCTOR' }),
        { language: 'en' }
      );
    });

    it('should support language option', async () => {
      const mockAnalysisResult = {
        success: true,
        cached: false,
        analysis: {
          status: 'completed',
          model: 'TorchXRayVision-resnet50-res512-all',
          detectedModality: 'chest_xray',
          findings: [{ pathology: 'सामान्य', confidence: 0.90 }],
          summary: 'सामान्य छाती एक्स-रे',
          confidence: 0.90,
          isMockData: true,
          analyzedAt: new Date(),
        },
        disclaimers: ['This analysis is AI-generated and NOT a medical diagnosis.'],
        message: 'Analysis completed successfully',
      };

      vi.spyOn(RadiologyAIService, 'analyzeRadiologyImage').mockResolvedValue(mockAnalysisResult);

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .send({ language: 'hi' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.language).toBe('hi');
      expect(RadiologyAIService.analyzeRadiologyImage).toHaveBeenCalledWith(
        'rad123',
        expect.objectContaining({ _id: 'user123' }),
        { language: 'hi' }
      );
    });

    it('should handle unsupported modality', async () => {
      const mockAnalysisResult = {
        success: false,
        cached: false,
        analysis: {
          status: 'unsupported_modality',
          detectedModality: 'ct_scan',
          findings: [],
          summary: '',
          confidence: 0,
        },
        message: 'Automated deep-learning interpretation is not available for ct_scan',
      };

      vi.spyOn(RadiologyAIService, 'analyzeRadiologyImage').mockResolvedValue(mockAnalysisResult);

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(200);

      expect(response.body.data.status).toBe('unsupported_modality');
      expect(response.body.message).toContain('not available for ct_scan');
    });

    it('should handle missing radiology record', async () => {
      vi.spyOn(RadiologyService, 'getRadiologyRecord').mockRejectedValue(
        new Error('Radiology record not found: invalid123')
      );

      const response = await request(app)
        .post('/api/radiology/invalid123/analyze-image')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('not found');
    });

    it('should handle missing image reference', async () => {
      vi.spyOn(RadiologyService, 'getRadiologyRecord').mockResolvedValue({
        _id: 'rad123',
        imageReference: null,
      });

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('No image attached');
    });

    it('should handle analysis failure', async () => {
      vi.spyOn(RadiologyAIService, 'analyzeRadiologyImage').mockRejectedValue(
        new Error('Failed to analyze radiology image: inference crash')
      );

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Failed to analyze');
    });

    it('should require authentication', async () => {
      authError = { status: 401, message: 'Unauthorized' };

      await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(401);
    });
  });

  describe('GET /api/radiology/:radiologyId/ai-status', () => {
    it('should return analysis status when completed', async () => {
      const mockStatus = {
        status: 'completed',
        model: 'TorchXRayVision-resnet50-res512-all',
        detectedModality: 'chest_xray',
        findings: ['Normal cardiac silhouette'],
        isMockData: false,
      };

      vi.spyOn(RadiologyAIService, 'getAnalysisStatus').mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
      expect(RadiologyAIService.getAnalysisStatus).toHaveBeenCalledWith('rad123');
    });

    it('should return not_analyzed status when no analysis exists', async () => {
      const mockStatus = { status: 'not_analyzed' };

      vi.spyOn(RadiologyAIService, 'getAnalysisStatus').mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('not_analyzed');
    });

    it('should handle missing radiology record', async () => {
      vi.spyOn(RadiologyService, 'getRadiologyRecord').mockRejectedValue(
        new Error('Radiology record not found: invalid123')
      );

      const response = await request(app)
        .get('/api/radiology/invalid123/ai-status')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      authError = { status: 401, message: 'Unauthorized' };

      await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(401);
    });
  });

  describe('GET /api/radiology/ai-service-status', () => {
    it('should return service capabilities when healthy', async () => {
      const mockServiceStatus = {
        service: 'Radiology AI Service',
        available: true,
        healthy: true,
        mode: 'production_real_inference',
        supportedModalities: ['chest_xray'],
        capabilities: {
          imageAnalysis: true,
        },
      };

      vi.spyOn(RadiologyAIService, 'getServiceStatus').mockReturnValue(mockServiceStatus);

      const response = await request(app)
        .get('/api/radiology/ai-service-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.available).toBe(true);
      expect(response.body.data.supportedModalities).toContain('chest_xray');
    });

    it('should handle service check failure', async () => {
      vi.spyOn(RadiologyAIService, 'getServiceStatus').mockImplementation(() => {
        throw new Error('Service unavailable');
      });

      const response = await request(app)
        .get('/api/radiology/ai-service-status')
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });
});
