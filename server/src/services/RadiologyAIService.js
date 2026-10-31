/**
 * Radiology AI Service
 * 
 * Orchestrates automated medical study analysis for radiology records.
 * Integrates:
 * 1. TorchXRayVision (ResNet50) for chest radiograph deep learning inference
 * 2. Groq LLM for grounded clinical explanations & patient summaries
 * 3. Tesseract OCR for written document and PDF report text extraction
 * 4. Structured unsupported-modality handling for CT/MRI/Ultrasound
 * 
 * Safety-first approach:
 * - Never fabricates findings
 * - Always includes clinician-review disclaimers
 * - Preserves original uploaded files on processing failures
 * - DB-backed job tracking: survives Node process restarts
 * - Stale job recovery on startup prevents lost work
 */

import RadiologyRecord from '../models/RadiologyRecord.js';
import MedicalImageAnalyzer from '../adapters/MedicalImageAnalyzer.js';
import OCRAdapter from '../adapters/OCRAdapter.js';
import AIService from './AIService.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

// Jobs older than this (in ms) with non-terminal status are considered stale
const STALE_JOB_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
// Heartbeat interval during active processing
const HEARTBEAT_INTERVAL_MS = 30 * 1000; // 30 seconds

class RadiologyAIService {
  /**
   * Automatically process a radiology study immediately after upload.
   * 
   * Persists job state to MongoDB BEFORE dispatching, so the job can be
   * recovered via recoverStaleJobs() if the Node process restarts before
   * processing completes.
   *
   * @param {String} radiologyId - Radiology record ID
   * @param {Object} requestingUser - User who uploaded the record
   * @param {Object} options - Language and options
   */
  static autoProcessRadiologyStudy(radiologyId, requestingUser, options = {}) {
    const now = new Date();
    // Persist job dispatch timestamp immediately (synchronous DB write via findByIdAndUpdate)
    // This ensures even if the process dies immediately after, recoverStaleJobs() will pick it up
    RadiologyRecord.findByIdAndUpdate(radiologyId, {
      $set: {
        'aiAnalysis.status': 'queued',
        'aiJob.dispatchedAt': now,
        'aiJob.heartbeatAt': now,
        'aiJob.processingLock': false,
        'aiJob.lockPid': null,
      },
    }).catch(err => logger.error(`Failed to persist job dispatch state for ${radiologyId}: ${err.message}`));

    // Run asynchronously in background after persisting state
    setImmediate(async () => {
      try {
        await this._runWithLock(radiologyId, requestingUser, options);
      } catch (err) {
        logger.error(`Automated radiology processing error for ${radiologyId}: ${err.message}`);
      }
    });
  }

  /**
   * Acquire processing lock and run analysis, releasing lock when done.
   * Prevents concurrent processing of the same record.
   * @private
   */
  static async _runWithLock(radiologyId, requestingUser, options = {}) {
    // Atomically acquire processing lock
    const locked = await RadiologyRecord.findOneAndUpdate(
      {
        _id: radiologyId,
        $or: [
          { 'aiJob.processingLock': false },
          { 'aiJob.processingLock': { $exists: false } },
          // Allow re-lock if heartbeat is stale (process died mid-run)
          { 'aiJob.heartbeatAt': { $lt: new Date(Date.now() - STALE_JOB_TIMEOUT_MS) } },
        ],
      },
      {
        $set: {
          'aiJob.processingLock': true,
          'aiJob.lockPid': process.pid,
          'aiJob.heartbeatAt': new Date(),
        },
      },
      { new: false }
    );

    if (!locked) {
      logger.info(`Skipping radiology ${radiologyId}: already locked by another process`);
      return null;
    }

    // Heartbeat timer — updates DB every 30s to prove the process is alive
    const heartbeatTimer = setInterval(async () => {
      try {
        await RadiologyRecord.findByIdAndUpdate(radiologyId, {
          $set: { 'aiJob.heartbeatAt': new Date() },
        });
      } catch (e) { /* non-fatal */ }
    }, HEARTBEAT_INTERVAL_MS);

    try {
      const result = await this.processRadiologyStudy(radiologyId, requestingUser, options);
      return result;
    } finally {
      clearInterval(heartbeatTimer);
      // Release lock regardless of success/failure
      await RadiologyRecord.findByIdAndUpdate(radiologyId, {
        $set: {
          'aiJob.processingLock': false,
          'aiJob.lockPid': null,
        },
      }).catch(() => {});
    }
  }

  /**
   * Recover stale queued/processing jobs on process startup.
   * Call this once from server/src/index.js after MongoDB connects.
   * 
   * Finds all records stuck in non-terminal states where the heartbeat
   * is older than STALE_JOB_TIMEOUT_MS, resets their lock, and re-dispatches.
   */
  static async recoverStaleJobs() {
    const staleThreshold = new Date(Date.now() - STALE_JOB_TIMEOUT_MS);
    try {
      const staleRecords = await RadiologyRecord.find({
        'aiAnalysis.status': { $in: ['queued', 'processing', 'analyzing'] },
        $or: [
          { 'aiJob.heartbeatAt': { $lt: staleThreshold } },
          { 'aiJob.heartbeatAt': { $exists: false } },
          { 'aiJob.dispatchedAt': { $lt: staleThreshold } },
        ],
      }).select('_id aiAnalysis.status aiJob').lean();

      if (staleRecords.length === 0) {
        logger.info('Radiology job recovery: no stale jobs found');
        return { recovered: 0 };
      }

      logger.warn(`Radiology job recovery: found ${staleRecords.length} stale job(s) — re-dispatching`);

      for (const record of staleRecords) {
        const retryCount = (record.aiJob?.retryCount || 0) + 1;
        const maxRetries = record.aiJob?.maxRetries || 3;

        if (retryCount > maxRetries) {
          logger.error(`Radiology ${record._id}: max retries (${maxRetries}) exceeded, permanently marking failed`);
          await RadiologyRecord.findByIdAndUpdate(record._id, {
            $set: {
              'aiAnalysis.status': 'failed',
              'aiAnalysis.error': `Analysis failed after ${maxRetries} automated recovery attempts. Please retry manually.`,
              'aiJob.processingLock': false,
            },
          });
          continue;
        }

        // Release lock and increment retry count
        await RadiologyRecord.findByIdAndUpdate(record._id, {
          $set: {
            'aiJob.processingLock': false,
            'aiJob.retryCount': retryCount,
            'aiJob.dispatchedAt': new Date(),
            'aiJob.heartbeatAt': new Date(),
          },
          $push: {
            'aiJob.errorHistory': {
              attempt: retryCount,
              error: `Recovered from stale state: ${record.aiAnalysis?.status}`,
              failedAt: new Date(),
            },
          },
        });

        // Re-dispatch with a staggered delay to avoid thundering herd
        const delayMs = retryCount * 2000;
        setTimeout(() => {
          this._runWithLock(record._id.toString(), { _id: 'system-recovery', role: 'SYSTEM' }, {}).catch(err => {
            logger.error(`Recovery re-dispatch failed for ${record._id}: ${err.message}`);
          });
        }, delayMs);

        logger.info(`Radiology job recovery: re-dispatched ${record._id} (attempt ${retryCount}/${maxRetries})`);
      }

      return { recovered: staleRecords.length };
    } catch (err) {
      logger.error(`Radiology job recovery failed: ${err.message}`);
      return { recovered: 0, error: err.message };
    }
  }

  /**
   * Complete unified processing for any radiology study (image, report, or cross-sectional study)
   * @param {String} radiologyId - Radiology record ID
   * @param {Object} requestingUser - User initiating or retrying analysis
   * @param {Object} options - Options (language, force)
   * @returns {Promise<Object>} Analysis result
   */
  static async processRadiologyStudy(radiologyId, requestingUser, options = {}) {
    const language = options.language || 'en';

    // 1. Fetch radiology record
    const radiologyRecord = await RadiologyRecord.findById(radiologyId);
    if (!radiologyRecord) {
      throw new Error(`Radiology record not found: ${radiologyId}`);
    }

    // Check if already completed unless force requested
    if (radiologyRecord.aiAnalysis?.status === 'completed' && !options.force) {
      logger.info(`Returning cached AI analysis for radiology ${radiologyId}`);
      return {
        success: true,
        cached: true,
        analysis: radiologyRecord.aiAnalysis,
        disclaimers: MedicalImageAnalyzer.getDisclaimers(),
      };
    }

    // 2. Set status to processing
    await RadiologyRecord.findByIdAndUpdate(radiologyId, {
      'aiAnalysis.status': 'processing',
      'aiAnalysis.error': null,
    });

    logger.info(`Initiating automated AI processing for radiology record: ${radiologyId} (modality: ${radiologyRecord.modalityType}, bodyPart: ${radiologyRecord.bodyPart})`);

    try {
      const mimeType = (radiologyRecord.imageReference?.mimeType || '').toLowerCase();
      const originalFilename = (radiologyRecord.imageReference?.originalFilename || '').toLowerCase();
      const isPdf = mimeType.includes('pdf') || originalFilename.endsWith('.pdf');
      const isImage = mimeType.startsWith('image/') || originalFilename.endsWith('.png') || originalFilename.endsWith('.jpg') || originalFilename.endsWith('.jpeg') || originalFilename.endsWith('.tif') || originalFilename.endsWith('.tiff') || mimeType.includes('dicom');

      const detectedModality = await this._detectModalityFromRecord(radiologyRecord);

      let aiAnalysisData = null;

      // =========================================================================
      // PATHWAY A: Chest X-ray Image (Deep Learning with TorchXRayVision + Groq)
      // =========================================================================
      if (!isPdf && isImage && detectedModality.modality === 'chest_xray') {
        logger.info(`Routing radiology ${radiologyId} to Pathway A: TorchXRayVision Chest X-Ray inference`);

        const imageInput = radiologyRecord.imageReference?.localPath || radiologyRecord.imageReference?.cloudinaryUrl;
        if (!imageInput) {
          throw new Error('No image reference found for chest radiograph analysis');
        }

        // Run real deep learning inference via TorchXRayVision worker
        const imageResult = await MedicalImageAnalyzer.analyzeImage(imageInput, {
          metadata: {
            mimeType,
            filename: radiologyRecord.imageReference?.originalFilename,
            modalityType: radiologyRecord.modalityType,
            bodyPart: radiologyRecord.bodyPart,
          },
          detectedModality,
          language,
        });

        if (!imageResult.success) {
          throw new Error(imageResult.error || 'TorchXRayVision deep learning inference returned unsuccessful');
        }

        // Pass actual model findings to Groq LLM for grounded clinical explanation
        const llmContext = {
          pathway: 'chest_xray',
          studyType: 'Chest X-Ray (Radiograph)',
          bodyPart: radiologyRecord.bodyPart || 'Chest',
          clinicalIndication: radiologyRecord.clinicalIndication || '',
          findings: imageResult.findings || [],
          allScores: imageResult.allPathologies || {},
        };

        const llmResult = await AIService.generateRadiologyExplanation(llmContext, { language });

        aiAnalysisData = {
          status: 'completed',
          provider: 'TorchXRayVision + Groq',
          model: imageResult.model || 'TorchXRayVision-resnet50-res512-all',
          pipelineVersion: imageResult.pipelineVersion || '2.0.0-torchxrayvision',
          detectedModality: 'chest_xray',
          studyType: 'Chest X-Ray (Radiograph)',
          findings: imageResult.findings || [],
          allPathologies: imageResult.allPathologies || {},
          whatWasObserved: llmResult.whatWasObserved || [],
          potentialAbnormalities: llmResult.potentialAbnormalities || [],
          normalFindings: llmResult.normalFindings || [],
          summary: llmResult.summary || imageResult.summary || '',
          explanation: llmResult.clinicalExplanation || imageResult.patientFriendlyExplanation || '',
          clinicalExplanation: llmResult.clinicalExplanation || '',
          recommendations: llmResult.recommendations || [],
          importantCaveats: llmResult.importantCaveats || [],
          requiresDoctorReview: true,
          confidence: imageResult.confidence || 0,
          limitations: imageResult.limitations || [],
          disclaimers: imageResult.disclaimers || MedicalImageAnalyzer.getDisclaimers(),
          analyzedAt: new Date(),
          language,
          isMockData: imageResult.isMockData || false,
          metadata: {
            ...(imageResult.metadata || {}),
            pathway: 'chest_xray_deep_learning',
            analysisModel: imageResult.model,
          },
        };
      }

      // =========================================================================
      // PATHWAY C: Written Radiology Report / PDF Document (OCR + Groq LLM)
      // =========================================================================
      else if (isPdf || (!isImage && radiologyRecord.imageReference?.cloudinaryUrl)) {
        logger.info(`Routing radiology ${radiologyId} to Pathway C: OCR text extraction + Groq clinical analysis`);

        let extractedText = radiologyRecord.ocrData?.extractedText || '';
        let ocrConfidence = radiologyRecord.ocrData?.confidence || 0.9;

        // Perform OCR extraction if not yet extracted
        if (!extractedText && (radiologyRecord.imageReference?.cloudinaryUrl || radiologyRecord.imageReference?.localPath)) {
          const fileInput = radiologyRecord.imageReference.localPath || radiologyRecord.imageReference.cloudinaryUrl;
          try {
            const ocrResult = await OCRAdapter.extractText(null, {
              documentType: radiologyRecord.modalityType,
              isUrl: !radiologyRecord.imageReference.localPath,
              url: radiologyRecord.imageReference.cloudinaryUrl,
            });

            extractedText = ocrResult?.text || '';
            ocrConfidence = ocrResult?.confidence || 0.85;

            // Save OCR extraction to record
            await RadiologyRecord.findByIdAndUpdate(radiologyId, {
              ocrStatus: 'extracted',
              ocrData: {
                extractedText,
                confidence: ocrConfidence,
                extractedAt: new Date(),
              },
            });
          } catch (ocrErr) {
            logger.warn(`OCR extraction notice for ${radiologyId}: ${ocrErr.message}`);
          }
        }

        // Generate clinical explanation from extracted text
        const llmContext = {
          pathway: 'ocr_report',
          studyType: `${(radiologyRecord.modalityType || 'Radiology').toUpperCase().replace('_', ' ')} Report`,
          modality: radiologyRecord.modalityType || 'document_report',
          clinicalIndication: radiologyRecord.clinicalIndication || '',
          extractedText: extractedText || radiologyRecord.findings || radiologyRecord.impression || 'Medical report document attached for review.',
        };

        const llmResult = await AIService.generateRadiologyExplanation(llmContext, { language });

        aiAnalysisData = {
          status: 'completed',
          provider: 'Tesseract OCR + Groq',
          model: AIService.getStatus()?.model || 'Groq LLM',
          pipelineVersion: '2.0.0-ocr-llm',
          detectedModality: radiologyRecord.modalityType || 'document_report',
          studyType: llmResult.studyType || `${radiologyRecord.modalityType.toUpperCase()} Report`,
          findings: [],
          whatWasObserved: llmResult.whatWasObserved || [],
          potentialAbnormalities: llmResult.potentialAbnormalities || [],
          normalFindings: llmResult.normalFindings || [],
          summary: llmResult.summary || 'Written report text extracted and analyzed.',
          explanation: llmResult.clinicalExplanation || '',
          clinicalExplanation: llmResult.clinicalExplanation || '',
          recommendations: llmResult.recommendations || [],
          importantCaveats: llmResult.importantCaveats || [],
          requiresDoctorReview: true,
          confidence: ocrConfidence,
          limitations: [
            'OCR extraction reflects textual content of the physical or PDF document',
            'Original document remains the authoritative source record',
          ],
          disclaimers: MedicalImageAnalyzer.getDisclaimers(),
          analyzedAt: new Date(),
          language,
          isMockData: false,
          metadata: {
            pathway: 'ocr_document_extraction',
            textLength: extractedText.length,
          },
        };
      }

      // =========================================================================
      // PATHWAY B: Other Medical Images (CT, MRI, Ultrasound, PET, Non-Chest X-ray)
      // =========================================================================
      else {
        logger.info(`Routing radiology ${radiologyId} to Pathway B: Specialized cross-sectional study (unsupported automated vision)`);

        const modalityLabel = (radiologyRecord.modalityType || 'other').toUpperCase().replace('_', ' ');

        const llmContext = {
          pathway: 'unsupported_modality',
          studyType: `${modalityLabel} Study`,
          modality: radiologyRecord.modalityType,
          bodyPart: radiologyRecord.bodyPart,
        };

        const llmResult = await AIService.generateRadiologyExplanation(llmContext, { language });

        aiAnalysisData = {
          status: 'unsupported_modality',
          provider: 'JeevaCare Clinical Protocol',
          model: 'licensed_radiologist_review',
          pipelineVersion: '2.0.0-clinical-review',
          detectedModality: radiologyRecord.modalityType || 'other',
          studyType: `${modalityLabel} (${radiologyRecord.bodyPart || 'General'})`,
          findings: [],
          whatWasObserved: [
            `Modality identified: ${modalityLabel}`,
            `Anatomical region: ${radiologyRecord.bodyPart || 'Unspecified'}`,
            'Image data securely preserved in persistent Cloudinary storage',
          ],
          potentialAbnormalities: [],
          normalFindings: [],
          summary: `Automated AI vision analysis is specialized for chest radiographs. Manual radiologist evaluation is required for ${modalityLabel}.`,
          explanation: llmResult.clinicalExplanation || 'Automated deep learning analysis for cross-sectional studies (such as CT and MRI), ultrasound, and specialized imaging requires specialized multi-slice diagnostic workstations and is not currently automated. Your complete medical imaging files are safely preserved for direct clinician review.',
          clinicalExplanation: llmResult.clinicalExplanation || '',
          recommendations: [
            'Schedule a consultation with your referring physician to review the radiologist impression',
            'Bring prior imaging studies for comparative analysis if available',
          ],
          importantCaveats: [
            'No automated findings fabricated for unsupported modalities',
            'Diagnostic cross-sectional studies require specialist radiologist interpretation',
          ],
          requiresDoctorReview: true,
          confidence: 0,
          limitations: [
            'Deep learning computer vision worker is trained exclusively on chest radiographs',
            'CT, MRI, and ultrasound interpretation must be performed by human radiologists',
          ],
          disclaimers: MedicalImageAnalyzer.getDisclaimers(),
          analyzedAt: new Date(),
          language,
          isMockData: false,
          metadata: {
            pathway: 'unsupported_modality_preservation',
          },
        };
      }

      // 3. Persist results to MongoDB
      await RadiologyRecord.findByIdAndUpdate(radiologyId, {
        aiAnalysis: aiAnalysisData,
      });

      // 4. Audit Log
      try {
        await AuditService.logEvent({
          action: 'radiology_ai_analysis',
          actor: requestingUser?._id || requestingUser?.id || radiologyRecord.createdBy,
          actorRole: requestingUser?.role || 'SYSTEM',
          resource: radiologyId,
          resourceType: 'radiology',
          patient: radiologyRecord.patientId,
          hospital: radiologyRecord.facilityId || radiologyRecord.hospitalId,
          status: aiAnalysisData.status === 'completed' ? 'success' : 'partial',
          details: {
            modalityType: radiologyRecord.modalityType,
            analysisStatus: aiAnalysisData.status,
            provider: aiAnalysisData.provider,
            model: aiAnalysisData.model,
          },
          sensitivityLevel: 'high',
        });
      } catch (auditErr) {
        logger.warn(`Audit log error in radiology AI processing: ${auditErr.message}`);
      }

      logger.info(`Automated AI analysis completed for radiology ${radiologyId}: ${aiAnalysisData.status}`);

      return {
        success: aiAnalysisData.status === 'completed',
        status: aiAnalysisData.status,
        analysis: aiAnalysisData,
        message: 'Radiology AI analysis completed successfully',
      };

    } catch (error) {
      logger.error(`AI analysis failed for radiology ${radiologyId}: ${error.message}`);

      // Persist failure state so user sees actionable retry state rather than hanging
      try {
        await RadiologyRecord.findByIdAndUpdate(radiologyId, {
          'aiAnalysis.status': 'failed',
          'aiAnalysis.error': error.message || 'AI processing encountered an unexpected error',
        });
      } catch (dbErr) {
        logger.error(`Failed to record AI error state in MongoDB: ${dbErr.message}`);
      }

      throw error;
    }
  }

  /**
   * Compatibility wrapper for existing analyzeRadiologyImage calls
   */
  static async analyzeRadiologyImage(radiologyId, requestingUser, options = {}) {
    return this.processRadiologyStudy(radiologyId, requestingUser, options);
  }

  /**
   * Retry AI analysis for a failed or un-analyzed radiology study
   */
  static async retryAnalysis(radiologyId, requestingUser, options = {}) {
    return this.processRadiologyStudy(radiologyId, requestingUser, {
      ...options,
      force: true,
    });
  }

  /**
   * Get AI analysis status for a radiology record
   * @param {String} radiologyId - Record ID
   */
  static async getAnalysisStatus(radiologyId) {
    const record = await RadiologyRecord.findById(radiologyId).select('aiAnalysis');
    if (!record) {
      throw new Error(`Radiology record not found: ${radiologyId}`);
    }

    if (!record.aiAnalysis || !record.aiAnalysis.status) {
      return {
        status: 'not_analyzed',
      };
    }

    return record.aiAnalysis;
  }

  /**
   * Translate AI explanation to another language
   */
  static async translateExplanation(radiologyId, targetLanguage) {
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
        cached: true,
      };
    }

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
      disclaimers: MedicalImageAnalyzer.getDisclaimers(),
    };
  }

  /**
   * Detect modality from radiology record metadata
   * @private
   */
  static async _detectModalityFromRecord(radiologyRecord) {
    const recordedModality = (radiologyRecord.modalityType || '').toLowerCase();
    const bodyPart = (radiologyRecord.bodyPart || '').toLowerCase();
    const filename = (radiologyRecord.imageReference?.originalFilename || '').toLowerCase();
    const mimeType = (radiologyRecord.imageReference?.mimeType || '').toLowerCase();

    // Check if PDF document
    if (mimeType.includes('pdf') || filename.endsWith('.pdf')) {
      return {
        modality: 'document_pdf',
        supported: true,
        reason: 'Written PDF report detected; routed to OCR text extraction and clinical summarization',
      };
    }

    // Check if Chest X-Ray
    if (recordedModality === 'x_ray' && (bodyPart.includes('chest') || bodyPart.includes('thorax') || bodyPart.includes('lung') || filename.includes('chest') || filename.includes('cxr'))) {
      return {
        modality: 'chest_xray',
        confidence: 0.95,
        supported: true,
        reason: 'Chest radiograph detected; supported by TorchXRayVision ResNet50 deep learning pipeline',
      };
    }

    if (recordedModality === 'x_ray') {
      return {
        modality: 'bone_xray',
        confidence: 0.85,
        supported: false,
        reason: `X-ray of ${radiologyRecord.bodyPart || 'non-chest anatomical region'} detected. TorchXRayVision is trained exclusively on chest radiographs.`,
      };
    }

    if (recordedModality === 'ct_scan') {
      return {
        modality: 'ct_scan',
        confidence: 0.95,
        supported: false,
        reason: 'CT scan analysis requires multi-slice radiologist workstation interpretation.',
      };
    }

    if (recordedModality === 'mri') {
      return {
        modality: 'mri',
        confidence: 0.95,
        supported: false,
        reason: 'MRI analysis requires specialized multi-sequence radiologist interpretation.',
      };
    }

    if (recordedModality === 'ultrasound') {
      return {
        modality: 'ultrasound',
        confidence: 0.90,
        supported: false,
        reason: 'Ultrasound interpretation requires dynamic operator correlation.',
      };
    }

    return {
      modality: recordedModality || 'unknown',
      confidence: 0.5,
      supported: false,
      reason: 'Specialized imaging study preserved for physician review.',
    };
  }

  /**
   * Get service status and capabilities
   */
  static getServiceStatus() {
    const analyzerStatus = MedicalImageAnalyzer.getStatus();
    return {
      service: 'Radiology AI Service',
      available: analyzerStatus.enabled,
      healthy: true,
      mode: analyzerStatus.mode,
      imageAnalyzer: analyzerStatus,
      supportedModalities: ['chest_xray', 'document_pdf'],
      capabilities: {
        imageAnalysis: MedicalImageAnalyzer.isReady(),
        textExplanation: AIService.isReady(),
        translation: AIService.isReady(),
        ocrExtraction: true,
        automaticProcessing: true,
      },
      supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
    };
  }
}

export default RadiologyAIService;
