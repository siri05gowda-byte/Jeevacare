/**
 * Medical Report Analysis Service
 * 
 * Unified multi-modal analysis for medical documents and images:
 * - Laboratory reports and blood tests
 * - Chest X-rays, bone X-rays, and other radiographs
 * - CT scans, MRI, ultrasound (detection + honest labeling)
 * - Discharge summaries and clinical notes
 * - Prescriptions and medications
 * - PDF reports and scanned documents
 * 
 * Architecture:
 * 1. Document classification (type + modality detection)
 * 2. Format handling (PDF, JPEG, PNG, etc.)
 * 3. Extraction pipeline (OCR for text, specialized processing for images)
 * 4. Structured data parsing (lab values, reference ranges)
 * 5. Model-based analysis (when applicable and available)
 * 6. Honest result labeling (real vs. mock, supported vs. unsupported)
 * 7. Unified persistence and authorization
 */

import Document from '../models/Document.js';
import LaboratoryResult from '../models/LaboratoryResult.js';
import RadiologyRecord from '../models/RadiologyRecord.js';
import OCRService from './OCRService.js';
import RadiologyAIService from './RadiologyAIService.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

// Import specialized adapters
import DocumentClassifier from '../adapters/DocumentClassifier.js';
import LabReportExtractor from '../adapters/LabReportExtractor.js';
import ModalityDetector from '../adapters/ModalityDetector.js';
import ImagePreprocessor from '../adapters/ImagePreprocessor.js';

class MedicalReportAnalysisService {
  /**
   * Analyze uploaded medical document (main entry point)
   * Orchestrates detection, extraction, and analysis workflow
   */
  static async analyzeDocument(documentId, requestingUser, options = {}) {
    try {
      logger.info(`[MRA] Analyzing document: ${documentId}`);
      
      // Retrieve document
      const doc = await Document.findById(documentId);
      if (!doc) {
        return { success: false, error: 'Document not found' };
      }

      // Check authorization
      if (doc.patientId.toString() !== requestingUser.patientId?.toString() &&
          requestingUser.role !== 'DOCTOR' &&
          requestingUser.role !== 'RADIOLOGY_TECHNICIAN') {
        return { success: false, error: 'Not authorized', code: 'UNAUTHORIZED' };
      }

      // Step 1: Classify document type
      logger.info(`[MRA] Step 1: Classifying document type`);
      const classification = await DocumentClassifier.classify(doc);
      
      if (!classification.success) {
        logger.warn(`[MRA] Document classification uncertain: ${classification.message}`);
        // Continue anyway - unsure documents can still be processed
      }

      // Step 2: Detect modality (for imaging documents)
      let modalityInfo = null;
      if (classification.documentClass === 'imaging' || classification.documentClass === 'radiology') {
        logger.info(`[MRA] Step 2: Detecting imaging modality`);
        modalityInfo = await ModalityDetector.detect(doc, classification);
      }

      // Step 3: Route to appropriate analyzer based on document type
      let analysisResult;

      if (classification.documentClass === 'laboratory') {
        logger.info(`[MRA] Step 3: Processing as laboratory report`);
        analysisResult = await this._analyzeLaboratoryReport(doc, requestingUser);
      } 
      else if (classification.documentClass === 'imaging' || classification.documentClass === 'radiology') {
        logger.info(`[MRA] Step 3: Processing as medical image`);
        analysisResult = await this._analyzeImageReport(doc, modalityInfo, requestingUser);
      } 
      else if (classification.documentClass === 'text-report') {
        logger.info(`[MRA] Step 3: Processing as text report`);
        analysisResult = await this._analyzeTextReport(doc, requestingUser);
      } 
      else {
        logger.info(`[MRA] Step 3: Processing generic document`);
        analysisResult = await this._analyzeGenericDocument(doc, requestingUser);
      }

      // Step 4: Persist result
      await this._persistAnalysisResult(doc, analysisResult, requestingUser);

      // Step 5: Audit
      await AuditService.logEvent({
        action: 'document_analysis',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: documentId,
        resourceType: 'document',
        patient: doc.patientId,
        status: analysisResult.success ? 'success' : 'partial',
        details: {
          documentType: doc.documentType,
          classification: classification.documentClass,
          modality: modalityInfo?.modality,
          analysisType: analysisResult.analysisType,
          isMockData: analysisResult.isMockData
        },
        sensitivityLevel: 'high'
      });

      logger.info(`[MRA] Document analysis complete: ${analysisResult.analysisType}`);

      return {
        success: true,
        document: documentId,
        analysisType: analysisResult.analysisType,
        classification: classification.documentClass,
        modality: modalityInfo?.modality,
        result: analysisResult,
        isMockData: analysisResult.isMockData || false
      };

    } catch (error) {
      logger.error(`[MRA] Analysis failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        code: 'ANALYSIS_FAILED'
      };
    }
  }

  /**
   * Analyze laboratory/blood-test reports
   */
  static async _analyzeLaboratoryReport(doc, requestingUser) {
    try {
      // Step 1: Extract text from document (if not already done)
      let extractedText = doc.ocrData?.extractedText;
      
      if (!extractedText) {
        logger.info(`[MRA] Extracting text from lab report document`);
        const ocrResult = await OCRService.extractText(doc._id, requestingUser._id);
        if (ocrResult.success) {
          extractedText = ocrResult.extractedText;
        } else {
          logger.warn(`[MRA] OCR extraction failed for lab report`);
          return {
            success: false,
            analysisType: 'laboratory',
            isMockData: false,
            error: 'Failed to extract text from document',
            limitations: ['OCR extraction unavailable']
          };
        }
      }

      // Step 2: Parse laboratory values
      logger.info(`[MRA] Parsing laboratory values from extracted text`);
      const labValues = await LabReportExtractor.extractLabValues(extractedText);

      if (!labValues.success) {
        logger.warn(`[MRA] Lab value extraction partial: ${labValues.message}`);
      }

      // Step 3: Create or update laboratory result
      const labResult = new LaboratoryResult({
        patientId: doc.patientId,
        linkedDocument: doc._id,
        labName: labValues.labName || 'Unknown Laboratory',
        labTestName: labValues.testName || 'Various Tests',
        sampleCollectionDate: labValues.collectionDate || new Date(),
        resultReceivedDate: new Date(),
        results: labValues.values || [],
        interpretation: labValues.interpretation || null,
        ocrStatus: 'extracted',
        ocrData: {
          extractedText: extractedText,
          confidence: doc.ocrData?.confidence || 0.8,
          extractedAt: new Date()
        },
        createdBy: requestingUser._id,
        verificationStatus: 'pending_review'
      });

      await labResult.save();
      logger.info(`[MRA] Laboratory result created: ${labResult._id}`);

      return {
        success: true,
        analysisType: 'laboratory',
        isMockData: false,
        resultId: labResult._id,
        labValues: labValues.values || [],
        testName: labValues.testName,
        abnormalResults: labValues.abnormal || [],
        interpretation: labValues.interpretation,
        limitations: labValues.limitations || []
      };

    } catch (error) {
      logger.error(`[MRA] Lab analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze medical images (radiographs, CT, MRI, ultrasound, etc.)
   */
  static async _analyzeImageReport(doc, modalityInfo, requestingUser) {
    try {
      const modality = modalityInfo?.modality || 'unknown';
      
      logger.info(`[MRA] Analyzing ${modality} image`);

      // Step 1: Validate modality support
      const supportedModalities = ['chest_xray', 'bone_xray'];
      const isSupported = supportedModalities.includes(modality);

      if (!isSupported) {
        logger.info(`[MRA] Modality ${modality} not supported for AI inference`);
        
        // Return honest result with detected modality but no inference
        return {
          success: true,
          analysisType: 'imaging',
          isMockData: false,
          modality: modality,
          anatomicalRegion: modalityInfo?.anatomicalRegion || 'Unknown',
          message: `Image detected as ${modality}. AI inference not available for this modality.`,
          supportedModalities: supportedModalities,
          limitations: [
            `AI inference not implemented for ${modality}`,
            `Image stored for manual radiologist review`,
            `Consider uploading chest X-rays for AI-assisted analysis`
          ]
        };
      }

      // Step 2: Route supported modalities to appropriate model
      if (modality === 'chest_xray') {
        logger.info(`[MRA] Routing to chest X-ray inference`);
        
        // Create radiology record
        const radiologyRecord = new RadiologyRecord({
          patientId: doc.patientId,
          studyDate: new Date(),
          reportDate: new Date(),
          modalityType: 'x_ray',
          bodyPart: 'chest',
          imageReference: {
            cloudinaryPublicId: doc.fileReference.cloudinaryPublicId,
            cloudinaryUrl: doc.fileReference.cloudinaryUrl,
            fileSize: doc.fileReference.fileSize,
            uploadedAt: doc.fileReference.uploadedAt
          },
          linkedDocuments: [doc._id],
          createdBy: requestingUser._id,
          verificationStatus: 'pending_review'
        });

        const savedRadiology = await radiologyRecord.save();
        logger.info(`[MRA] Radiology record created: ${savedRadiology._id}`);

        // Run inference
        const inferenceResult = await RadiologyAIService.analyzeRadiologyImage(
          savedRadiology._id,
          requestingUser,
          { language: 'en' }
        );

        return {
          success: true,
          analysisType: 'imaging',
          isMockData: inferenceResult.analysis?.isMockData || false,
          modality: 'chest_xray',
          radiologyRecordId: savedRadiology._id,
          findings: inferenceResult.analysis?.findings || [],
          summary: inferenceResult.analysis?.summary,
          explanation: inferenceResult.analysis?.explanation,
          confidence: inferenceResult.analysis?.confidence,
          disclaimers: inferenceResult.disclaimers
        };
      }

      return {
        success: false,
        analysisType: 'imaging',
        isMockData: false,
        error: `Modality ${modality} support not fully implemented`
      };

    } catch (error) {
      logger.error(`[MRA] Image analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze text-based reports (discharge summaries, clinical notes, etc.)
   */
  static async _analyzeTextReport(doc, requestingUser) {
    try {
      // Extract text from document
      let extractedText = doc.ocrData?.extractedText;
      
      if (!extractedText) {
        const ocrResult = await OCRService.extractText(doc._id, requestingUser._id);
        if (ocrResult.success) {
          extractedText = ocrResult.extractedText;
        } else {
          return {
            success: false,
            analysisType: 'text_report',
            isMockData: false,
            error: 'Failed to extract text'
          };
        }
      }

      // Return structured text report (no AI inference, just extraction)
      return {
        success: true,
        analysisType: 'text_report',
        isMockData: false,
        extractedText: extractedText,
        confidence: doc.ocrData?.confidence || 0.85,
        isOCRExtracted: !!doc.ocrData,
        limitations: [
          'Text extracted via OCR - manual review recommended',
          'No AI summarization of clinical notes (could introduce errors)',
          'Medical terminology preserved as-is from source'
        ]
      };

    } catch (error) {
      logger.error(`[MRA] Text report analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Fallback: Analyze unclassified generic documents
   */
  static async _analyzeGenericDocument(doc, requestingUser) {
    try {
      // Just perform OCR extraction
      let extractedText = doc.ocrData?.extractedText;
      
      if (!extractedText) {
        const ocrResult = await OCRService.extractText(doc._id, requestingUser._id);
        extractedText = ocrResult.success ? ocrResult.extractedText : null;
      }

      return {
        success: true,
        analysisType: 'generic_document',
        isMockData: false,
        documentType: doc.documentType,
        extractedText: extractedText || null,
        message: 'Document uploaded and catalogued. Unable to auto-analyze; medical professional review recommended.',
        limitations: [
          'Document type unclear - unable to apply specialized analysis',
          'Manual review recommended'
        ]
      };

    } catch (error) {
      logger.error(`[MRA] Generic document analysis failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Persist analysis results to appropriate models
   */
  static async _persistAnalysisResult(doc, result, requestingUser) {
    try {
      // Update document with analysis status
      doc.processingPipeline = doc.processingPipeline || {};
      doc.processingPipeline.analysisStatus = 'completed';
      doc.processingPipeline.analyzedAt = new Date();
      
      await doc.save();
      logger.info(`[MRA] Analysis result persisted`);

    } catch (error) {
      logger.error(`[MRA] Failed to persist result: ${error.message}`);
      // Don't throw - analysis succeeded, just persistence logging failed
    }
  }

  /**
   * Get analysis status for a document
   */
  static async getAnalysisStatus(documentId, requestingUser) {
    try {
      const doc = await Document.findById(documentId);
      if (!doc) {
        return { success: false, error: 'Document not found' };
      }

      // Check authorization
      if (doc.patientId.toString() !== requestingUser.patientId?.toString() &&
          requestingUser.role !== 'DOCTOR') {
        return { success: false, error: 'Not authorized', code: 'UNAUTHORIZED' };
      }

      return {
        success: true,
        documentId: documentId,
        analysisStatus: doc.processingPipeline?.analysisStatus || 'not_analyzed',
        analyzedAt: doc.processingPipeline?.analyzedAt,
        ocrStatus: doc.ocrStatus,
        documentType: doc.documentType,
        verificationStatus: doc.verificationStatus
      };

    } catch (error) {
      logger.error(`[MRA] Failed to get analysis status: ${error.message}`);
      return { success: false, error: error.message };
    }
  }
}

export default MedicalReportAnalysisService;
