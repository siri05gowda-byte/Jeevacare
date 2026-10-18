/**
 * Radiology AI Service
 * 
 * Orchestrates medical image analysis for radiology records.
 * Integrates MedicalImageAnalyzer for image processing.
 * Handles multi-language explanations and safety checks.
 * 
 * Safety-first approach:
 * - Never fabricates findings
 * - Always includes disclaimers
 * - Preserves original images as authoritative
 * - Labels AI outputs clearly
 * - Handles unsupported modalities gracefully
 */

import RadiologyRecord from '../models/RadiologyRecord.js';
import MedicalImageAnalyzer from '../adapters/MedicalImageAnalyzer.js';
import CloudinaryAdapter from '../adapters/CloudinaryAdapter.js';
import AIService from './AIService.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';
import axios from 'axios';

class RadiologyAIService {
  /**
   * Analyze medical image from radiology record
   * @param {String} radiologyId - Radiology record ID
   * @param {Object} requestingUser - User requesting analysis
   * @param {Object} options - Analysis options (language, etc.)
   * @returns {Promise<Object>} Analysis results
   */
  static async analyzeRadiologyImage(radiologyId, requestingUser, options = {}) {
    try {
      const language = options.language || 'en';

      // Get radiology record
      const radiologyRecord = await RadiologyRecord.findById(radiologyId);
      if (!radiologyRecord) {
        throw new Error(`Radiology record not found: ${radiologyId}`);
      }

      // Check if image exists
      if (!radiologyRecord.imageReference?.cloudinaryUrl) {
        throw new Error('No image attached to this radiology record');
      }

      // Check if already analyzed
      if (radiologyRecord.aiAnalysis?.status === 'completed') {
        logger.info(`Returning cached AI analysis for radiology ${radiologyId}`);
        return {
          success: true,
          cached: true,
          analysis: radiologyRecord.aiAnalysis,
          disclaimers: MedicalImageAnalyzer.getDisclaimers()
        };
      }

      // Mark as analyzing
      await RadiologyRecord.findByIdAndUpdate(radiologyId, {
        'aiAnalysis.status': 'analyzing',
        'aiAnalysis.model': MedicalImageAnalyzer.getStatus().model,
      });

      logger.info(`Starting AI analysis for radiology ${radiologyId}`);

      // Detect modality if not already known
      const detectedModality = await this._detectModalityFromRecord(radiologyRecord);

      // Download image for analysis
      // Note: In production with larger models, you might stream directly
      // For now, we pass the URL to the analyzer
      const imageUrl = radiologyRecord.imageReference.cloudinaryUrl;
      const mimeType = radiologyRecord.imageReference.mimeType;

      // Run image analysis
      const analysisResult = await MedicalImageAnalyzer.analyzeImage(imageUrl, {
        metadata: {
          mimeType,
          filename: radiologyRecord.imageReference.originalFilename,
          modalityType: radiologyRecord.modalityType
        },
        detectedModality,
        language
      });

      // Determine final status
      let finalStatus = 'completed';
      if (!analysisResult.success) {
        finalStatus = analysisResult.status === 'unsupported_modality' ? 'unsupported_modality' : 'failed';
      }

      // Update radiology record with results
      const aiAnalysisData = {
        status: finalStatus,
        model: analysisResult.model || MedicalImageAnalyzer.getStatus().model,
        detectedModality: detectedModality.modality,
        findings: analysisResult.findings || [],
        summary: analysisResult.summary || '',
        explanation: analysisResult.patientFriendlyExplanation || '',
        confidence: analysisResult.confidence || 0,
        limitations: analysisResult.limitations || [],
        disclaimers: analysisResult.disclaimers || MedicalImageAnalyzer.getDisclaimers(),
        analyzedAt: new Date(),
        language,
        isMockData: analysisResult.isMockData || false,
        metadata: analysisResult.metadata || {}
      };

      await RadiologyRecord.findByIdAndUpdate(radiologyId, {
        aiAnalysis: aiAnalysisData
      });

      // Audit log
      await AuditService.logEvent({
        action: 'radiology_ai_analysis',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: radiologyId,
        resourceType: 'radiology',
        patient: radiologyRecord.patientId,
        hospital: radiologyRecord.facilityId,
        status: finalStatus === 'completed' ? 'success' : 'partial',
        details: {
          modalityType: radiologyRecord.modalityType,
          detectedModality: detectedModality.modality,
          analysisStatus: finalStatus,
          model: aiAnalysisData.model,
          confidence: aiAnalysisData.confidence,
          isMockData: aiAnalysisData.isMockData
        },
        sensitivityLevel: 'high'
      });

      logger.info(`AI analysis completed for radiology ${radiologyId}: ${finalStatus}`);

      return {
        success: analysisResult.success,
        cached: false,
        analysis: aiAnalysisData,
        disclaimers: aiAnalysisData.disclaimers,
        message: analysisResult.message || 'Analysis completed successfully'
      };

    } catch (error) {
      logger.error(`Radiology AI analysis error: ${error.message}`);

      // Update record with error status
      try {
        await RadiologyRecord.findByIdAndUpdate(radiologyId, {
          'aiAnalysis.status': 'failed',
          'aiAnalysis.error': error.message
        });
      } catch (updateError) {
        logger.error(`Failed to update error status: ${updateError.message}`);
      }

      throw new Error(`Failed to analyze radiology image: ${error.message}`);
    }
  }

  /**
   * Get AI analysis status for a radiology record
   * @param {String} radiologyId
   * @returns {Promise<Object>} Status information
   */
  static async getAnalysisStatus(radiologyId) {
    try {
      const radiologyRecord = await RadiologyRecord.findById(radiologyId).select('aiAnalysis');
      if (!radiologyRecord) {
        throw new Error(`Radiology record not found: ${radiologyId}`);
      }

      const aiAnalysis = radiologyRecord.aiAnalysis || {
        status: 'not_analyzed'
      };

      return {
        success: true,
        status: aiAnalysis.status,
        hasAnalysis: aiAnalysis.status === 'completed',
        isMockData: aiAnalysis.isMockData || false,
        analyzedAt: aiAnalysis.analyzedAt,
        model: aiAnalysis.model,
        confidence: aiAnalysis.confidence
      };

    } catch (error) {
      logger.error(`Error getting analysis status: ${error.message}`);
      throw error;
    }
  }

  /**
   * Translate AI explanation to another language
   * @param {String} radiologyId
   * @param {String} targetLanguage
   * @returns {Promise<Object>} Translated explanation
   */
  static async translateExplanation(radiologyId, targetLanguage) {
    try {
      const radiologyRecord = await RadiologyRecord.findById(radiologyId);
      if (!radiologyRecord) {
        throw new Error(`Radiology record not found: ${radiologyId}`);
      }

      if (!radiologyRecord.aiAnalysis || !radiologyRecord.aiAnalysis.explanation) {
        throw new Error('No AI explanation available to translate');
      }

      const currentLanguage = radiologyRecord.aiAnalysis.language || 'en';
      
      if (currentLanguage === targetLanguage) {
        return {
          success: true,
          explanation: radiologyRecord.aiAnalysis.explanation,
          language: targetLanguage,
          cached: true
        };
      }

      // Use AIService for translation
      const translation = await AIService.translateText(
        radiologyRecord.aiAnalysis.explanation,
        targetLanguage,
        currentLanguage
      );

      return {
        success: true,
        explanation: translation.translated,
        originalLanguage: currentLanguage,
        targetLanguage,
        translatedAt: new Date(),
        disclaimers: MedicalImageAnalyzer.getDisclaimers()
      };

    } catch (error) {
      logger.error(`Translation error: ${error.message}`);
      throw new Error(`Failed to translate explanation: ${error.message}`);
    }
  }

  /**
   * Detect modality from radiology record metadata
   * @private
   */
  static async _detectModalityFromRecord(radiologyRecord) {
    const recordedModality = radiologyRecord.modalityType;
    const bodyPart = radiologyRecord.bodyPart;

    // Map database modality types to analyzer modality types
    if (recordedModality === 'x_ray' && bodyPart && bodyPart.toLowerCase().includes('chest')) {
      return {
        modality: 'chest_xray',
        confidence: 0.9,
        supported: true,
        reason: 'Detected from record metadata'
      };
    }

    if (recordedModality === 'x_ray') {
      return {
        modality: 'x_ray_other',
        confidence: 0.8,
        supported: false,
        reason: 'X-ray analysis limited to chest X-rays only'
      };
    }

    if (recordedModality === 'ct_scan') {
      return {
        modality: 'ct_scan',
        confidence: 0.9,
        supported: false,
        reason: 'CT scan analysis not yet implemented'
      };
    }

    if (recordedModality === 'mri') {
      return {
        modality: 'mri',
        confidence: 0.9,
        supported: false,
        reason: 'MRI analysis not yet implemented'
      };
    }

    return {
      modality: recordedModality || 'unknown',
      confidence: 0.5,
      supported: false,
      reason: 'Modality not yet supported for AI analysis'
    };
  }

  /**
   * Get service status and capabilities
   */
  static getServiceStatus() {
    return {
      service: 'Radiology AI Service',
      imageAnalyzer: MedicalImageAnalyzer.getStatus(),
      supportedModalities: MedicalImageAnalyzer.getSupportedModalities(),
      capabilities: {
        imageAnalysis: MedicalImageAnalyzer.isReady(),
        textExplanation: AIService.isReady(),
        translation: AIService.isReady(),
        multiLanguage: true
      },
      supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml']
    };
  }
}

export default RadiologyAIService;
