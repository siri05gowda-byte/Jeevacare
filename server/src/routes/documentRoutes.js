import { Router } from 'express';
import { param, body, query, validationResult } from 'express-validator';
import multer from 'multer';
import DocumentService from '../services/DocumentService.js';
import AuthMiddleware from '../middleware/authMiddleware.js';
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
 */
router.post(
  '/upload',
  AuthMiddleware.verifyToken,
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

      // Upload document
      const result = await DocumentService.uploadDocument(
        {
          patientId,
          documentType,
          category,
          issuingFacility,
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
        return res.status(400).json({
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
      logger.error(`Document upload error: ${error.message}`);
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
  AuthMiddleware.verifyToken,
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
 * Get patient's documents
 * GET /api/v1/documents/patient/:patientId
 */
router.get(
  '/patient/:patientId',
  AuthMiddleware.verifyToken,
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
  AuthMiddleware.verifyToken,
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
  AuthMiddleware.verifyToken,
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

export default router;
