import express from 'express';
import multer from 'multer';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import RadiologyService from '../services/RadiologyService.js';
import CloudinaryAdapter from '../adapters/CloudinaryAdapter.js';
import logger from '../utils/logger.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * Configure multer for radiology report uploads
 * Limits: 50MB per file, PDF and images only
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/dicom', // DICOM medical imaging format
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Allowed: PDF, JPEG, PNG, TIFF, DICOM`
        )
      );
    }
  },
});

/**
 * POST /api/radiology
 * Create a radiology record
 */
router.post('/', authMiddleware, authorize(['DOCTOR', 'RADIOLOGY_TECHNICIAN']), async (req, res) => {
  try {
    const {
      patientId,
      hospitalId,
      studyDate,
      reportDate,
      modalityType,
      bodyPart,
      clinicalIndication,
      findings,
      impression,
      recommendation,
      radiologistName,
      radiologistLicense,
      imageReference,
      encounterId,
    } = req.body;

    if (!patientId || !studyDate || !reportDate || !modalityType || !bodyPart || !hospitalId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, hospitalId, studyDate, reportDate, modalityType, bodyPart',
      });
    }

    const radiologyData = {
      patientId,
      hospitalId,
      encounterId,
      studyDate,
      reportDate,
      modalityType,
      bodyPart,
      clinicalIndication,
      findings,
      impression,
      recommendation,
      radiologistName,
      radiologistLicense,
      imageReference,
    };

    const radiologyRecord = await RadiologyService.createRadiologyRecord(radiologyData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: radiologyRecord,
      message: 'Radiology record created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/radiology/upload-report
 * Upload a radiology report with file (PDF/image)
 * Body (multipart/form-data):
 * - file: report file (required)
 * - patientId: string (required)
 * - hospitalId: string (required)
 * - studyDate: ISO8601 (required)
 * - reportDate: ISO8601 (required)
 * - modalityType: string (required)
 * - bodyPart: string (required)
 * - clinicalIndication: string (optional)
 * - radiologistName: string (optional)
 * - radiologistLicense: string (optional)
 * - encounterId: string (optional)
 */
router.post('/upload-report', authMiddleware, authorize(['DOCTOR', 'RADIOLOGY_TECHNICIAN']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
      });
    }

    const {
      patientId,
      hospitalId,
      studyDate,
      reportDate,
      modalityType,
      bodyPart,
      clinicalIndication,
      radiologistName,
      radiologistLicense,
      encounterId,
    } = req.body;

    if (!patientId || !studyDate || !reportDate || !modalityType || !bodyPart || !hospitalId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, hospitalId, studyDate, reportDate, modalityType, bodyPart',
      });
    }

    // Upload file to Cloudinary
    const cloudinaryResult = await CloudinaryAdapter.uploadFile(req.file.buffer, {
      folder: 'radiology-reports',
      resource_type: 'auto', // auto-detect PDF vs image
      access_mode: 'authenticated', // Require signed URLs
    });

    const radiologyData = {
      patientId,
      hospitalId,
      encounterId,
      studyDate,
      reportDate,
      modalityType,
      bodyPart,
      clinicalIndication,
      radiologistName,
      radiologistLicense,
      imageReference: {
        cloudinaryPublicId: cloudinaryResult.public_id,
        cloudinaryUrl: cloudinaryResult.secure_url,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        originalFilename: req.file.originalname,
      },
      // Set findings and impression as empty - will be populated by AI analysis or manual entry
      findings: '',
      impression: '',
      recommendation: '',
    };

    const radiologyRecord = await RadiologyService.createRadiologyRecord(radiologyData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    logger.info(`Radiology report uploaded: ${radiologyRecord._id} by user ${req.user.id}`);

    res.status(201).json({
      success: true,
      data: radiologyRecord,
      message: 'Radiology report uploaded successfully',
    });
  } catch (error) {
    logger.error('Error uploading radiology report:', error);
    res.status(error.message.includes('Not authorized') ? 403 : 500).json({
      error: error.message || 'Failed to upload radiology report',
    });
  }
});

/**
 * GET /api/radiology/:radiologyId
 * Get radiology record details
 */
router.get('/:radiologyId', authMiddleware, async (req, res) => {
  try {
    const { radiologyId } = req.params;

    const radiologyRecord = await RadiologyService.getRadiologyRecord(radiologyId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: radiologyRecord,
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/radiology/:radiologyId/download
 * Get secure download URL for radiology report file
 */
router.get('/:radiologyId/download', authMiddleware, async (req, res) => {
  try {
    const { radiologyId } = req.params;

    const radiologyRecord = await RadiologyService.getRadiologyRecord(radiologyId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    if (!radiologyRecord.imageReference?.cloudinaryPublicId) {
      return res.status(404).json({
        error: 'No file attached to this radiology record',
      });
    }

    // Generate secure download URL (expires in 1 hour)
    const downloadUrl = CloudinaryAdapter.getSecureDownloadUrl(
      radiologyRecord.imageReference.cloudinaryPublicId,
      3600 // 1 hour expiry
    );

    // Audit log the download
    const AuditEvent = (await import('../models/AuditEvent.js')).default;
    await AuditEvent.create({
      actor: req.user.id,
      actorRole: req.user.role,
      action: 'radiology_record_accessed',
      resource: radiologyId,
      resourceType: 'document',
      patient: radiologyRecord.patientId,
      hospital: radiologyRecord.hospitalId,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        downloadGenerated: true,
        fileName: radiologyRecord.imageReference.originalFilename,
      },
      sensitivityLevel: 'high',
    });

    logger.info(`Radiology download URL generated: ${radiologyId} by user ${req.user.id}`);

    res.json({
      success: true,
      data: {
        downloadUrl,
        filename: radiologyRecord.imageReference.originalFilename || 'radiology-report.pdf',
        mimeType: radiologyRecord.imageReference.mimeType,
        fileSize: radiologyRecord.imageReference.fileSize,
      },
    });
  } catch (error) {
    logger.error('Error generating radiology download URL:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/radiology/patient/:patientId
 * Get all radiology records for a patient
 * Query params:
 * - modalityType: optional (x_ray|ct_scan|mri|ultrasound|pet_scan|dexa_scan|other)
 * - bodyPart: optional
 * - hasCriticalFindings: optional (true/false)
 * - dateFrom: optional ISO8601
 * - dateTo: optional ISO8601
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { modalityType, bodyPart, hasCriticalFindings, dateFrom, dateTo } = req.query;

    const filters = {};
    if (modalityType) filters.modalityType = modalityType;
    if (bodyPart) filters.bodyPart = bodyPart;
    if (hasCriticalFindings !== undefined) filters.hasCriticalFindings = hasCriticalFindings === 'true';
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const records = await RadiologyService.getPatientRadiologyRecords(patientId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /api/radiology/:radiologyId/extract-text
 * Extract text from radiology report using OCR
 */
router.post('/:radiologyId/extract-text', authMiddleware, authorize(['DOCTOR', 'RADIOLOGY_TECHNICIAN', 'PATIENT']), async (req, res) => {
  try {
    const { radiologyId } = req.params;

    const radiologyRecord = await RadiologyService.getRadiologyRecord(radiologyId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    if (!radiologyRecord.imageReference?.cloudinaryPublicId) {
      return res.status(404).json({
        error: 'No file attached to this radiology record',
      });
    }

    // Check if already extracted
    if (radiologyRecord.ocrStatus === 'extracted' && radiologyRecord.ocrData?.extractedText) {
      logger.info(`OCR already extracted for radiology ${radiologyId}`);
      return res.json({
        success: true,
        data: {
          extractedText: radiologyRecord.ocrData.extractedText,
          confidence: radiologyRecord.ocrData.confidence,
          extractedAt: radiologyRecord.ocrData.extractedAt,
          cached: true,
        },
      });
    }

    // Import OCR service
    const OCRAdapter = (await import('../adapters/OCRAdapter.js')).default;
    const CloudinaryAdapter = (await import('../adapters/CloudinaryAdapter.js')).default;
    
    // Download file from Cloudinary
    const fileUrl = radiologyRecord.imageReference.cloudinaryUrl;
    const mimeType = radiologyRecord.imageReference.mimeType || 'application/pdf';
    
    // Check if file type is supported
    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
    if (!supportedTypes.includes(mimeType)) {
      return res.status(400).json({
        error: `Unsupported file type: ${mimeType}. OCR supports PDF and images only.`,
        code: 'UNSUPPORTED_FORMAT',
      });
    }

    logger.info(`Starting OCR extraction for radiology ${radiologyId}`);

    // Perform OCR extraction
    let extractionResult;
    try {
      extractionResult = await OCRAdapter.extractText(null, {
        documentType: radiologyRecord.modalityType,
        isUrl: true,
        url: fileUrl,
      });
    } catch (ocrError) {
      logger.error(`OCR extraction failed: ${ocrError.message}`);
      
      // Update record with failed status
      const RadiologyRecord = (await import('../models/RadiologyRecord.js')).default;
      await RadiologyRecord.findByIdAndUpdate(radiologyId, {
        ocrStatus: 'extraction_failed',
      });

      return res.status(500).json({
        error: 'OCR extraction failed',
        code: 'OCR_FAILED',
        details: ocrError.message,
      });
    }

    // Update radiology record with OCR data
    const RadiologyRecord = (await import('../models/RadiologyRecord.js')).default;
    const updatedRecord = await RadiologyRecord.findByIdAndUpdate(
      radiologyId,
      {
        ocrStatus: 'extracted',
        ocrData: {
          extractedText: extractionResult.extractedText,
          confidence: extractionResult.confidence,
          extractedAt: new Date(),
        },
      },
      { new: true }
    );

    // Audit log
    const AuditEvent = (await import('../models/AuditEvent.js')).default;
    await AuditEvent.create({
      actor: req.user.id,
      actorRole: req.user.role,
      action: 'ocr_processing',
      resource: radiologyId,
      resourceType: 'document',
      patient: radiologyRecord.patientId,
      hospital: radiologyRecord.hospitalId,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        ocrConfidence: extractionResult.confidence,
        textLength: extractionResult.extractedText?.length || 0,
      },
      sensitivityLevel: 'high',
    });

    logger.info(`OCR extraction complete for radiology ${radiologyId}`);

    res.json({
      success: true,
      data: {
        extractedText: extractionResult.extractedText,
        confidence: extractionResult.confidence,
        extractedAt: updatedRecord.ocrData.extractedAt,
        cached: false,
      },
    });
  } catch (error) {
    logger.error('Error extracting text from radiology report:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 500).json({
      error: error.message || 'Failed to extract text',
    });
  }
});

/**
 * POST /api/radiology/:radiologyId/explain
 * Generate AI explanation for radiology report
 */
router.post('/:radiologyId/explain', authMiddleware, async (req, res) => {
  try {
    const { radiologyId } = req.params;
    const { language = 'en' } = req.body;

    const radiologyRecord = await RadiologyService.getRadiologyRecord(radiologyId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    // Check if we have report text to explain
    const reportText = radiologyRecord.findings || radiologyRecord.impression || radiologyRecord.ocrData?.extractedText;
    
    if (!reportText) {
      return res.status(400).json({
        error: 'No report text available. Please upload a report with findings or extract text first.',
        code: 'NO_TEXT_AVAILABLE',
      });
    }

    logger.info(`Generating AI explanation for radiology ${radiologyId} in ${language}`);

    // Build medical content for AI explanation
    const medicalContent = JSON.stringify({
      studyType: radiologyRecord.modalityType?.replace('_', ' ').toUpperCase(),
      bodyPart: radiologyRecord.bodyPart,
      clinicalIndication: radiologyRecord.clinicalIndication,
      findings: radiologyRecord.findings || (radiologyRecord.ocrData?.extractedText ? '(Extracted via OCR)' : 'Not documented'),
      impression: radiologyRecord.impression || 'Not documented',
      recommendation: radiologyRecord.recommendation || 'Not documented',
      studyDate: new Date(radiologyRecord.studyDate).toLocaleDateString(),
    }, null, 2);

    // Call AI service for explanation
    const AIService = (await import('../services/AIService.js')).default;
    
    let explanation;
    try {
      explanation = await AIService.generateSimpleExplanation(medicalContent, { language });
    } catch (aiError) {
      logger.error(`AI explanation generation failed: ${aiError.message}`);
      
      return res.status(503).json({
        error: 'AI service unavailable',
        code: 'AI_SERVICE_ERROR',
        details: aiError.message,
        message: 'Unable to generate explanation at this time. Please try again later.',
      });
    }

    // Audit log
    const AuditEvent = (await import('../models/AuditEvent.js')).default;
    await AuditEvent.create({
      actor: req.user.id,
      actorRole: req.user.role,
      action: 'ai_explanation_generated',
      resource: radiologyId,
      resourceType: 'document',
      patient: radiologyRecord.patientId,
      hospital: radiologyRecord.hospitalId,
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      details: {
        language,
        modalityType: radiologyRecord.modalityType,
        bodyPart: radiologyRecord.bodyPart,
      },
      sensitivityLevel: 'medium',
    });

    logger.info(`AI explanation generated for radiology ${radiologyId}`);

    res.json({
      success: true,
      data: {
        radiologyId,
        language,
        explanation: explanation.explanation,
        keyPoints: explanation.keyPoints || [],
        uncertainties: explanation.uncertainties || [],
        disclaimers: [
          'This is an AI-generated explanation of your radiology report.',
          'It is intended to help you understand the medical terminology.',
          'This does not replace professional medical interpretation.',
          'Always consult your healthcare provider for medical decisions and treatment.',
        ],
        generatedAt: new Date(),
        metadata: {
          modalityType: radiologyRecord.modalityType,
          bodyPart: radiologyRecord.bodyPart,
          studyDate: radiologyRecord.studyDate,
          hasCriticalFindings: radiologyRecord.hasCriticalFindings,
        },
      },
    });
  } catch (error) {
    logger.error('Error generating AI explanation:', error);
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 500).json({
      error: error.message || 'Failed to generate explanation',
    });
  }
});

/**
 * PUT /api/radiology/:radiologyId
 * Update/amend radiology record
 * Body: {
 *   studyDate?: ISO8601,
 *   reportDate?: ISO8601,
 *   modalityType?: string,
 *   bodyPart?: string,
 *   clinicalIndication?: string,
 *   findings?: string,
 *   impression?: string,
 *   recommendation?: string,
 *   radiologistName?: string,
 *   radiologistLicense?: string,
 *   reason: string (required - reason for amendment)
 * }
 */
router.put('/:radiologyId', authMiddleware, authorize(['DOCTOR', 'RADIOLOGY_TECHNICIAN']), async (req, res) => {
  try {
    const { radiologyId } = req.params;
    const updateData = req.body;

    if (!updateData.reason) {
      return res.status(400).json({
        error: 'Missing required field: reason (for amendment)',
      });
    }

    const amendment = await RadiologyService.updateRadiologyRecord(radiologyId, updateData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: amendment,
      message: 'Radiology record amended successfully',
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/radiology/:radiologyId/flag-critical
 * Flag radiology record as having critical findings
 * Body: { findings: string }
 */
router.patch('/:radiologyId/flag-critical', authMiddleware, authorize(['DOCTOR', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { radiologyId } = req.params;
    const { findings } = req.body;

    if (!findings) {
      return res.status(400).json({
        error: 'Missing required field: findings',
      });
    }

    const radiologyRecord = await RadiologyService.flagAsCritical(radiologyId, { findings }, {
      _id: req.user.id,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: radiologyRecord,
      message: 'Radiology record flagged as critical',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
