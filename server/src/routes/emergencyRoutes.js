/**
 * Emergency Access & Emergency Profile Routes
 * Handles emergency profiles, contacts, incidents, and emergency access workflows
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole, requirePatientIsolation } from '../middleware/authentication.js';
import EmergencyProfileService from '../services/EmergencyProfileService.js';
import EmergencyAccessService from '../services/EmergencyAccessService.js';
import PatientService from '../services/PatientService.js';
import AuditService from '../services/AuditService.js';
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
      errors: errors.array(),
    });
  }
  next();
};

// ==================== EMERGENCY PROFILE ENDPOINTS ====================

/**
 * GET /api/v1/emergency/profile/:patientId
 * Get emergency profile for a patient
 * Accessible by: Patient, Healthcare professionals, System admin
 */
router.get(
  '/profile/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const profile = await EmergencyProfileService.getEmergencyProfile(
        patientId,
        req.user._id,
        req.user.role
      );

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      logger.error(`Failed to get emergency profile: ${error.message}`);
      res.status(403).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/emergency/profile/:patientId/allergies
 * Add allergy to emergency profile
 * Accessible by: Patient, Healthcare professionals
 */
router.post(
  '/profile/:patientId/allergies',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('allergen').trim().notEmpty().withMessage('Allergen required'),
    body('severity').isIn(['mild', 'moderate', 'severe', 'life-threatening']).withMessage('Valid severity required'),
    body('reaction').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { allergen, severity, reaction } = req.body;

      // Determine source based on user role
      const source = ['DOCTOR', 'NURSE', 'EMERGENCY'].includes(req.user.role)
        ? 'provider_verified'
        : 'patient_reported';

      const profile = await EmergencyProfileService.addAllergy(
        patientId,
        { allergen, severity, reaction },
        req.user._id,
        source
      );

      res.status(201).json({
        success: true,
        message: 'Allergy added to emergency profile',
        data: profile,
      });
    } catch (error) {
      logger.error(`Failed to add allergy: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/emergency/profile/:patientId/conditions
 * Add critical condition to emergency profile
 */
router.post(
  '/profile/:patientId/conditions',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('condition').trim().notEmpty().withMessage('Condition required'),
    body('severity').isIn(['mild', 'moderate', 'severe', 'life-threatening']).withMessage('Valid severity required'),
    body('onsetDate').optional().isISO8601().withMessage('Valid date required'),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { condition, severity, onsetDate } = req.body;

      const source = ['DOCTOR', 'NURSE', 'EMERGENCY'].includes(req.user.role)
        ? 'provider_verified'
        : 'patient_reported';

      const profile = await EmergencyProfileService.addCriticalCondition(
        patientId,
        { condition, severity, onsetDate },
        req.user._id,
        source
      );

      res.status(201).json({
        success: true,
        message: 'Critical condition added to emergency profile',
        data: profile,
      });
    } catch (error) {
      logger.error(`Failed to add critical condition: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/emergency/profile/:patientId/medications
 * Add current medication to emergency profile
 */
router.post(
  '/profile/:patientId/medications',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('medicationName').trim().notEmpty().withMessage('Medication name required'),
    body('dosage').optional().trim(),
    body('frequency').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { medicationName, dosage, frequency, indication, startDate, endDate } = req.body;

      const source = ['DOCTOR', 'NURSE', 'EMERGENCY'].includes(req.user.role)
        ? 'provider_verified'
        : 'patient_reported';

      const profile = await EmergencyProfileService.addCurrentMedication(
        patientId,
        { medicationName, dosage, frequency, indication, startDate, endDate },
        req.user._id,
        source
      );

      res.status(201).json({
        success: true,
        message: 'Medication added to emergency profile',
        data: profile,
      });
    } catch (error) {
      logger.error(`Failed to add medication: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/emergency/profile/:patientId/blood-group
 * Update blood group in emergency profile
 */
router.put(
  '/profile/:patientId/blood-group',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('group').isIn(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown']).withMessage('Valid blood group required'),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const { group } = req.body;

      const source = ['DOCTOR', 'NURSE', 'EMERGENCY'].includes(req.user.role)
        ? 'provider_verified'
        : 'patient_reported';

      const profile = await EmergencyProfileService.updateBloodGroup(
        patientId,
        { group },
        req.user._id,
        source
      );

      res.json({
        success: true,
        message: 'Blood group updated in emergency profile',
        data: profile,
      });
    } catch (error) {
      logger.error(`Failed to update blood group: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/emergency/profile/:patientId/summary
 * Get emergency summary (highest priority information only)
 * Accessible by: Healthcare professionals in emergency context
 */
router.get(
  '/profile/:patientId/summary',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'NURSE', 'EMERGENCY', 'PARAMEDIC'),
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const summary = await EmergencyProfileService.getEmergencySummary(patientId, req.user._id);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error(`Failed to get emergency summary: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ==================== EMERGENCY CONTACTS ENDPOINTS ====================

/**
 * POST /api/v1/emergency/contacts/:patientId
 * Add emergency contact
 * Accessible by: Patient
 */
router.post(
  '/contacts/:patientId',
  [
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
    body('contactName').trim().notEmpty().withMessage('Contact name required'),
    body('relationship').isIn(['spouse', 'parent', 'sibling', 'child', 'grandparent', 'friend', 'colleague', 'other_family', 'other']).withMessage('Valid relationship required'),
    body('contactMethods').isArray().withMessage('Contact methods must be an array'),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const contactData = req.body;

      const contact = await EmergencyProfileService.addEmergencyContact(
        patientId,
        contactData,
        req.user._id
      );

      res.status(201).json({
        success: true,
        message: 'Emergency contact added',
        data: contact,
      });
    } catch (error) {
      logger.error(`Failed to add emergency contact: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/emergency/contacts/:patientId
 * Get all emergency contacts for a patient
 * Accessible by: Patient, Healthcare professionals
 */
router.get(
  '/contacts/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const contacts = await EmergencyProfileService.getEmergencyContacts(patientId, req.user._id);

      res.json({
        success: true,
        data: contacts,
      });
    } catch (error) {
      logger.error(`Failed to get emergency contacts: ${error.message}`);
      res.status(403).json({
        success: false,
        message: error.message,
      });
    }
  }
);

// ==================== EMERGENCY ACCESS ENDPOINTS ====================

/**
 * POST /api/v1/emergency/access/request
 * Request emergency access to patient records
 * Accessible by: Healthcare professionals
 */
router.post(
  '/access/request',
  [
    body('patientId').optional().isMongoId().withMessage('Invalid patient ID'),
    body('patientIdentifier').optional().trim(),
    body('accessReason').isIn([
      'unconscious_patient',
      'accident',
      'acute_medical_emergency',
      'unable_to_provide_history',
      'critical_condition',
      'emergency_surgery_required',
      'severe_trauma',
      'drug_reaction',
      'other_emergency',
    ]).withMessage('Valid access reason required'),
    body('reasonDescription').optional().trim(),
    body('accessLevel').optional().isIn(['critical_alerts_only', 'emergency_profile', 'limited_history', 'full_history']),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'NURSE', 'PARAMEDIC', 'EMERGENCY', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN'),
  async (req, res) => {
    try {
      const accessData = {
        ...req.body,
        professionalId: req.user._id,
        professionalRole: req.user.role,
      };

      const access = await EmergencyAccessService.requestEmergencyAccess(accessData);

      res.status(201).json({
        success: true,
        message: 'Emergency access requested',
        data: access,
      });
    } catch (error) {
      logger.error(`Failed to request emergency access: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/emergency/access/:accessId/authorize
 * Authorize emergency access
 * Accessible by: HOSPITAL_ADMIN, EMERGENCY, SYSTEM_ADMIN
 */
router.post(
  '/access/:accessId/authorize',
  [
    param('accessId').trim().notEmpty().withMessage('Access ID required'),
    body('durationMinutes').optional().isInt({ min: 1, max: 1440 }).withMessage('Duration must be 1-1440 minutes'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'EMERGENCY', 'SYSTEM_ADMIN', 'DOCTOR'),
  async (req, res) => {
    try {
      const { accessId } = req.params;
      const { durationMinutes } = req.body;

      const access = await EmergencyAccessService.authorizeEmergencyAccess(
        accessId,
        req.user._id,
        durationMinutes || 60
      );

      res.json({
        success: true,
        message: 'Emergency access authorized',
        data: access,
      });
    } catch (error) {
      logger.error(`Failed to authorize emergency access: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/emergency/access/:accessId/deny
 * Deny emergency access
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.post(
  '/access/:accessId/deny',
  [
    param('accessId').trim().notEmpty().withMessage('Access ID required'),
    body('reason').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { accessId } = req.params;
      const { reason } = req.body;

      const access = await EmergencyAccessService.denyEmergencyAccess(
        accessId,
        req.user._id,
        reason
      );

      res.json({
        success: true,
        message: 'Emergency access denied',
        data: access,
      });
    } catch (error) {
      logger.error(`Failed to deny emergency access: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/emergency/access/:accessId
 * Get emergency access details
 * Accessible by: Requesting professional, Admins
 */
router.get(
  '/access/:accessId',
  [param('accessId').trim().notEmpty().withMessage('Access ID required')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { accessId } = req.params;

      const access = await EmergencyAccessService.getEmergencyAccess(accessId, req.user._id);

      res.json({
        success: true,
        data: access,
      });
    } catch (error) {
      logger.error(`Failed to get emergency access: ${error.message}`);
      res.status(403).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/emergency/access/:accessId/patient/:patientId/summary
 * Get emergency summary for authorized access
 * Accessible by: Authorized professional only
 */
router.get(
  '/access/:accessId/patient/:patientId/summary',
  [
    param('accessId').trim().notEmpty().withMessage('Access ID required'),
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { accessId, patientId } = req.params;

      const summary = await EmergencyAccessService.getEmergencySummary(
        patientId,
        accessId,
        req.user._id
      );

      res.json({
        success: true,
        data: summary,
      });
    } catch (error) {
      logger.error(`Failed to get emergency summary: ${error.message}`);
      res.status(403).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/emergency/access/:accessId/revoke
 * Revoke emergency access
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.post(
  '/access/:accessId/revoke',
  [
    param('accessId').trim().notEmpty().withMessage('Access ID required'),
    body('reason').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { accessId } = req.params;
      const { reason } = req.body;

      const access = await EmergencyAccessService.revokeEmergencyAccess(
        accessId,
        req.user._id,
        reason
      );

      res.json({
        success: true,
        message: 'Emergency access revoked',
        data: access,
      });
    } catch (error) {
      logger.error(`Failed to revoke emergency access: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/emergency/access-history/:patientId
 * Get emergency access history for a patient
 * Accessible by: Patient, Authorized providers
 */
router.get(
  '/access-history/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const history = await EmergencyAccessService.getAccessHistory(patientId, req.user._id);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      logger.error(`Failed to get access history: ${error.message}`);
      res.status(403).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/emergency/patient-by-identifier/:identifier
 * Look up patient by JeevaId or other identifier
 * Used during emergency identification
 * Accessible by: Healthcare professionals
 */
router.get(
  '/patient-by-identifier/:identifier',
  [param('identifier').trim().notEmpty().withMessage('Identifier required')],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'NURSE', 'PARAMEDIC', 'EMERGENCY'),
  async (req, res) => {
    try {
      const { identifier } = req.params;

      // Try to find by JeevaId first
      const patient = await PatientService.getPatientByJeevaId(identifier).catch(() => null);

      if (!patient) {
        return res.status(404).json({
          success: false,
          message: 'Patient not found',
        });
      }

      // Return minimal info for emergency identification
      res.json({
        success: true,
        data: {
          patientId: patient._id,
          jeevaId: patient.jeevaId,
          name: `${patient.personalIdentity.firstName} ${patient.personalIdentity.lastName}`,
          dateOfBirth: patient.personalIdentity.dateOfBirth,
          sex: patient.personalIdentity.sex,
          verificationStatus: patient.identityVerification.status,
        },
      });
    } catch (error) {
      logger.error(`Failed to look up patient: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * Error handler
 */
router.use((error, req, res, next) => {
  logger.error(`Emergency route error: ${error.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message,
  });
});

export default router;
