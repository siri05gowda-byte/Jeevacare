import TesseractOCRAdapter from './TesseractOCRAdapter.js';
import logger from '../utils/logger.js';

/**
 * OCRAdapter — Provider abstraction layer
 * 
 * Routes OCR requests to the configured provider implementation.
 * Currently uses TesseractOCRAdapter for real OCR processing.
 * 
 * Can be extended to support additional providers:
 * - Google Vision API
 * - Azure Computer Vision
 * - AWS Textract
 * - Other cloud/local OCR services
 */
class OCRAdapter {
  constructor() {
    // Use Tesseract as the default provider
    this.provider = TesseractOCRAdapter;
    this.providerName = 'Tesseract.js (Real OCR)';
    logger.info(`OCRAdapter initialized with provider: ${this.providerName}`);
  }

  /**
   * Extract text from document/image using the configured provider
   */
  async extractText(imageBuffer, options = {}) {
    try {
      return await this.provider.extractText(imageBuffer, options);
    } catch (error) {
      logger.error(`OCR extraction error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Assess document quality using the configured provider
   */
  async assessQuality(imageBuffer, options = {}) {
    try {
      return await this.provider.assessQuality(imageBuffer, options);
    } catch (error) {
      logger.error(`Quality assessment error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect document orientation using the configured provider
   */
  async detectOrientation(imageBuffer, options = {}) {
    try {
      return await this.provider.detectOrientation(imageBuffer, options);
    } catch (error) {
      logger.error(`Orientation detection error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get provider status
   */
  getStatus() {
    return {
      provider: this.providerName,
      status: this.provider.getStatus(),
    };
  }
}

export default new OCRAdapter();
