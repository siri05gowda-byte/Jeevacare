import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

class CloudinaryAdapter {
  constructor() {
    this.isConfigured = !!(
      config.cloudinary.cloudName &&
      config.cloudinary.apiKey &&
      config.cloudinary.apiSecret
    );

    if (this.isConfigured) {
      // In a real implementation, we would import and initialize the Cloudinary SDK
      // For now, this is a stub
      logger.info('Cloudinary adapter initialized');
    } else {
      logger.warn('Cloudinary adapter not configured. Operating in demo mode.');
    }
  }

  /**
   * Upload file to Cloudinary
   * In production: returns { publicId, url, secureUrl, ...metadata }
   * In demo mode: returns mock response
   */
  async uploadFile(file, options = {}) {
    try {
      if (!this.isConfigured) {
        return this.mockUploadResponse(file);
      }

      // Real Cloudinary upload would happen here
      // For now, returning mock for development
      return this.mockUploadResponse(file);
    } catch (error) {
      logger.error(`Cloudinary upload error: ${error.message}`);
      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId) {
    try {
      if (!this.isConfigured) {
        logger.info(`[DEMO] Deleted file: ${publicId}`);
        return { success: true, publicId };
      }

      // Real deletion would happen here
      return { success: true, publicId };
    } catch (error) {
      logger.error(`Cloudinary delete error: ${error.message}`);
      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Get file metadata
   */
  async getFileMetadata(publicId) {
    try {
      if (!this.isConfigured) {
        return this.mockFileMetadata(publicId);
      }

      // Real metadata fetch would happen here
      return this.mockFileMetadata(publicId);
    } catch (error) {
      logger.error(`Cloudinary metadata fetch error: ${error.message}`);
      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Mock upload response for development/demo
   */
  mockUploadResponse(file) {
    const mockPublicId = `jeevacare/demo/${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return {
      publicId: mockPublicId,
      url: `http://res.cloudinary.com/demo/image/upload/${mockPublicId}.jpg`,
      secureUrl: `https://res.cloudinary.com/demo/image/upload/${mockPublicId}.jpg`,
      format: file.mimetype?.split('/')[1] || 'jpg',
      resourceType: 'image',
      bytes: file.size || 0,
      width: 800,
      height: 600,
      uploadedAt: new Date(),
      isDemo: true,
    };
  }

  /**
   * Mock file metadata
   */
  mockFileMetadata(publicId) {
    return {
      publicId,
      url: `https://res.cloudinary.com/demo/image/upload/${publicId}.jpg`,
      resourceType: 'image',
      bytes: 102400,
      format: 'jpg',
      uploadedAt: new Date(),
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
      provider: 'Cloudinary',
    };
  }
}

export default new CloudinaryAdapter();
