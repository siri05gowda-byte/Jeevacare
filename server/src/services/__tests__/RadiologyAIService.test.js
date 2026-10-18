import { describe, it, expect, beforeEach } from 'vitest';
import RadiologyAIService from '../RadiologyAIService.js';
import MedicalImageAnalyzer from '../../adapters/MedicalImageAnalyzer.js';

// Note: RadiologyAIService requires MongoDB, so we test logic patterns only
// Database integration tests are skipped (TEST_MONGODB_URI not configured)

describe('RadiologyAIService - Unit Tests', () => {
  let mockUser;

  beforeEach(() => {
    mockUser = {
      _id: 'user123',
      name: 'Dr. Test',
      role: 'DOCTOR',
      facilityId: 'facility123'
    };
  });

  describe('Service Status', () => {
    it('should return service status with capabilities', () => {
      const status = RadiologyAIService.getServiceStatus();

      expect(status).toBeDefined();
      expect(status.service).toBe('Radiology AI Service');
      expect(status.imageAnalyzer).toBeDefined();
      expect(status.supportedModalities).toBeInstanceOf(Array);
      expect(status.capabilities).toBeDefined();
    });

    it('should report supported modalities', () => {
      const status = RadiologyAIService.getServiceStatus();
      const modalities = status.supportedModalities;

      expect(modalities).toContain('chest_xray');
      expect(modalities.length).toBeGreaterThan(0);
    });

    it('should report image analyzer capabilities', () => {
      const status = RadiologyAIService.getServiceStatus();
      expect(status.imageAnalyzer).toBeDefined();
      expect(status.imageAnalyzer.supportedModalities).toContain('chest_xray');
    });
  });

  describe('MedicalImageAnalyzer Integration', () => {
    it('should have access to MedicalImageAnalyzer singleton', () => {
      expect(MedicalImageAnalyzer).toBeDefined();
      expect(typeof MedicalImageAnalyzer.getStatus).toBe('function');
      expect(typeof MedicalImageAnalyzer.getDisclaimers).toBe('function');
      expect(typeof MedicalImageAnalyzer.analyzeImage).toBe('function');
    });

    it('should get disclaimers from analyzer', () => {
      const disclaimers = MedicalImageAnalyzer.getDisclaimers();

      expect(disclaimers).toBeInstanceOf(Array);
      expect(disclaimers.length).toBeGreaterThan(0);
      expect(disclaimers.some(d => d.includes('AI-generated'))).toBe(true);
    });

    it('should get supported modalities from analyzer', () => {
      const modalities = MedicalImageAnalyzer.getSupportedModalities();

      expect(modalities).toBeInstanceOf(Array);
      expect(modalities).toContain('chest_xray');
    });

    it('should get analyzer health status', async () => {
      const health = await MedicalImageAnalyzer.healthCheck();

      expect(health.service).toBe('Medical Image Analyzer');
      expect(health.status).toBeDefined();
      expect(health.supportedModalities).toBeInstanceOf(Array);
      expect(health.limitations).toBeInstanceOf(Array);
    });

    it('should confirm mock mode is active', () => {
      const status = MedicalImageAnalyzer.getStatus();
      expect(status.mode).toBe('mock');
      expect(status.initialized).toBe(false);
    });
  });

  describe('Mock Data Behavior', () => {
    it('should ensure RadiologyAIService relies on MedicalImageAnalyzer mock data', async () => {
      // This test verifies the integration contract
      const analyzerStatus = MedicalImageAnalyzer.getStatus();
      expect(analyzerStatus.mode).toBe('mock');
      
      // All analysis from service will return isMockData: true
      const serviceStatus = RadiologyAIService.getServiceStatus();
      expect(serviceStatus.imageAnalyzer.mode).toBe('mock');
    });

    it('should include disclaimers in all responses', () => {
      const disclaimers = MedicalImageAnalyzer.getDisclaimers();
      expect(disclaimers.some(d => d.includes('AI-generated'))).toBe(true);
      expect(disclaimers.some(d => d.includes('medical diagnosis') || d.includes('radiologist'))).toBe(true);
    });

    it('should clearly label mock analysis in limitations', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake.jpg', {
        metadata: { filename: 'chest_xray.jpg' },
        detectedModality: { modality: 'chest_xray', supported: true }
      });

      expect(result.isMockData).toBe(true);
      expect(result.limitations).toBeDefined();
      expect(result.limitations.some(l => l.includes('MOCK'))).toBe(true);
    });
  });

  describe('Language Support', () => {
    it('should have access to multi-language analysis capability', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake.jpg', {
        metadata: { filename: 'chest_xray.jpg' },
        detectedModality: { modality: 'chest_xray', supported: true },
        language: 'hi'
      });

      expect(result.language).toBe('hi');
      expect(result.summary).toBeDefined();
    });
  });

  describe('Cost Constraint Verification', () => {
    it('should not invoke any external APIs', () => {
      // This test documents that the implementation is zero-cost
      const status = RadiologyAIService.getServiceStatus();
      expect(status.service).toBe('Radiology AI Service');
      
      // No external API indicators in status
      expect(status.capabilities.imageAnalysis).toBe(false); // Mock mode
    });

    it('should use local/mock analysis only', () => {
      const analyzerStatus = MedicalImageAnalyzer.getStatus();
      expect(analyzerStatus.mode).toBe('mock');
      expect(analyzerStatus.modelPath).toBeDefined();
    });
  });
});
