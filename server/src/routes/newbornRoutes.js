/**
 * Newborn Registration Routes
 * Handles birth-first onboarding and newborn patient registration
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import PatientService from '../services/PatientService.js';
import GuardianService from '../services/GuardianService.js';
import AuditService from '../services/AuditService.js';
import Patient from '../models/Patient.js';
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
 * POST /api/v1/newborn/register
 * Register a newborn patient
 * Accessible by: DOCTOR, HOSPITAL_ADMIN (at authorized facility)
 */
router.post(
  '/register',
  [
    body('babyName.firstName').trim().notEmpty().withMessage('Baby first name required'),
    body('babyName.lastName').trim().notEmpty().withMessage('Baby last name required'),
    body('dateOfBirth').isISO8601().withMessage('Valid date of birth required'),
    body('timeOfBirth').optional().matches(/^\d{2}:\d{2}$/).withMessage('Valid time required (HH:MM)'),
    body('sex').isIn(['M', 'F', 'O']).withMessage('Valid sex required'),
    body('placeOfBirth').optional().trim(),
    body('birthWeight.value').optional().isFloat({ min: 0 }).withMessage('Valid birth weight required'),
    body('birthLength.value').optional().isFloat({ min: 0 }).withMessage('Valid birth length required'),
    body('headCircumference.value').optional().isFloat({ min: 0 }).withMessage('Valid head circumference required'),
    body('bloodGroup').optional().matches(/^[O|A|B|AB][+-]$/).withMessage('Valid blood group required'),
    body('parentInformation').optional().isObject().withMessage('Valid parent information required'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const {
        babyName,
        dateOfBirth,
        timeOfBirth,
        sex,
        placeOfBirth,
        birthWeight,
        birthLength,
        headCircumference,
        bloodGroup,
        parentInformation,
        birthObservations,
        birthComplications,
        neonatalInformation,
        hospitalId,
      } = req.body;

      // Validate date of birth is not in future
      const dob = new Date(dateOfBirth);
      if (dob > new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Date of birth cannot be in the future',
        });
      }

      // Create patient account for the newborn (system user)
      // Note: Real implementation might defer this or create a placeholder
      
      // Create newborn patient profile
      const newbornPatient = await PatientService.createPatient({
        personalIdentity: {
          firstName: babyName.firstName,
          lastName: babyName.lastName,
          dateOfBirth: dob,
          sex,
        },
        birthInformation: {
          placeOfBirth,
          timeOfBirth,
          birthWeight: birthWeight ? {
            value: birthWeight.value,
            unit: birthWeight.unit || 'kg',
          } : undefined,
          birthLength: birthLength ? {
            value: birthLength.value,
            unit: birthLength.unit || 'cm',
          } : undefined,
          headCircumference: headCircumference ? {
            value: headCircumference.value,
            unit: headCircumference.unit || 'cm',
          } : undefined,
          recordedAt: new Date(),
          recordedBy: req.user._id,
          facility: hospitalId,
        },
        parentInformation,
        createdBy: req.user._id,
      });

      // Store blood group if provided
      if (bloodGroup) {
        newbornPatient.bloodGroup = {
          group: bloodGroup,
          source: 'patient_reported',
          verificationStatus: 'pending_review',
          recordedAt: new Date(),
          recordedBy: req.user._id,
        };
        await newbornPatient.save();
      }

      // Store birth observations
      if (birthObservations) {
        newbornPatient.birthObservations = birthObservations;
        await newbornPatient.save();
      }

      // Log audit event
      await AuditService.logEvent({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'newborn_registration',
        resource: newbornPatient._id.toString(),
        resourceType: 'patient',
        patient: newbornPatient._id,
        hospital: hospitalId,
        details: {
          babyName: `${babyName.firstName} ${babyName.lastName}`,
          dateOfBirth,
          sex,
        },
        sensitivityLevel: 'high',
      });

      res.status(201).json({
        success: true,
        message: 'Newborn registered successfully',
        data: {
          patientId: newbornPatient._id,
          jeevaId: newbornPatient.jeevaId,
          babyName,
          dateOfBirth,
          sex,
          birthInformation: newbornPatient.birthInformation,
        },
      });
    } catch (error) {
      logger.error(`Failed to register newborn: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/newborn/:newbornPatientId/link-parent
 * Link a parent to a newborn patient
 * Accessible by: DOCTOR, HOSPITAL_ADMIN
 */
router.post(
  '/:newbornPatientId/link-parent',
  [
    param('newbornPatientId').isMongoId().withMessage('Invalid newborn patient ID'),
    body('relationship').isIn(['mother', 'father', 'legal_guardian', 'grandparent', 'uncle', 'aunt', 'sibling', 'other']).withMessage('Valid relationship required'),
    body('parentPatientId').optional().isMongoId().withMessage('Invalid parent patient ID'),
    body('parentName.firstName').optional().trim(),
    body('parentName.lastName').optional().trim(),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const { newbornPatientId } = req.params;
      const { relationship, parentPatientId, parentName } = req.body;

      // Verify newborn exists
      const newbornPatient = await PatientService.getPatientById(newbornPatientId);

      // Create parent relationship
      const parentRelationship = await GuardianService.createParentRelationship({
        childPatientId: newbornPatientId,
        parentPatientId,
        parentName,
        relationship,
        createdBy: req.user._id,
      });

      res.status(201).json({
        success: true,
        message: 'Parent linked to newborn successfully',
        data: {
          parentRelationship,
        },
      });
    } catch (error) {
      logger.error(`Failed to link parent: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/newborn/:newbornPatientId/link-guardian
 * Link a guardian to a newborn patient
 * Accessible by: DOCTOR, HOSPITAL_ADMIN
 */
router.post(
  '/:newbornPatientId/link-guardian',
  [
    param('newbornPatientId').isMongoId().withMessage('Invalid newborn patient ID'),
    body('guardianUserId').isMongoId().withMessage('Invalid guardian user ID'),
    body('relationship').isIn(['mother', 'father', 'legal_guardian', 'grandparent', 'uncle', 'aunt', 'sibling', 'other']).withMessage('Valid relationship required'),
    body('permissions').optional().isObject().withMessage('Valid permissions required'),
  ],
  handleValidationErrors,
  authMiddleware,
  requireRole('DOCTOR', 'HOSPITAL_ADMIN', 'NURSE'),
  async (req, res) => {
    try {
      const { newbornPatientId } = req.params;
      const { guardianUserId, relationship, permissions } = req.body;

      // Verify newborn exists
      const newbornPatient = await PatientService.getPatientById(newbornPatientId);

      // Create guardian relationship
      const guardianRelationship = await GuardianService.createGuardianRelationship({
        childPatientId: newbornPatientId,
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
        message: 'Guardian linked to newborn successfully',
        data: {
          guardianRelationship,
        },
      });
    } catch (error) {
      logger.error(`Failed to link guardian: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/newborn/:newbornPatientId
 * Get newborn patient profile with birth information
 * Accessible by: DOCTOR, HOSPITAL_ADMIN, GUARDIAN, PATIENT (if adult)
 */
router.get(
  '/:newbornPatientId',
  [param('newbornPatientId').isMongoId().withMessage('Invalid newborn patient ID')],
  handleValidationErrors,
  authMiddleware,
  async (req, res) => {
    try {
      const { newbornPatientId } = req.params;

      const newbornPatient = await PatientService.getPatientById(newbornPatientId);

      // Get parents and guardians
      const parents = await GuardianService.getPatientParents(newbornPatientId);
      const guardians = await GuardianService.getPatientGuardians(newbornPatientId);

      // Log audit event
      await AuditService.logPatientAccess({
        actor: req.user._id,
        actorRole: req.user.role,
        patient: newbornPatient._id,
        action: 'view_newborn_profile',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        data: {
          patient: newbornPatient,
          parents,
          guardians,
        },
      });
    } catch (error) {
      logger.error(`Failed to get newborn profile: ${error.message}`);
      res.status(404).json({
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
  logger.error(`Newborn route error: ${error.message}`);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message,
  });
});

export default router;
