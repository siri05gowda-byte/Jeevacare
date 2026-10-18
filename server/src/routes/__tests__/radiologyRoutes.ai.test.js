const request = require('supertest');
const express = require('express');
const radiologyRoutes = require('../radiologyRoutes');
const RadiologyAIService = require('../../services/RadiologyAIService');
const { requireAuth, requireRole } = require('../../middleware/auth');

jest.mock('../../services/RadiologyAIService');
jest.mock('../../middleware/auth');

describe('Radiology AI Routes', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    jest.clearAllMocks();

    mockUser = {
      _id: 'user123',
      name: 'Dr. Test',
      role: 'DOCTOR'
    };

    // Mock auth middleware
    requireAuth.mockImplementation((req, res, next) => {
      req.user = mockUser;
      next();
    });

    requireRole.mockImplementation(() => (req, res, next) => next());

    // Setup express app with routes
    app = express();
    app.use(express.json());
    app.use('/api/radiology', radiologyRoutes);
  });

  describe('POST /api/radiology/:radiologyId/analyze-image', () => {
    it('should successfully trigger AI analysis', async () => {
      const mockAnalysis = {
        status: 'completed',
        model: 'mock',
        detectedModality: 'chest_xray',
        findings: ['Normal cardiac silhouette', 'Clear lung fields'],
        summary: 'Normal chest X-ray',
        confidence: 0.85,
        isMockData: true,
        disclaimers: ['AI-generated analysis']
      };

      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockAnalysis);
      expect(RadiologyAIService.analyzeRadiologyImage).toHaveBeenCalledWith(
        'rad123',
        mockUser,
        {}
      );
    });

    it('should support language option', async () => {
      const mockAnalysis = {
        status: 'completed',
        model: 'mock',
        detectedModality: 'chest_xray',
        findings: ['सामान्य'],
        language: 'hi',
        isMockData: true
      };

      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .send({ language: 'hi' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.language).toBe('hi');
      expect(RadiologyAIService.analyzeRadiologyImage).toHaveBeenCalledWith(
        'rad123',
        mockUser,
        { language: 'hi' }
      );
    });

    it('should handle unsupported modality', async () => {
      const mockAnalysis = {
        status: 'unsupported_modality',
        detectedModality: 'ct_scan',
        error: 'CT Scan analysis is not yet supported'
      };

      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('unsupported_modality');
      expect(response.body.data.error).toContain('not yet supported');
    });

    it('should handle missing radiology record', async () => {
      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockRejectedValue(
        new Error('Radiology record not found')
      );

      const response = await request(app)
        .post('/api/radiology/invalid123/analyze-image')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('not found');
    });

    it('should handle missing image reference', async () => {
      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockRejectedValue(
        new Error('No image available for analysis')
      );

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('No image available');
    });

    it('should handle analysis failure', async () => {
      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockRejectedValue(
        new Error('Analysis engine error')
      );

      const response = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to analyze');
    });

    it('should require authentication', async () => {
      requireAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(401);
    });

    it('should require appropriate role', async () => {
      requireRole.mockImplementation(() => (req, res, next) => {
        res.status(403).json({ message: 'Forbidden' });
      });

      await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(403);
    });
  });

  describe('GET /api/radiology/:radiologyId/ai-status', () => {
    it('should return analysis status when completed', async () => {
      const mockStatus = {
        status: 'completed',
        model: 'mock',
        detectedModality: 'chest_xray',
        findings: ['Normal'],
        isMockData: true
      };

      RadiologyAIService.getAnalysisStatus = jest.fn().mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockStatus);
      expect(RadiologyAIService.getAnalysisStatus).toHaveBeenCalledWith('rad123');
    });

    it('should return not_analyzed status when no analysis exists', async () => {
      const mockStatus = { status: 'not_analyzed' };

      RadiologyAIService.getAnalysisStatus = jest.fn().mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('not_analyzed');
    });

    it('should handle analyzing status', async () => {
      const mockStatus = { status: 'analyzing' };

      RadiologyAIService.getAnalysisStatus = jest.fn().mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(response.body.data.status).toBe('analyzing');
    });

    it('should handle failed status', async () => {
      const mockStatus = {
        status: 'failed',
        error: 'Analysis failed'
      };

      RadiologyAIService.getAnalysisStatus = jest.fn().mockResolvedValue(mockStatus);

      const response = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(response.body.data.status).toBe('failed');
      expect(response.body.data.error).toBeDefined();
    });

    it('should handle missing radiology record', async () => {
      RadiologyAIService.getAnalysisStatus = jest.fn().mockRejectedValue(
        new Error('Radiology record not found')
      );

      const response = await request(app)
        .get('/api/radiology/invalid123/ai-status')
        .expect(404);

      expect(response.body.success).toBe(false);
    });

    it('should require authentication', async () => {
      requireAuth.mockImplementation((req, res, next) => {
        res.status(401).json({ message: 'Unauthorized' });
      });

      await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(401);
    });
  });

  describe('GET /api/radiology/ai-service-status', () => {
    it('should return service capabilities when healthy', async () => {
      const mockServiceStatus = {
        available: true,
        mode: 'mock',
        supportedModalities: ['chest_xray'],
        supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
        healthy: true
      };

      RadiologyAIService.getServiceStatus = jest.fn().mockResolvedValue(mockServiceStatus);

      const response = await request(app)
        .get('/api/radiology/ai-service-status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockServiceStatus);
      expect(response.body.data.available).toBe(true);
      expect(response.body.data.supportedModalities).toContain('chest_xray');
    });

    it('should report unhealthy service', async () => {
      const mockServiceStatus = {
        available: true,
        mode: 'mock',
        supportedModalities: ['chest_xray'],
        supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
        healthy: false
      };

      RadiologyAIService.getServiceStatus = jest.fn().mockResolvedValue(mockServiceStatus);

      const response = await request(app)
        .get('/api/radiology/ai-service-status')
        .expect(200);

      expect(response.body.data.healthy).toBe(false);
    });

    it('should handle service check failure', async () => {
      RadiologyAIService.getServiceStatus = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/radiology/ai-service-status')
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should not require authentication (public status endpoint)', async () => {
      // This endpoint might be public to check service status
      const mockServiceStatus = {
        available: true,
        mode: 'mock',
        healthy: true
      };

      RadiologyAIService.getServiceStatus = jest.fn().mockResolvedValue(mockServiceStatus);

      const response = await request(app)
        .get('/api/radiology/ai-service-status')
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle full workflow: trigger analysis -> check status -> get results', async () => {
      // Step 1: Trigger analysis
      const mockAnalysis = {
        status: 'completed',
        model: 'mock',
        detectedModality: 'chest_xray',
        findings: ['Normal'],
        isMockData: true
      };

      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockResolvedValue(mockAnalysis);

      const analyzeResponse = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(200);

      expect(analyzeResponse.body.success).toBe(true);

      // Step 2: Check status
      RadiologyAIService.getAnalysisStatus = jest.fn().mockResolvedValue(mockAnalysis);

      const statusResponse = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(statusResponse.body.data.status).toBe('completed');
      expect(statusResponse.body.data.findings).toBeDefined();
    });

    it('should handle unsupported modality workflow', async () => {
      // Attempt to analyze CT scan
      const mockAnalysis = {
        status: 'unsupported_modality',
        detectedModality: 'ct_scan',
        error: 'CT Scan analysis is not yet supported'
      };

      RadiologyAIService.analyzeRadiologyImage = jest.fn().mockResolvedValue(mockAnalysis);

      const analyzeResponse = await request(app)
        .post('/api/radiology/rad123/analyze-image')
        .expect(200);

      expect(analyzeResponse.body.data.status).toBe('unsupported_modality');

      // Check status confirms unsupported
      RadiologyAIService.getAnalysisStatus = jest.fn().mockResolvedValue(mockAnalysis);

      const statusResponse = await request(app)
        .get('/api/radiology/rad123/ai-status')
        .expect(200);

      expect(statusResponse.body.data.status).toBe('unsupported_modality');
      expect(statusResponse.body.data.findings).toBeUndefined();
    });
  });
});
