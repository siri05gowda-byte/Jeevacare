/**
 * Professional Management Routes
 * Handles healthcare professional registration, credentials, and verification
 * Part of Phase 4: Healthcare Provider Authority Layer
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import ProfessionalService from '../services/ProfessionalService.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import ProfessionalCredential from '../models/ProfessionalCredential.js';
import User from '../models/User.js';
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
 * POST /api/v1/professionals/register
 * Register a healthcare professional
 * Accessible by: User registering their own profile, or SYSTEM_ADMIN
 */
router.post(
  '/register',
  authMiddleware,
  [
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('email').optional().isEmail().withMessage('Valid email required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('professionalType')
      .isIn([
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'paramedic',
        'other_healthcare_professional',
      ])
      .withMessage('Valid professional type required'),
    body('specialization').optional().isArray().withMessage('Specialization must be an array'),
    body('licenseNumber').optional().trim(),
    body('registrationNumber').optional().trim(),
    body('yearsOfExperience').optional().isInt({ min: 0 }).withMessage('Valid years required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        professionalType,
        specialization,
        qualifications,
        licenseNumber,
        registrationNumber,
        yearsOfExperience,
        biography,
      } = req.body;

      // Check if professional already registered
      const existing = await HealthcareProfessional.findOne({
        userId: req.user._id,
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Professional profile already exists for this user',
        });
      }

      // Register professional
      const professional = await ProfessionalService.registerProfessional(
        req.user,
        {
          firstName,
          lastName,
          email: email || req.user.email,
          phone,
          professionalType,
          specialization,
          qualifications,
          licenseNumber,
          registrationNumber,
          yearsOfExperience,
          biography,
        },
        req.user._id
      );

      res.status(201).json({
        success: true,
        message: 'Professional profile created successfully',
        data: {
          professionalId: professional._id,
          internalProfessionalId: professional.professionalId,
          firstName: professional.firstName,
          lastName: professional.lastName,
          professionalType: professional.professionalType,
          verificationStatus: professional.verificationStatus,
          accountStatus: professional.accountStatus,
        },
      });
    } catch (error) {
      logger.error(`Failed to register professional: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/professionals/:professionalId
 * Get professional details
 * Accessible by: Professional themselves, facility staff, SYSTEM_ADMIN
 */
router.get(
  '/:professionalId',
  authMiddleware,
  [param('professionalId').isMongoId().withMessage('Invalid professional ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await ProfessionalService.getProfessionalById(
        req.params.professionalId
      );

      if (!professional) {
        return res.status(404).json({
          success: false,
          message: 'Professional not found',
        });
      }

      res.json({
        success: true,
        data: {
          professionalId: professional._id,
          internalProfessionalId: professional.professionalId,
          firstName: professional.firstName,
          lastName: professional.lastName,
          email: professional.email,
          phone: professional.phone,
          professionalType: professional.professionalType,
          specialization: professional.specialization,
          verificationStatus: professional.verificationStatus,
          accountStatus: professional.accountStatus,
          yearsOfExperience: professional.yearsOfExperience,
          biography: professional.biography,
          verification: professional.verification,
          credentials: professional.credentials,
          facilityAssociations: professional.facilityAssociations?.length || 0,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch professional: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch professional',
      });
    }
  }
);

/**
 * GET /api/v1/professionals/by-professional-id/:professionalId
 * Get professional by JeevaCare Professional ID
 */
router.get(
  '/by-professional-id/:professionalId',
  [param('professionalId').matches(/^HP-\d{6}-\d{5}$/).withMessage('Invalid JeevaCare Professional ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await ProfessionalService.getProfessionalByProfessionalId(
        req.params.professionalId
      );

      if (!professional) {
        return res.status(404).json({
          success: false,
          message: 'Professional not found',
        });
      }

      res.json({
        success: true,
        data: {
          professionalId: professional._id,
          internalProfessionalId: professional.professionalId,
          firstName: professional.firstName,
          lastName: professional.lastName,
          professionalType: professional.professionalType,
          verificationStatus: professional.verificationStatus,
          accountStatus: professional.accountStatus,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch professional: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch professional',
      });
    }
  }
);

/**
 * POST /api/v1/professionals/:professionalId/credentials
 * Add credential to professional
 * Accessible by: Professional themselves or SYSTEM_ADMIN
 */
router.post(
  '/:professionalId/credentials',
  authMiddleware,
  [
    param('professionalId').isMongoId().withMessage('Invalid professional ID'),
    body('credentialType')
      .isIn([
        'medical_license',
        'nursing_license',
        'pharmacy_license',
        'lab_technician_certification',
        'radiology_certification',
        'paramedic_certification',
        'specialty_certification',
        'degree',
        'diploma',
        'other_certification',
      ])
      .withMessage('Valid credential type required'),
    body('credentialName').trim().notEmpty().withMessage('Credential name is required'),
    body('credentialNumber').optional().trim(),
    body('issuingAuthority').trim().notEmpty().withMessage('Issuing authority is required'),
    body('issueDate').optional().isISO8601().withMessage('Valid issue date required'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await HealthcareProfessional.findById(req.params.professionalId);

      if (!professional) {
        return res.status(404).json({
          success: false,
          message: 'Professional not found',
        });
      }

      // Check authorization
      if (
        professional.userId.toString() !== req.user._id.toString() &&
        req.user.role !== 'SYSTEM_ADMIN'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const credential = await ProfessionalService.addCredential(
        req.params.professionalId,
        req.body,
        req.user._id
      );

      res.status(201).json({
        success: true,
        message: 'Credential added successfully',
        data: {
          credentialId: credential._id,
          credentialType: credential.credentialType,
          credentialName: credential.credentialName,
          status: credential.status,
          expiryDate: credential.expiryDate,
        },
      });
    } catch (error) {
      logger.error(`Failed to add credential: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/professionals/credentials/:credentialId/verify
 * Verify a credential (ADMIN ONLY)
 */
router.post(
  '/credentials/:credentialId/verify',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    param('credentialId').isMongoId().withMessage('Invalid credential ID'),
    body('verificationMethod')
      .isIn(['document_verification', 'government_verification', 'manual'])
      .withMessage('Valid verification method required'),
    body('verificationSource').optional().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const credential = await ProfessionalService.verifyCredential(
        req.params.credentialId,
        req.body,
        req.user._id
      );

      await AuditService.logEvent({
        action: 'professional_verified',
        actor: req.user._id,
        resource: 'ProfessionalCredential',
        resourceId: credential._id,
        details: {
          professionalId: credential.professionalId,
          credentialType: credential.credentialType,
        },
      });

      res.json({
        success: true,
        message: 'Credential verified successfully',
        data: {
          credentialId: credential._id,
          status: credential.status,
          verifiedAt: credential.verification?.verifiedAt,
        },
      });
    } catch (error) {
      logger.error(`Failed to verify credential: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/professionals/:professionalId/verify
 * Verify a professional (ADMIN ONLY)
 * Enables professional to perform clinical operations
 */
router.post(
  '/:professionalId/verify',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    param('professionalId').isMongoId().withMessage('Invalid professional ID'),
    body('verificationMethod')
      .isIn(['jeevacare_admin', 'government_verification', 'manual'])
      .withMessage('Valid verification method required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await ProfessionalService.verifyProfessional(
        req.params.professionalId,
        req.body,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Professional verified successfully',
        data: {
          professionalId: professional._id,
          internalProfessionalId: professional.professionalId,
          verificationStatus: professional.verificationStatus,
          verificationExpiry: professional.verification?.verificationExpiry,
        },
      });
    } catch (error) {
      logger.error(`Failed to verify professional: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/professionals/:professionalId/suspend
 * Suspend a professional account (ADMIN ONLY)
 */
router.post(
  '/:professionalId/suspend',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    param('professionalId').isMongoId().withMessage('Invalid professional ID'),
    body('reason').trim().notEmpty().withMessage('Suspension reason is required'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await ProfessionalService.suspendProfessional(
        req.params.professionalId,
        req.body,
        req.user._id
      );

      await AuditService.logEvent({
        action: 'professional_rejected',
        actor: req.user._id,
        resource: 'HealthcareProfessional',
        resourceId: professional._id,
        details: {
          professionalId: professional.professionalId,
          reason: req.body.reason,
        },
      });

      res.json({
        success: true,
        message: 'Professional suspended',
        data: {
          professionalId: professional._id,
          accountStatus: professional.accountStatus,
          suspensionExpiry: professional.suspension?.suspensionExpiryDate,
        },
      });
    } catch (error) {
      logger.error(`Failed to suspend professional: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/professionals/:professionalId/reactivate
 * Reactivate a suspended professional (ADMIN ONLY)
 */
router.post(
  '/:professionalId/reactivate',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [param('professionalId').isMongoId().withMessage('Invalid professional ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await ProfessionalService.reactivateProfessional(
        req.params.professionalId,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Professional reactivated',
        data: {
          professionalId: professional._id,
          accountStatus: professional.accountStatus,
        },
      });
    } catch (error) {
      logger.error(`Failed to reactivate professional: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/professionals/:professionalId/facility-associations
 * Get professional's facility associations
 * Accessible by: Professional themselves or SYSTEM_ADMIN
 */
router.get(
  '/:professionalId/facility-associations',
  authMiddleware,
  [param('professionalId').isMongoId().withMessage('Invalid professional ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const professional = await HealthcareProfessional.findById(req.params.professionalId);

      if (!professional) {
        return res.status(404).json({
          success: false,
          message: 'Professional not found',
        });
      }

      // Check authorization
      if (
        professional.userId.toString() !== req.user._id.toString() &&
        req.user.role !== 'SYSTEM_ADMIN'
      ) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const associations = await ProfessionalService.getFacilityAssociations(
        req.params.professionalId
      );

      res.json({
        success: true,
        count: associations.length,
        data: associations.map((a) => ({
          staffId: a._id,
          facilityId: a.hospitalId?._id,
          facilityName: a.hospitalId?.name,
          role: a.role,
          employmentStatus: a.employmentStatus,
          associationStatus: a.associationStatus,
          startDate: a.startDate,
          endDate: a.endDate,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch facility associations: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch facility associations',
      });
    }
  }
);

/**
 * GET /api/v1/professionals/pending-verification
 * Get all pending professionals (ADMIN ONLY)
 */
router.get(
  '/pending-verification',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const professionals = await ProfessionalService.getPendingVerifications();

      res.json({
        success: true,
        count: professionals.length,
        data: professionals.map((p) => ({
          professionalId: p._id,
          internalProfessionalId: p.professionalId,
          firstName: p.firstName,
          lastName: p.lastName,
          professionalType: p.professionalType,
          verificationStatus: p.verificationStatus,
          submittedAt: p.createdAt,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch pending professionals: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending professionals',
      });
    }
  }
);

export default router;

