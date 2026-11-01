/**
 * Medical Image Analyzer Adapter (Stub for ClaraMed Integration)
 * 
 * This adapter previously contained direct TorchXRayVision/PyTorch inference.
 * Medical image AI has been decoupled to the ClaraMed platform.
 * 
 * Modalities:
 * - chest_xray: ⏳ PENDING ClaraMed integration
 * - ct_scan, mri, ultrasound, mammography, bone_xray: ⏳ PENDING ClaraMed integration
 * 
 * See docs/CLARAMED_INTEGRATION.md for integration roadmap.
 */

import logger from '../utils/logger.js';

class MedicalImageAnalyzer {
  constructor() {
    this.initialized = false;
    this.enabled = false; // Disabled until ClaraMed integration is complete
    this.supportedModalities = ['chest_xray']; // ClaraMed will support more
    
    logger.info('MedicalImageAnalyzer: ClaraMed integration pending - local AI disabled');
  }

  /**
   * Detect image modality from metadata and filename
   */
  async detectModality(imageInput, metadata = {}) {
    try {
      const filename = (metadata.filename || metadata.originalFilename || '').toLowerCase();
      const rawModality = (metadata.modalityType || '').toLowerCase();
      const bodyPart = (metadata.bodyPart || '').toLowerCase();
      const mimeType = (metadata.mimeType || '').toLowerCase();

      // Check for explicit non-chest modalities first
      if (rawModality === 'mri' || filename.includes('mri')) {
        return {
          modality: 'mri',
          confidence: 0.95,
          supported: false,
          reason: 'MRI analysis will be available via ClaraMed integration.',
        };
      }

      if (rawModality === 'ct_scan' || rawModality === 'ct' || filename.includes('ct_scan') || filename.includes('ctscan')) {
        return {
          modality: 'ct_scan',
          confidence: 0.95,
          supported: false,
          reason: 'CT scan analysis will be available via ClaraMed integration.',
        };
      }

      if (rawModality === 'ultrasound' || filename.includes('ultrasound') || filename.includes('echo')) {
        return {
          modality: 'ultrasound',
          confidence: 0.90,
          supported: false,
          reason: 'Ultrasound analysis will be available via ClaraMed integration.',
        };
      }

      // Check if it's an X-ray
      const isXRay = rawModality === 'x_ray' || rawModality === 'xray' ||
                     filename.includes('xray') || filename.includes('x-ray') || filename.includes('cxr');

      if (isXRay) {
        const isChest = bodyPart.includes('chest') || bodyPart.includes('thorax') || bodyPart.includes('lung') ||
                        filename.includes('chest') || filename.includes('cxr') || filename.includes('thorax') ||
                        filename.includes('lungs') || (!bodyPart && !filename.includes('bone') && !filename.includes('knee'));

        if (isChest) {
          return {
            modality: 'chest_xray',
            confidence: 0.92,
            supported: false, // Changed from true - requires ClaraMed
            reason: 'Chest X-ray analysis will be available via ClaraMed integration.',
          };
        } else {
          return {
            modality: 'bone_xray',
            confidence: 0.85,
            supported: false,
            reason: `X-ray of ${bodyPart || 'non-chest region'} will be available via ClaraMed integration.`,
          };
        }
      }

      // Non-medical / generic file rejection
      if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
        return {
          modality: 'document_pdf',
          confidence: 0.90,
          supported: false,
          reason: 'PDF document detected. Please use document OCR extraction rather than image inference.',
        };
      }

      return {
        modality: 'unknown',
        confidence: 0.0,
        supported: false,
        reason: 'Could not reliably determine medical image modality.',
      };
    } catch (error) {
      logger.error(`Modality detection error: ${error.message}`);
      return {
        modality: 'error',
        confidence: 0.0,
        supported: false,
        reason: error.message,
      };
    }
  }

  /**
   * Analyze medical image - stub for ClaraMed integration
   */
  async analyzeImage(image, options = {}) {
    try {
      const modalityInfo = options.detectedModality || await this.detectModality(image, options.metadata || {});

      // All modalities now require ClaraMed integration
      return this.createClaraMedRequiredResponse(modalityInfo);
    } catch (error) {
      logger.error(`Medical image analysis error: ${error.message}`);
      return this.createErrorResponse(error);
    }
  }

  /**
   * Create response indicating ClaraMed integration is required
   */
  createClaraMedRequiredResponse(modalityInfo) {
    return {
      success: false,
      status: 'claramed_required',
      modality: modalityInfo.modality,
      confidence: modalityInfo.confidence || 0,
      message: `Medical image AI analysis for ${modalityInfo.modality} requires ClaraMed integration.`,
      reason: 'JeevaCare has decoupled medical image AI to the ClaraMed platform.',
      recommendations: [
        'Your image has been securely saved to the patient record',
        'AI analysis will be available once ClaraMed integration is complete',
        'A qualified healthcare professional can review the image manually',
      ],
      claraMedIntegrationStatus: 'pending',
      disclaimers: this.getDisclaimers(),
    };
  }

  /**
   * Create error response
   */
  createErrorResponse(error) {
    return {
      success: false,
      status: 'error',
      message: 'Medical image analysis could not be completed',
      error: error.message,
      recommendations: [
        'The uploaded study has been preserved in the persistent record',
        'Manual review by an authorized clinician can proceed without delay',
      ],
      disclaimers: this.getDisclaimers(),
    };
  }

  /**
   * Mandatory medical disclaimers
   */
  getDisclaimers() {
    return [
      'This analysis is AI-generated and NOT a medical diagnosis.',
      'Always consult a qualified radiologist or physician for clinical evaluation.',
      'Decision-support outputs must never be used as the sole basis for clinical intervention.',
      'The original medical image and radiologist report remain the authoritative clinical record.',
    ];
  }

  /**
   * Get supported modalities (theoretical - requires ClaraMed)
   */
  getSupportedModalities() {
    return this.supportedModalities;
  }

  /**
   * Check if a specific modality is supported
   */
  supportsModality(modality) {
    return false; // All modalities require ClaraMed integration
  }

  /**
   * Health check endpoint data
   */
  async healthCheck() {
    return {
      service: 'Medical Image Analyzer',
      status: 'claramed_required',
      enabled: false,
      initialized: false,
      claraMedIntegrationStatus: 'pending',
      supportedModalities: this.supportedModalities,
      message: 'Medical image AI has been decoupled to ClaraMed platform',
      limitations: [
        'Direct TorchXRayVision inference has been removed from JeevaCare',
        'AI analysis requires ClaraMed integration (pending implementation)',
        'Manual radiologist review remains available for all uploaded studies'
      ],
      disclaimers: this.getDisclaimers(),
    };
  }

  getStatus() {
    return {
      enabled: false,
      initialized: false,
      model: 'claramed-integration-pending',
      device: 'n/a',
      supportedModalities: this.supportedModalities,
      mode: 'claramed_required',
      claraMedIntegrationStatus: 'pending',
      message: 'Medical image AI analysis requires ClaraMed platform integration',
    };
  }

  isReady() {
    return false; // Not ready until ClaraMed integration is complete
  }
}

// Singleton instance
const medicalImageAnalyzer = new MedicalImageAnalyzer();
export default medicalImageAnalyzer;
