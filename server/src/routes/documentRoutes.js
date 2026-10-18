import { Router } from 'express';
import { param, body, query, validationResult } from 'express-validator';
import multer from 'multer';
import DocumentService from '../services/DocumentService.js';
import MedicalReportAnalysisService from '../services/MedicalReportAnalysisService.js';
import Notification from '../models/Notification.js';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import logger from '../utils/logger.js';

const router = Router();

/**
 * Configure multer for file uploads
 * Limits: 50MB per file, only common document/image types
 */
const upload = multer({
  storage: multer.memoryStorage(), // Store in memory, then upload to Cloudinary
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
  fileFilter: (req, file, cb) => {
    // Allowed MIME types for clinical documents
    const allowedMimes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/tiff',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
      'application/msword', // DOC
      'text/plain', // TXT
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          `File type not allowed: ${file.mimetype}. Allowed: PDF, JPEG, PNG, TIFF, DOCX, DOC, TXT`
        )
      );
    }
  },
});

/**
 * Upload medical document
 * POST /api/v1/documents/upload
 * Accessible by staff roles: DOCTOR, LAB_TECHNICIAN, RADIOLOGY_TECHNICIAN, NURSE, HOSPITAL_ADMIN
 * Patients cannot upload documents for other patients using this endpoint
 */
router.post(
  '/upload',
  authMiddleware,
  requireRole('DOCTOR', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'NURSE', 'HOSPITAL_ADMIN', 'PATIENT'),
  upload.single('file'),
  [
    body('patientId')
      .trim()
      .notEmpty()
      .withMessage('patientId is required'),
    body('documentType')
      .trim()
      .notEmpty()
      .withMessage('documentType is required')
      .isIn([
        'discharge_summary',
        'lab_result',
        'radiology_report',
        'prescription',
        'vaccination_record',
        'imaging',
        'medical_record',
        'other',
      ])
      .withMessage('Invalid documentType'),
    body('category')
      .trim()
      .optional(),
    body('issuingFacility')
      .trim()
      .optional(),
    body('documentDate')
      .optional()
      .isISO8601()
      .withMessage('documentDate must be ISO8601 format'),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      // Validate file
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const {
        patientId,
        documentType,
        category,
        issuingFacility,
        documentDate,
      } = req.body;
      const requesterId = req.user._id;

      logger.info(
        `Uploading document for patient ${patientId}: ${req.file.originalname} (${req.file.size} bytes)`
      );

      const resolvedFacility = issuingFacility || req.user.facilityName || req.user.facilityId || (req.user.role === 'PATIENT' ? 'Patient Upload' : null);

      // Upload document
      const result = await DocumentService.uploadDocument(
        {
          patientId,
          documentType,
          category,
          issuingFacility: resolvedFacility,
          documentDate: documentDate ? new Date(documentDate) : new Date(),
        },
        requesterId,
        req.file.buffer,
        {
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
        }
      );

      if (!result.success) {
        const statusCode = result.code === 'STORAGE_NOT_CONFIGURED' ? 503 : (result.code === 'UNAUTHORIZED' ? 403 : 400);
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      // Create notification for patient about new document
      try {
        const Patient = (await import('../models/Patient.js')).default;
        const patientRecord = await Patient.findById(result.document.patientId);
        const targetUserId = patientRecord?.userId || result.document.patientId;

        await Notification.createNotification({
          userId: targetUserId,
          type: 'document_uploaded',
          title: 'New Document Uploaded',
          message: `A new ${documentType.replace(/_/g, ' ')} has been uploaded to your medical records${resolvedFacility ? ` by ${resolvedFacility}` : ''}.`,
          link: '/documents',
          metadata: {
            documentId: result.document._id,
            documentType,
            uploadedBy: requesterId,
            issuingFacility: resolvedFacility,
          },
        });
      } catch (notifError) {
        logger.warn(`Failed to create document upload notification: ${notifError.message}`);
        // Don't fail the upload if notification fails
      }

      res.json({
        success: true,
        document: result.document,
      });
    } catch (error) {
      logger.error(`Document upload error: ${error.message}`);
      if (error.code === 'STORAGE_NOT_CONFIGURED' || error.message?.includes('Cloudinary not configured') || error.message?.includes('storage not configured')) {
        return res.status(503).json({
          success: false,
          error: error.message || 'Document storage is currently unavailable',
          code: 'STORAGE_NOT_CONFIGURED',
        });
      }
      res.status(500).json({
        success: false,
        error: 'Failed to upload document',
        details: error.message,
      });
    }
  }
);

/**
 * Get document by ID
 * GET /api/v1/documents/:documentId
 */
router.get(
  '/:documentId',
  authMiddleware,
  [param('documentId').isMongoId().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.params;
      const requesterId = req.user._id;

      const result = await DocumentService.getDocument(documentId, requesterId);

      if (!result.success) {
        return res.status(result.statusCode || 404).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      res.json({
        success: true,
        document: result.document,
      });
    } catch (error) {
      logger.error(`Failed to get document: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve document',
        details: error.message,
      });
    }
  }
);

/**
 * Download document file
 * GET /api/v1/documents/:documentId/download
 */
router.get(
  '/:documentId/download',
  authMiddleware,
  [param('documentId').isMongoId().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.params;
      const requesterId = req.user._id;

      const result = await DocumentService.getDocument(documentId, requesterId);

      if (!result.success) {
        return res.status(result.statusCode || 404).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      const document = result.document;
      
      // Check if file reference exists
      if (!document.fileReference?.cloudinaryPublicId || !document.fileReference?.cloudinaryUrl) {
        return res.status(404).json({
          success: false,
          error: 'Document file not found in storage',
          code: 'FILE_NOT_FOUND',
        });
      }

      // Get secure download URL from Cloudinary
      const CloudinaryAdapter = (await import('../adapters/CloudinaryAdapter.js')).default;
      const downloadUrl = await CloudinaryAdapter.getSecureDownloadUrl(
        document.fileReference.cloudinaryPublicId,
        3600 // 1 hour expiry
      );

      if (!downloadUrl) {
        return res.status(500).json({
          success: false,
          error: 'Failed to generate download link',
          code: 'DOWNLOAD_GENERATION_FAILED',
        });
      }

      // Log download in audit trail
      await (await import('../services/AuditService.js')).default.logEvent({
        actor: requesterId,
        action: 'document_downloaded',
        resource: documentId,
        resourceType: 'document',
        patient: document.patientId,
        status: 'success',
        details: {
          documentName: document.name,
          fileSize: document.fileReference.fileSize,
        },
      });

      res.json({
        success: true,
        downloadUrl,
        fileName: document.name,
      });
    } catch (error) {
      logger.error(`Failed to download document: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to generate download link',
        details: error.message,
      });
    }
  }
);

/**
 * Get patient's documents
 * GET /api/v1/documents/patient/:patientId
 */
router.get(
  '/patient/:patientId',
  authMiddleware,
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    query('type')
      .optional()
      .isIn([
        'discharge_summary',
        'lab_result',
        'radiology_report',
        'prescription',
        'vaccination_record',
        'imaging',
        'medical_record',
        'other',
      ]),
    query('status')
      .optional()
      .isIn(['patient_uploaded', 'verified', 'pending_verification']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { patientId } = req.params;
      const { type, status } = req.query;
      const requesterId = req.user._id;

      const filters = {};
      if (type) filters.type = type;
      if (status) filters.status = status;

      const result = await DocumentService.getPatientDocuments(
        patientId,
        requesterId,
        filters
      );

      if (!result.success) {
        return res.status(result.statusCode || 403).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      res.json({
        success: true,
        documents: result.documents,
        count: result.documents?.length || 0,
      });
    } catch (error) {
      logger.error(`Failed to get patient documents: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve documents',
        details: error.message,
      });
    }
  }
);

/**
 * Delete document
 * DELETE /api/v1/documents/:documentId
 */
router.delete(
  '/:documentId',
  authMiddleware,
  [param('documentId').isMongoId().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.params;
      const requesterId = req.user._id;

      logger.info(`Deleting document: ${documentId}`);

      const result = await DocumentService.deleteDocument(documentId, requesterId);

      if (!result.success) {
        return res.status(result.statusCode || 403).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      res.json({
        success: true,
        message: 'Document deleted successfully',
      });
    } catch (error) {
      logger.error(`Failed to delete document: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to delete document',
        details: error.message,
      });
    }
  }
);

/**
 * Verify document
 * POST /api/v1/documents/:documentId/verify
 */
router.post(
  '/:documentId/verify',
  authMiddleware,
  [
    param('documentId').isMongoId().withMessage('Invalid document ID'),
    body('verificationStatus')
      .optional()
      .isIn(['verified', 'rejected', 'pending_review']),
    body('verificationNotes')
      .optional()
      .trim(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.params;
      const { verificationStatus, verificationNotes } = req.body;
      const requesterId = req.user._id;

      const result = await DocumentService.verifyDocument(
        documentId,
        requesterId,
        {
          verificationStatus,
          verificationNotes,
        }
      );

      if (!result.success) {
        return res.status(result.statusCode || 403).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      res.json({
        success: true,
        document: result.document,
      });
    } catch (error) {
      logger.error(`Failed to verify document: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to verify document',
        details: error.message,
      });
    }
  }
);

/**
 * Analyze medical document with multi-modal support
 * POST /api/v1/documents/:documentId/analyze-medical-report
 * 
 * Accepts: laboratory reports, radiology images, text-based medical documents
 * Returns: structured analysis, detected modality, extracted values, AI findings (if supported)
 * Honest capability labeling: shows real results or clear "unsupported" messages
 */
router.post(
  '/:documentId/analyze-medical-report',
  authMiddleware,
  [
    param('documentId').isMongoId().withMessage('Invalid document ID'),
    body('options')
      .optional()
      .isObject()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.params;
      const { options = {} } = req.body;
      const requesterId = req.user._id;

      logger.info(`[API] Analyzing medical report: ${documentId}`);

      // Call analysis service
      const result = await MedicalReportAnalysisService.analyzeDocument(
        documentId,
        req.user,
        options
      );

      if (!result.success) {
        const statusCode = result.code === 'UNAUTHORIZED' ? 403 : 400;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code,
        });
      }

      // Log audit trail
      try {
        const AuditService = (await import('../services/AuditService.js')).default;
        await AuditService.logEvent({
          actor: requesterId,
          action: 'medical_report_analyzed',
          resource: documentId,
          resourceType: 'document',
          patient: result.document,
          status: 'success',
          details: {
            analysisType: result.analysisType,
            classification: result.classification,
            modality: result.modality,
            isMockData: result.isMockData
          },
          sensitivityLevel: 'high'
        });
      } catch (auditError) {
        logger.warn(`Failed to log analysis audit: ${auditError.message}`);
      }

      res.json({
        success: true,
        document: result.document,
        analysisType: result.analysisType,
        classification: result.classification,
        modality: result.modality,
        result: result.result,
        isMockData: result.isMockData || false,
        message: 'Medical report analysis completed'
      });

    } catch (error) {
      logger.error(`[API] Medical report analysis error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze medical report',
        code: 'ANALYSIS_FAILED',
        details: error.message
      });
    }
  }
);

/**
 * Get analysis status for a document
 * GET /api/v1/documents/:documentId/analysis-status
 */
router.get(
  '/:documentId/analysis-status',
  authMiddleware,
  [param('documentId').isMongoId().withMessage('Invalid document ID')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { documentId } = req.params;

      const result = await MedicalReportAnalysisService.getAnalysisStatus(
        documentId,
        req.user
      );

      if (!result.success) {
        const statusCode = result.code === 'UNAUTHORIZED' ? 403 : 404;
        return res.status(statusCode).json({
          success: false,
          error: result.error,
          code: result.code
        });
      }

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      logger.error(`Failed to get analysis status: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve analysis status',
        details: error.message
      });
    }
  }
);

export default router;
