/**
 * Guardian Management Routes
 * Handles guardian relationships, permissions, and minor-to-adult transitions
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import GuardianService from '../services/GuardianService.js';
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

/**
 * POST /api/v1/guardians/create
 * Create a new guardian relationship
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN, PARENT (creating for own child)
 */
router.post(
  '/create',
  [
    body('childPatientId').isMongoId().withMessage('Invalid child patient ID'),
    body('guardianUserId').isMongoId().withMessage('Invalid guardian user ID'),
    body('relationship').isIn(['mother', 'father', 'legal_guardian', 'grandparent', 'uncle', 'aunt', 'sibling', 'other']).withMessage('Valid relationship required'),
    body('permissions').optional().isObject().withMessage('Valid permissions required'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { childPatientId, guardianUserId, relationship, permissions } = req.body;

      const guardianRelationship = await GuardianService.createGuardianRelationship({
        childPatientId,
        guardianUserId,
        relationship,
        permissions: permissions || {
          viewMedicalRecords: true,
          manageAppointments: true,
          manageEmergencyProfile: true,
        },
        createdBy: req.user._id,
      });

      res.status(201).json({
        success: true,
        message: 'Guardian relationship created successfully',
        data: guardianRelationship,
      });
    } catch (error) {
      logger.error(`Failed to create guardian relationship: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/guardians/patient/:patientId
 * Get all guardians for a patient
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN, GUARDIAN (for their wards), PATIENT (for self)
 */
router.get(
  '/patient/:patientId',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const guardians = await GuardianService.getPatientGuardians(patientId);

      // Log audit event
      await AuditService.logEvent({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'view_guardians',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
      });

      res.json({
        success: true,
        data: guardians,
      });
    } catch (error) {
      logger.error(`Failed to get patient guardians: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/guardians/:relationshipId/verify
 * Verify a guardian relationship
 * Accessible by: SYSTEM_ADMIN
 */
router.put(
  '/:relationshipId/verify',
  [
    param('relationshipId').isMongoId().withMessage('Invalid relationship ID'),
    body('status').isIn(['verified', 'rejected']).withMessage('Valid status required'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('SYSTEM_ADMIN', 'HOSPITAL_ADMIN'),
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { status } = req.body;

      const guardianRelationship = await GuardianService.verifyGuardianRelationship(
        relationshipId,
        { status },
        req.user._id
      );

      res.json({
        success: true,
        message: `Guardian relationship ${status}`,
        data: guardianRelationship,
      });
    } catch (error) {
      logger.error(`Failed to verify guardian relationship: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/guardians/:relationshipId/permissions
 * Update guardian permissions
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.put(
  '/:relationshipId/permissions',
  [
    param('relationshipId').isMongoId().withMessage('Invalid relationship ID'),
    body('permissions').isObject().withMessage('Valid permissions required'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { permissions } = req.body;

      const guardianRelationship = await GuardianService.updateGuardianPermissions(
        relationshipId,
        permissions,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Guardian permissions updated successfully',
        data: guardianRelationship,
      });
    } catch (error) {
      logger.error(`Failed to update guardian permissions: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/guardians/:relationshipId/terminate
 * Terminate a guardian relationship
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.post(
  '/:relationshipId/terminate',
  [
    param('relationshipId').isMongoId().withMessage('Invalid relationship ID'),
    body('reason').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { reason } = req.body;

      const guardianRelationship = await GuardianService.terminateGuardianRelationship(
        relationshipId,
        reason,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Guardian relationship terminated',
        data: guardianRelationship,
      });
    } catch (error) {
      logger.error(`Failed to terminate guardian relationship: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/guardians/:relationshipId/suspend
 * Suspend a guardian relationship (temporary)
 * Accessible by: HOSPITAL_ADMIN, SYSTEM_ADMIN
 */
router.post(
  '/:relationshipId/suspend',
  [
    param('relationshipId').isMongoId().withMessage('Invalid relationship ID'),
    body('reason').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('HOSPITAL_ADMIN', 'SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const { relationshipId } = req.params;
      const { reason } = req.body;

      const guardianRelationship = await GuardianService.suspendGuardianRelationship(
        relationshipId,
        reason,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Guardian relationship suspended',
        data: guardianRelationship,
      });
    } catch (error) {
      logger.error(`Failed to suspend guardian relationship: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/guardians/patient/:patientId/transition-to-adult
 * Initiate minor-to-adult transition
 * Accessible by: SYSTEM_ADMIN, PATIENT (on themselves when eligible)
 */
router.post(
  '/patient/:patientId/transition-to-adult',
  [param('patientId').isMongoId().withMessage('Invalid patient ID')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { patientId } = req.params;

      const result = await GuardianService.initiateMinorToAdultTransition(
        patientId,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Minor-to-adult transition initiated',
        data: result,
      });
    } catch (error) {
      logger.error(`Failed to initiate transition: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/guardians/check/:userId/:patientId
 * Check if user is authorized guardian for a patient
 * Accessible by: Any authenticated user
 */
router.get(
  '/check/:userId/:patientId',
  [
    param('userId').isMongoId().withMessage('Invalid user ID'),
    param('patientId').isMongoId().withMessage('Invalid patient ID'),
  ],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { userId, patientId } = req.params;

      const isAuthorized = await GuardianService.isAuthorizedGuardian(
        userId,
        patientId,
        'viewMedicalRecords'
      );

      res.json({
        success: true,
        data: {
          isAuthorized,
        },
      });
    } catch (error) {
      logger.error(`Failed to check guardian authorization: ${error.message}`);
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
  logger.error(`Guardian route error: ${error.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message,
  });
});

export default router;
