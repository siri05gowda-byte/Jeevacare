import { describe, it, expect, beforeEach } from 'vitest';
import MedicalImageAnalyzer from '../MedicalImageAnalyzer.js';

describe('MedicalImageAnalyzer - Singleton Pattern', () => {
  // MedicalImageAnalyzer is exported as a singleton instance, not a class
  // All methods are called on the singleton directly

  describe('detectModality', () => {
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

});
