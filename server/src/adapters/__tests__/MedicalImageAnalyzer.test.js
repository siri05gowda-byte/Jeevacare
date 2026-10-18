import { describe, it, expect, beforeEach } from 'vitest';
import MedicalImageAnalyzer from '../MedicalImageAnalyzer.js';

describe('MedicalImageAnalyzer - Singleton Pattern', () => {
  // MedicalImageAnalyzer is exported as a singleton instance, not a class
  // All methods are called on the singleton directly

  describe('detectModality', () => {
    it('should detect chest X-ray from filename', async () => {
      const result = await MedicalImageAnalyzer.detectModality(Buffer.from(''), { 
        filename: 'chest_xray_2024.jpg' 
      });
      expect(result.modality).toBe('chest_xray');
      expect(result.supported).toBe(true);
    });

    it('should detect CT scan from filename', async () => {
      const result = await MedicalImageAnalyzer.detectModality(Buffer.from(''), { 
        filename: 'ct_scan_head.dcm' 
      });
      expect(result.modality).toBe('ct_scan');
      expect(result.supported).toBe(false);
    });

    it('should detect MRI from filename', async () => {
      const result = await MedicalImageAnalyzer.detectModality(Buffer.from(''), { 
        filename: 'mri_brain_2024.dcm' 
      });
      expect(result.modality).toBe('mri');
      expect(result.supported).toBe(false);
    });

    it('should detect ultrasound from filename', async () => {
      const result = await MedicalImageAnalyzer.detectModality(Buffer.from(''), { 
        filename: 'ultrasound_abdomen.jpg' 
      });
      expect(result.modality).toBe('ultrasound');
      expect(result.supported).toBe(false);
    });

    it('should return unknown for unrecognizable filename', async () => {
      const result = await MedicalImageAnalyzer.detectModality(Buffer.from(''), { 
        filename: 'random_image.jpg' 
      });
      expect(result.modality).toBe('unknown');
      expect(result.supported).toBe(false);
    });

    it('should return unknown when no metadata provided', async () => {
      const result = await MedicalImageAnalyzer.detectModality(Buffer.from(''));
      expect(result.modality).toBe('unknown');
      expect(result.supported).toBe(false);
    });
  });

  describe('analyzeImage - Mock Mode', () => {
    it('should return mock analysis for supported modality (chest X-ray)', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'chest_xray.jpg', mimeType: 'image/jpeg' },
        detectedModality: { modality: 'chest_xray', supported: true },
        language: 'en'
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.model).toMatch(/^mock/);  // Any mock model identifier
      expect(result.modality).toBe('chest_xray');
      expect(result.isMockData).toBe(true);
      expect(result.findings).toBeInstanceOf(Array);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.summary).toBeDefined();
      expect(result.patientFriendlyExplanation).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.disclaimers).toBeInstanceOf(Array);
      expect(result.disclaimers.length).toBeGreaterThan(0);
      expect(result.limitations).toBeInstanceOf(Array);
    });

    it('should return unsupported status for CT scan', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'ct_head.dcm', mimeType: 'application/dicom' },
        detectedModality: { modality: 'ct_scan', supported: false, reason: 'CT analysis not yet implemented' },
        language: 'en'
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('unsupported_modality');
      expect(result.modality).toBe('ct_scan');
      expect(result.isMockData).toBeUndefined();
      expect(result.findings).toBeUndefined();
    });

    it('should return unsupported status for MRI', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'mri_brain.dcm' },
        detectedModality: { modality: 'mri', supported: false }
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('unsupported_modality');
      expect(result.modality).toBe('mri');
    });

    it('should return unsupported status for unknown modality', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'random.jpg' },
        detectedModality: { modality: 'unknown', supported: false }
      });

      expect(result.success).toBe(false);
      expect(result.status).toBe('unsupported_modality');
      expect(result.modality).toBe('unknown');
    });

    it('should support Hindi language in mock analysis', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'chest_xray.jpg' },
        detectedModality: { modality: 'chest_xray', supported: true },
        language: 'hi'
      });

      expect(result.success).toBe(true);
      expect(result.status).toBe('completed');
      expect(result.language).toBe('hi');
      expect(result.summary).toContain('छाती');
      expect(result.patientFriendlyExplanation).toBeDefined();
    });

    it('should default to English when language not specified', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'chest_xray.jpg' },
        detectedModality: { modality: 'chest_xray', supported: true }
      });

      expect(result.success).toBe(true);
      expect(result.language).toBe('en');
      // Mock or real mode - check for expected summary content
      expect(
        result.summary.includes('chest') || 
        result.summary.includes('Mock analysis') ||
        result.summary.includes('abnormalities')
      ).toBe(true);
    });
  });

  describe('getDisclaimers', () => {
    it('should return array of disclaimer messages', () => {
      const disclaimers = MedicalImageAnalyzer.getDisclaimers();

      expect(disclaimers).toBeInstanceOf(Array);
      expect(disclaimers.length).toBeGreaterThan(0);
      expect(disclaimers.some(d => d.includes('AI-generated'))).toBe(true);
      expect(disclaimers.some(d => d.includes('qualified radiologist') || d.includes('healthcare professional'))).toBe(true);
    });
  });

  describe('getSupportedModalities', () => {
    it('should return array of supported modalities', () => {
      const modalities = MedicalImageAnalyzer.getSupportedModalities();
      expect(modalities).toBeInstanceOf(Array);
      expect(modalities).toContain('chest_xray');
    });
  });

  describe('healthCheck', () => {
    it('should return health status', async () => {
      const health = await MedicalImageAnalyzer.healthCheck();
      expect(health.service).toBe('Medical Image Analyzer');
      expect(health.status).toBeDefined();
      expect(health.supportedModalities).toBeInstanceOf(Array);
      expect(health.limitations).toBeInstanceOf(Array);
    });
  });

  describe('getStatus', () => {
    it('should return analyzer status', () => {
      const status = MedicalImageAnalyzer.getStatus();
      expect(status.enabled).toBeDefined();
      expect(status.initialized).toBeDefined();
      expect(status.mode).toBeDefined();
      expect(status.supportedModalities).toBeInstanceOf(Array);
    });
  });

  describe('Mock Data Flags', () => {
    it('should always include isMockData: true for supported modalities', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'chest_xray.jpg' },
        detectedModality: { modality: 'chest_xray', supported: true }
      });

      expect(result.isMockData).toBe(true);
    });

    it('should use "mock" model identifier', async () => {
      const result = await MedicalImageAnalyzer.analyzeImage('http://fake-url.jpg', {
        metadata: { filename: 'chest_xray.jpg' },
        detectedModality: { modality: 'chest_xray', supported: true }
      });

      expect(result.model).toContain('mock');
    });
  });
});
