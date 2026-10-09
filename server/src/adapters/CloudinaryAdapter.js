import cloudinary from 'cloudinary';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError, ValidationError } from '../utils/errors.js';

/**
 * CloudinaryAdapter - Real document and image storage integration
 * Handles uploads, deletions, metadata retrieval with proper error handling
 */
class CloudinaryAdapter {
  constructor() {
    this.isConfigured = !!(
      config.cloudinary.cloudName &&
      config.cloudinary.apiKey &&
      config.cloudinary.apiSecret
    );

    if (this.isConfigured) {
      // Initialize Cloudinary SDK with credentials from config
      cloudinary.config({
        cloud_name: config.cloudinary.cloudName,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret,
      });

      logger.info('✓ Cloudinary adapter initialized and configured');
    } else {
      logger.warn(
        '⚠ Cloudinary not configured (missing CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, or CLOUDINARY_API_SECRET). Operating in demo mode.'
      );
    }
  }

  /**
   * Upload file to Cloudinary
   * @param {Buffer} fileBuffer - File content as buffer
   * @param {Object} options - Upload options { folder, resourceType, fileName, ...}
   * @returns {Object} { publicId, url, secureUrl, format, bytes, resourceType }
   */
  async uploadFile(fileBuffer, options = {}) {
    try {
      if (!this.isConfigured) {
        logger.warn('[DEMO MODE] Cloudinary upload would require real credentials');
        return this.mockUploadResponse(fileBuffer, options);
      }

      // Validate input
      if (!fileBuffer || fileBuffer.length === 0) {
        throw new ValidationError('File buffer is empty');
      }

      if (fileBuffer.length > 100 * 1024 * 1024) {
        // 100MB limit
        throw new ValidationError('File exceeds 100MB limit');
      }

      const folder = options.folder || 'jeevacare/documents';
      const resourceType = options.resourceType || 'auto';
      const fileName =
        options.fileName || `document-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

      logger.info(`Uploading file to Cloudinary: ${folder}/${fileName}`);

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.v2.uploader.upload_stream(
          {
            folder,
            resource_type: resourceType,
            public_id: fileName,
            overwrite: false, // Prevent accidental overwrites
            invalidate: false, // No CDN cache invalidation needed for medical docs
            secure: true, // Always use HTTPS
            // Metadata for clinical documents
            tags: [
              'jeevacare',
              'clinical-document',
              options.documentType || 'general',
            ],
            context: {
              documentType: options.documentType || 'clinical',
              uploadedAt: new Date().toISOString(),
            },
          },
          (error, result) => {
            if (error) {
              logger.error(`Cloudinary upload failed: ${error.message}`);
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        // Write buffer to stream
        uploadStream.end(fileBuffer);
      });

      logger.info(
        `✓ File uploaded successfully: ${uploadResult.public_id} (${uploadResult.bytes} bytes)`
      );

      return {
        publicId: uploadResult.public_id,
        url: uploadResult.url,
        secureUrl: uploadResult.secure_url,
        format: uploadResult.format,
        bytes: uploadResult.bytes,
        resourceType: uploadResult.resource_type,
        width: uploadResult.width,
        height: uploadResult.height,
        createdAt: uploadResult.created_at,
        version: uploadResult.version,
        etag: uploadResult.etag,
        isDemo: false,
      };
    } catch (error) {
      logger.error(`Cloudinary upload error: ${error.message}`);

      // Determine if this is a configuration error or a transient failure
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        throw new ExternalServiceError(
          'Cloudinary',
          'Invalid credentials: Check CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET'
        );
      }

      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {string} publicId - Cloudinary public ID of the file
   * @returns {Object} { success, publicId, deletedAt }
   */
  async deleteFile(publicId) {
    try {
      if (!this.isConfigured) {
        logger.warn(`[DEMO MODE] Would delete: ${publicId}`);
        return { success: true, publicId, deletedAt: new Date(), isDemo: true };
      }

      if (!publicId) {
        throw new ValidationError('publicId is required');
      }

      logger.info(`Deleting file from Cloudinary: ${publicId}`);

      const result = await cloudinary.v2.uploader.destroy(publicId, {
        invalidate: false,
      });

      if (result.result === 'ok') {
        logger.info(`✓ File deleted successfully: ${publicId}`);
        return { success: true, publicId, deletedAt: new Date(), isDemo: false };
      } else {
        logger.warn(`File deletion returned: ${result.result}`);
        return {
          success: result.result === 'ok',
          publicId,
          result: result.result,
          isDemo: false,
        };
      }
    } catch (error) {
      logger.error(`Cloudinary delete error: ${error.message}`);
      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Get file metadata from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   * @returns {Object} File metadata
   */
  async getFileMetadata(publicId) {
    try {
      if (!this.isConfigured) {
        logger.warn(`[DEMO MODE] Would fetch metadata for: ${publicId}`);
        return this.mockFileMetadata(publicId);
      }

      if (!publicId) {
        throw new ValidationError('publicId is required');
      }

      logger.info(`Fetching metadata for: ${publicId}`);

      const metadata = await cloudinary.v2.api.resource(publicId, {
        resource_type: 'auto',
      });

      return {
        publicId: metadata.public_id,
        url: metadata.url,
        secureUrl: metadata.secure_url,
        format: metadata.format,
        bytes: metadata.bytes,
        width: metadata.width,
        height: metadata.height,
        resourceType: metadata.resource_type,
        createdAt: metadata.created_at,
        modifiedAt: metadata.modified_at,
        isDemo: false,
      };
    } catch (error) {
      logger.error(`Cloudinary metadata fetch error: ${error.message}`);
      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Generate secure download URL with expiry (for private clinical documents)
   * @param {string} publicId - Cloudinary public ID
   * @param {number} expirySeconds - URL expiry in seconds (default 3600)
   * @returns {string} Signed secure URL
   */
  async getSecureDownloadUrl(publicId, expirySeconds = 3600) {
    try {
      if (!this.isConfigured) {
        logger.warn(`[DEMO MODE] Would generate secure URL for: ${publicId}`);
        return `https://demo.jeevacare.local/download/${publicId}`;
      }

      const signedUrl = cloudinary.v2.utils.private_download_url(publicId, 'pdf', {
        expires_at: Math.floor(Date.now() / 1000) + expirySeconds,
        resource_type: 'auto',
        type: 'private',
      });

      logger.info(`✓ Generated secure download URL for: ${publicId}`);
      return signedUrl;
    } catch (error) {
      logger.error(`Failed to generate secure URL: ${error.message}`);
      throw new ExternalServiceError('Cloudinary', error.message);
    }
  }

  /**
   * Check if adapter is in demo mode
   */
  isDemoMode() {
    return !this.isConfigured;
  }

  /**
   * Get adapter status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? 'LIVE' : 'DEMO',
      provider: 'Cloudinary',
      cloudName: this.isConfigured ? config.cloudinary.cloudName : null,
      capabilities: [
        'upload_file',
        'delete_file',
        'get_metadata',
        'secure_download',
      ],
    };
  }

  // ===== DEMO MODE HELPERS =====

  /**
   * Mock upload response for development when credentials unavailable
   */
  mockUploadResponse(fileBuffer, options = {}) {
    const mockPublicId = `jeevacare/demo/${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const mimeType = options.fileName?.split('.').pop() || 'bin';

    return {
      publicId: mockPublicId,
      url: `http://res.cloudinary.com/demo/image/upload/${mockPublicId}`,
      secureUrl: `https://res.cloudinary.com/demo/image/upload/${mockPublicId}`,
      format: mimeType,
      bytes: fileBuffer.length,
      resourceType: options.resourceType || 'auto',
      width: 0,
      height: 0,
      createdAt: new Date().toISOString(),
      isDemo: true,
      demoWarning:
        'DEMO MODE: This is a mock response. Real Cloudinary credentials not configured.',
    };
  }

  /**
   * Mock file metadata
   */
  mockFileMetadata(publicId) {
    return {
      publicId,
      url: `https://res.cloudinary.com/demo/image/upload/${publicId}`,
      secureUrl: `https://res.cloudinary.com/demo/image/upload/${publicId}`,
      format: 'pdf',
      bytes: 102400,
      resourceType: 'raw',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      isDemo: true,
    };
  }
}

export default new CloudinaryAdapter();
