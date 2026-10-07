import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

class OCRAdapter {
  constructor() {
    this.isConfigured = config.ocrService.enabled;
    this.url = config.ocrService.url;

    if (this.isConfigured) {
      logger.info('OCR adapter initialized');
    } else {
      logger.warn('OCR adapter not enabled. Operating in demo mode.');
    }
  }

  /**
   * Extract text from document/image
   */
  async extractText(imageBuffer, options = {}) {
    try {
      if (!this.isConfigured) {
        return this.mockTextExtraction(imageBuffer, options);
      }

      // Real OCR extraction would happen here
      return this.mockTextExtraction(imageBuffer, options);
    } catch (error) {
      logger.error(`OCR extraction error: ${error.message}`);
      throw new ExternalServiceError('OCR Service', error.message);
    }
  }

  /**
   * Assess document quality
   */
  async assessQuality(imageBuffer, options = {}) {
    try {
      if (!this.isConfigured) {
        return this.mockQualityAssessment(imageBuffer, options);
      }

      // Real quality assessment would happen here
      return this.mockQualityAssessment(imageBuffer, options);
    } catch (error) {
      logger.error(`Quality assessment error: ${error.message}`);
      throw new ExternalServiceError('OCR Service', error.message);
    }
  }

  /**
   * Detect document orientation
   */
  async detectOrientation(imageBuffer) {
    try {
      if (!this.isConfigured) {
        return { orientation: 0, confidence: 0.95 };
      }

      // Real orientation detection would happen here
      return { orientation: 0, confidence: 0.95 };
    } catch (error) {
      logger.error(`Orientation detection error: ${error.message}`);
      throw new ExternalServiceError('OCR Service', error.message);
    }
  }

  /**
   * Mock text extraction
   */
  mockTextExtraction(imageBuffer, options = {}) {
    return {
      extractedText:
        'Patient Name: DEMO PATIENT\nDate: 2024-10-07\nDiagnosis: [Sample diagnosis]\nPrescription: [Sample medication]',
      confidence: 0.85,
      languages: ['en'],
      detectedFields: {
        patientName: 'DEMO PATIENT',
        date: '2024-10-07',
        providerName: 'Dr. Sample',
      },
      extractedAt: new Date(),
      isDemo: true,
      warnings: [
        'This is mock OCR output for development purposes',
        'Always verify extracted information with original documents',
      ],
    };
  }

  /**
   * Mock quality assessment
   */
  mockQualityAssessment(imageBuffer, options = {}) {
    const issues = [];
    const score = 85;

    return {
      score,
      quality: score > 80 ? 'good' : score > 50 ? 'fair' : 'poor',
      issues,
      feedback: 'Document quality is acceptable for OCR processing',
      recommendations: [
        'Ensure good lighting when capturing documents',
        'Hold document flat and parallel to camera',
        'Avoid glare and reflections',
      ],
      assessedAt: new Date(),
      isDemo: true,
    };
  }

  /**
   * Check if adapter is in demo mode
   */
  isDemoMode() {
    return !this.isConfigured;
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? 'production' : 'demo',
      provider: 'OCR Service',
      url: this.url,
    };
  }
}

export default new OCRAdapter();
