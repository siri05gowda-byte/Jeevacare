/**
 * Patient Routes
 * Handles patient profile, identity, and related operations
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole, requirePatientIsolation } from '../middleware/authentication.js';
import PatientService from '../services/PatientService.js';
import AuditService from '../services/AuditService.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * Middleware for validation error handling
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      success: false, 
      message: 'Validation error',
      errors: errors.array() 
    });
  }
  next();
};

/**
 * POST /api/v1/patients/register-patient
 * Register a new patient (called after user registration)
 * Accessible by: SYSTEM (during registration)
 */
router.post(
  '/register-patient',
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('personalIdentity.firstName').trim().notEmpty().withMessage('First name is required'),
    body('personalIdentity.lastName').trim().notEmpty().withMessage('Last name is required'),
    body('personalIdentity.dateOfBirth').isISO8601().withMessage('Valid date of birth required'),
    body('personalIdentity.sex').isIn(['M', 'F', 'O', 'Prefer not to say']).withMessage('Valid sex required'),
    body('personalIdentity.phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('personalIdentity.email').optional().isEmail().withMessage('Valid email required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { userId, personalIdentity, birthInformation, parentInformation } = req.body;

      // Create patient
      const patient = await PatientService.createPatient({
        userId,
        personalIdentity,
        birthInformation,
        parentInformation,
        createdBy: userId, // User creates their own patient profile
      });

      res.status(201).json({
        success: true,
        message: 'Patient profile created successfully',
        data: {
          patientId: patient._id,
          jeevaId: patient.jeevaId,
          personalIdentity: patient.personalIdentity,
          status: patient.status,
        },
      });
    } catch (error) {
      logger.error(`Failed to register patient: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/patients/profile
 * Get authenticated patient's own profile
 * Accessible by: PATIENT (own profile only)
 */
router.get(
  '/profile',
  authMiddleware,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const userId = req.user._id;

      // Get patient for this user
      const patient = await PatientService.getPatientByUserId(userId);

      // Log audit event
      await AuditService.logPatientAccess({
        actor: req.user._id,
        actorRole: 'PATIENT',
        patient: patient._id,
        action: 'view_patient_profile',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error(`Failed to get patient profile: ${error.message}`);
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/patients/:patientId
 * Get patient profile by ID
 * Accessible by: DOCTOR, HOSPITAL_ADMIN, EMERGENCY (with authorization)
 */
router.get(
  '/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'EMERGENCY', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN'),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const patient = await PatientService.getPatientById(patientId);

      // Log audit event
      await AuditService.logPatientAccess({
        actor: req.user._id,
        actorRole: req.user.role,
        patient: patient._id,
        action: 'view_patient_profile',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error(`Failed to get patient: ${error.message}`);
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/patients/jeevaid/:jeevaId
 * Get patient by JeevaId
 * Accessible by: DOCTOR, HOSPITAL_ADMIN, EMERGENCY (for patient lookup)
 */
router.get(
  '/jeevaid/:jeevaId',
  [param('jeevaId').matches(/^JJ\d{2}-[A-Z0-9]{5}$/i).withMessage('Invalid JeevaId format')],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'EMERGENCY'),
  async (req, res) => {
    try {
      const { jeevaId } = req.params;

      const patient = await PatientService.getPatientByJeevaId(jeevaId);

      // Log audit event (high sensitivity for emergency access)
      const sensitivityLevel = req.user.role === 'EMERGENCY' ? 'high' : 'medium';
      await AuditService.logEvent({
        actor: req.user._id,
        actorRole: req.user.role,
        action: req.user.role === 'EMERGENCY' ? 'emergency_patient_lookup' : 'patient_lookup',
        resource: patient._id.toString(),
        resourceType: 'patient',
        patient: patient._id,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        sensitivityLevel,
      });

      res.json({
        success: true,
        data: patient,
      });
    } catch (error) {
      logger.error(`Failed to get patient by JeevaId: ${error.message}`);
      res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/patients/profile
 * Update authenticated patient's own profile
 * Accessible by: PATIENT (own profile only)
 */
router.put(
  '/profile',
  [
    body('personalIdentity.phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('personalIdentity.email').optional().isEmail().withMessage('Valid email required'),
    body('preferences.language').optional().isIn(['en', 'hi', 'kn', 'te', 'ta', 'ml']).withMessage('Invalid language'),
    body('preferences.audioEnabled').optional().isBoolean().withMessage('audioEnabled must be boolean'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('PATIENT'),
  async (req, res) => {
    try {
      const userId = req.user._id;
      const { personalIdentity, preferences } = req.body;

      // Get patient
      const patient = await PatientService.getPatientByUserId(userId);

      // Build update object
      const updateData = {};
      if (personalIdentity) {
        updateData['personalIdentity.phone'] = personalIdentity.phone;
        updateData['personalIdentity.email'] = personalIdentity.email;
      }
      if (preferences) {
        Object.keys(preferences).forEach(key => {
          updateData[`preferences.${key}`] = preferences[key];
        });
      }

      // Update patient
      const updatedPatient = await PatientService.updatePatientProfile(
        patient._id,
        updateData,
        userId
      );

      res.json({
        success: true,
        message: 'Patient profile updated successfully',
        data: updatedPatient,
      });
    } catch (error) {
      logger.error(`Failed to update patient profile: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/patients/search
 * Search patients by name, JeevaId, phone, or email
 * Accessible by: DOCTOR, HOSPITAL_ADMIN
 */
router.get(
  '/search',
  [
    query('q').trim().notEmpty().withMessage('Search query required'),
    query('page').optional().isInt({ min: 1 }).withMessage('Valid page number required'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const { q, page, limit } = req.query;

      const results = await PatientService.searchPatients(q, {
        page: parseInt(page) || 1,
        limit: parseInt(limit) || 10,
      });

      // Log audit event
      await AuditService.logEvent({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'patient_search',
        details: {
          query: q,
          resultCount: results.patients.length,
        },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: results,
      });
    } catch (error) {
      logger.error(`Failed to search patients: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/detect-duplicates
 * Detect potential duplicate patients
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.post(
  '/:patientId/detect-duplicates',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const patient = await PatientService.getPatientById(patientId);

      // Run duplicate detection
      const duplicates = await PatientService.detectDuplicates(
        patient.personalIdentity.firstName,
        patient.personalIdentity.lastName,
        patient.personalIdentity.dateOfBirth,
        patient.personalIdentity.phone
      );

      // Filter out the patient itself
      const otherDuplicates = duplicates.filter(d => !d.patientId.equals(patientId));

      if (otherDuplicates.length > 0) {
        // Flag the patient as potential duplicate
        await PatientService.flagDuplicates(patientId, otherDuplicates, req.user._id);
      }

      res.json({
        success: true,
        message: `Found ${otherDuplicates.length} potential duplicate(s)`,
        data: {
          duplicateCount: otherDuplicates.length,
          duplicates: otherDuplicates.map(d => ({
            patientId: d.patientId,
            jeevaId: d.patient.jeevaId,
            name: `${d.patient.personalIdentity.firstName} ${d.patient.personalIdentity.lastName}`,
            dateOfBirth: d.patient.personalIdentity.dateOfBirth,
            matchScore: d.matchScore,
            matchType: d.matchType,
          })),
        },
      });
    } catch (error) {
      logger.error(`Failed to detect duplicates: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/patients/:patientId/resolve-duplicate
 * Resolve duplicate flag
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.post(
  '/:patientId/resolve-duplicate',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('resolutionType').isIn(['confirmed_duplicate', 'false_positive']).withMessage('Invalid resolution type'),
    body('linkedPatientId').optional().isMongoId().withMessage('Invalid linked patient ID'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { resolutionType, linkedPatientId } = req.body;

      const patient = await PatientService.resolveDuplicate(
        patientId,
        {
          type: resolutionType,
          linkedPatientId,
        },
        req.user._id
      );

      res.json({
        success: true,
        message: `Duplicate resolved as: ${resolutionType}`,
        data: patient,
      });
    } catch (error) {
      logger.error(`Failed to resolve duplicate: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/patients/:patientId/verify-identity
 * Update patient identity verification status
 * Accessible by: SYSTEM_ADMIN, HOSPITAL_ADMIN
 */
router.put(
  '/:patientId/verify-identity',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('status').isIn(['unverified', 'pending', 'verified', 'rejected']).withMessage('Invalid status'),
    body('method').notEmpty().withMessage('Verification method required'),
    body('verificationDocumentId').optional().isMongoId().withMessage('Invalid document ID'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN'),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { status, method, verificationDocumentId } = req.body;

      const patient = await PatientService.updateIdentityVerification(
        patientId,
        {
          status,
          method,
          verificationDocumentId,
        },
        req.user._id
      );

      res.json({
        success: true,
        message: 'Patient identity verification updated',
        data: patient,
      });
    } catch (error) {
      logger.error(`Failed to update identity verification: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Error handler for route
 */
router.use((error, req, res, next) => {
  logger.error(`Patient route error: ${error.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message,
  });
});

export default router;
