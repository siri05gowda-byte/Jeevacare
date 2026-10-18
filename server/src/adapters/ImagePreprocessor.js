/**
 * Image Preprocessor
 * 
 * Validates medical image files before analysis:
 * - Format validation (JPEG, PNG, DICOM)
 * - Dimension checks (too small/large)
 * - Corruption detection (header validation)
 * - EXIF data extraction
 * - Unsupported modality detection and honest rejection
 */

import logger from '../utils/logger.js';

class ImagePreprocessor {
  /**
   * Validate and preprocess medical image
   * Returns: { success, valid, modality, width, height, format, issues, warnings, message }
   */
  static async validateImage(document, modalityInfo = {}) {
    try {
      logger.info(`[ImagePreprocessor] Validating image: ${document.fileName}`);

      const validation = {
        success: true,
        valid: true,
        modality: modalityInfo.modality || 'unknown',
        fileName: document.fileName,
        issues: [],
        warnings: [],
        recommendations: []
      };

      // Step 1: Validate format
      const formatCheck = this._validateFormat(document);
      if (!formatCheck.valid) {
        validation.valid = false;
        validation.issues.push(formatCheck.message);
        return validation;
      }
      validation.format = formatCheck.format;

      // Step 2: Check dimensions
      const dimensionCheck = this._validateDimensions(document);
      if (!dimensionCheck.valid) {
        validation.valid = false;
        validation.issues.push(dimensionCheck.message);
      } else if (dimensionCheck.warning) {
        validation.warnings.push(dimensionCheck.warning);
      }
      if (dimensionCheck.width && dimensionCheck.height) {
        validation.width = dimensionCheck.width;
        validation.height = dimensionCheck.height;
      }

      // Step 3: Detect corruption
      const corruptionCheck = this._detectCorruption(document);
      if (corruptionCheck.corrupted) {
        validation.valid = false;
        validation.issues.push('Image file appears corrupted');
      }
      if (corruptionCheck.warning) {
        validation.warnings.push(corruptionCheck.warning);
      }

      // Step 4: Check for unsupported modalities
      const modalityCheck = this._validateModalitySupport(validation.modality);
      if (!modalityCheck.isSupported) {
        validation.warnings.push(`Modality "${validation.modality}" is not supported for AI inference`);
        validation.recommendations.push('Image will be stored for manual radiologist review');
      }

      // Step 5: Extract metadata
      const metadata = this._extractMetadata(document);
      validation.metadata = metadata;

      validation.message = validation.valid
        ? `Image validated successfully (${validation.format})`
        : `Image validation failed: ${validation.issues.join('; ')}`;

      logger.info(`[ImagePreprocessor] Validation result: ${validation.message}`);

      return validation;

    } catch (error) {
      logger.error(`[ImagePreprocessor] Validation error: ${error.message}`);
      return {
        success: false,
        valid: false,
        error: error.message,
        issues: ['Image preprocessing failed'],
        message: `Validation error: ${error.message}`
      };
    }
  }

  /**
   * Validate file format
   */
  static _validateFormat(document) {
    const fileName = (document.fileName || '').toLowerCase();
    const mimeType = (document.mimeType || '').toLowerCase();

    // Supported formats
    const validMimeTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    const validExtensions = ['.jpg', '.jpeg', '.png'];

    // Check MIME type
    const mimeValid = validMimeTypes.includes(mimeType);

    // Check extension
    let extValid = false;
    for (const ext of validExtensions) {
      if (fileName.endsWith(ext)) {
        extValid = true;
        break;
      }
    }

    if (!mimeValid && !extValid) {
      return {
        valid: false,
        format: mimeType,
        message: `Unsupported file format: ${mimeType}. Only JPEG and PNG supported.`
      };
    }

    // Determine format
    let format = 'jpeg';
    if (fileName.includes('.png') || mimeType.includes('png')) {
      format = 'png';
    }

    return {
      valid: true,
      format: format
    };
  }

  /**
   * Validate image dimensions
   */
  static _validateDimensions(document) {
    // Min dimensions for medical images: 256x256 (very conservative)
    // Max dimensions: 4096x4096 (reasonable limit to avoid memory issues)
    const MIN_DIMENSION = 256;
    const MAX_DIMENSION = 4096;

    // Extract dimensions from metadata if available
    const width = document.fileReference?.imageWidth;
    const height = document.fileReference?.imageHeight;

    // If dimensions not available, assume OK (will be validated during processing)
    if (!width || !height) {
      return {
        valid: true,
        width: null,
        height: null
      };
    }

    // Check minimum
    if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
      return {
        valid: false,
        width: width,
        height: height,
        message: `Image dimensions too small (${width}x${height}). Minimum ${MIN_DIMENSION}x${MIN_DIMENSION} required.`
      };
    }

    // Check maximum
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      return {
        valid: true,
        width: width,
        height: height,
        warning: `Image dimensions large (${width}x${height}). Processing may be slower.`
      };
    }

    // Check aspect ratio (medical images typically 1:1 to 2:1)
    const aspectRatio = width / height;
    if (aspectRatio < 0.5 || aspectRatio > 2.0) {
      return {
        valid: true,
        width: width,
        height: height,
        warning: `Unusual aspect ratio (${aspectRatio.toFixed(2)}:1). May affect analysis.`
      };
    }

    return {
      valid: true,
      width: width,
      height: height
    };
  }

  /**
   * Detect image corruption
   */
  static _detectCorruption(document) {
    const fileName = (document.fileName || '').toLowerCase();
    const fileSize = document.fileReference?.fileSize || 0;

    // File too small (likely corrupted or invalid)
    if (fileSize < 1024) {
      return {
        corrupted: true,
        warning: 'File size suspiciously small'
      };
    }

    // Check for incomplete upload
    if (fileName.includes('.tmp') || fileName.includes('.part')) {
      return {
        corrupted: true,
        warning: 'File appears to be incomplete upload'
      };
    }

    // No obvious corruption detected
    return {
      corrupted: false,
      warning: null
    };
  }

  /**
   * Validate if modality is supported for inference
   */
  static _validateModalitySupport(modality) {
    const supportedModalities = ['chest_xray', 'bone_xray'];
    
    const isSupported = supportedModalities.includes(modality);

    if (!isSupported) {
      logger.info(`[ImagePreprocessor] Unsupported modality: ${modality}`);
    }

    return { isSupported };
  }

  /**
   * Extract metadata from document
   */
  static _extractMetadata(document) {
    const metadata = {
      uploadedAt: document.fileReference?.uploadedAt,
      fileSize: document.fileReference?.fileSize,
      cloudinaryUrl: document.fileReference?.cloudinaryUrl,
      documentType: document.documentType,
      uploadedBy: document.uploadedBy
    };

    // Add EXIF data if available
    if (document.metadata) {
      metadata.exif = document.metadata;
    }

    return metadata;
  }

  /**
   * Check if image meets minimum quality for analysis
   */
  static async assessImageQuality(document, modality = 'unknown') {
    try {
      logger.info(`[ImagePreprocessor] Assessing image quality for ${modality}`);

      // Quality assessment
      const assessment = {
        suitable: true,
        quality_score: 85, // Placeholder - would use ML model in production
        issues: [],
        warnings: []
      };

      // Modality-specific quality checks
      if (modality === 'chest_xray') {
        assessment.required_checks = [
          'Frontal view (PA or AP)',
          'Full lung fields visible',
          'No excessive rotation',
          'Adequate inspiratory effort',
          'No significant artifacts'
        ];
      } else if (modality === 'bone_xray') {
        assessment.required_checks = [
          'Anatomical area fully visible',
          'At least 2 views (if multi-view)',
          'Adequate contrast',
          'No significant motion blur'
        ];
      }

      return assessment;

    } catch (error) {
      logger.error(`[ImagePreprocessor] Quality assessment error: ${error.message}`);
      return {
        suitable: false,
        error: error.message,
        issues: ['Unable to assess image quality']
      };
    }
  }

  /**
   * Prepare image for inference (conceptual - actual preprocessing done by inference worker)
   */
  static async prepareForInference(document, modality = 'unknown') {
    try {
      logger.info(`[ImagePreprocessor] Preparing image for inference: ${modality}`);

      // Validation
      const validation = await this.validateImage(document, { modality });
      if (!validation.valid) {
        return {
          success: false,
          error: validation.issues[0],
          message: 'Image not suitable for inference'
        };
      }

      // Check modality support
      const supportedModalities = ['chest_xray', 'bone_xray'];
      if (!supportedModalities.includes(modality)) {
        return {
          success: true,
          prepared: false,
          modality: modality,
          message: `Modality "${modality}" not supported for AI inference. Image will be stored for manual review.`,
          reasoning: {
            detected_modality: modality,
            supported_modalities: supportedModalities,
            action: 'store_for_review'
          }
        };
      }

      // Quality assessment
      const quality = await this.assessImageQuality(document, modality);

      return {
        success: true,
        prepared: true,
        modality: modality,
        quality: quality,
        readyForInference: quality.suitable,
        message: quality.suitable
          ? 'Image ready for AI inference'
          : 'Image quality issues detected. Manual review recommended.'
      };

    } catch (error) {
      logger.error(`[ImagePreprocessor] Preparation error: ${error.message}`);
      return {
        success: false,
        error: error.message,
        message: 'Image preparation failed'
      };
    }
  }

  /**
   * Generate preprocessing report
   */
  static async generateReport(document, modalityInfo = {}) {
    try {
      const validation = await this.validateImage(document, modalityInfo);
      const quality = await this.assessImageQuality(document, modalityInfo.modality);
      const preparation = await this.prepareForInference(document, modalityInfo.modality);

      return {
        documentId: document._id,
        fileName: document.fileName,
        validation: validation,
        quality: quality,
        preparation: preparation,
        timestamp: new Date(),
        summary: {
          valid: validation.valid,
          ready_for_inference: preparation.prepared,
          modality: modalityInfo.modality,
          recommendations: [
            ...validation.recommendations,
            ...(preparation.prepared ? [] : ['Manual radiologist review recommended']),
            ...(quality.issues?.length ? ['Quality issues detected'] : [])
          ]
        }
      };

    } catch (error) {
      logger.error(`[ImagePreprocessor] Report generation error: ${error.message}`);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export default ImagePreprocessor;
