/**
 * Authorization Check Routes
 * Provides endpoints to verify clinical and operational authorization
 * Part of Phase 4: Healthcare Provider Authority Layer
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware } from '../middleware/authentication.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import StaffService from '../services/StaffService.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import Hospital from '../models/Hospital.js';
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
 * POST /api/v1/authorization/can-create-clinical-record
 * Check if user can create official clinical record for a patient at a facility
 * Comprehensive 9-point authorization check
 */
router.post(
  '/can-create-clinical-record',
  authMiddleware,
  [
    body('hospitalId').isMongoId().withMessage('Invalid facility ID'),
    body('patientId').isMongoId().withMessage('Invalid patient ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { hospitalId, patientId } = req.body;

      const authResult = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        req.user._id,
        hospitalId,
        patientId,
        {
          endpoint: '/authorization/can-create-clinical-record',
          checkOnly: true,
        }
      );

      res.json({
        success: true,
        authorized: authResult.authorized,
        error: authResult.error,
        checks: authResult.checks,
        details: {
          user: authResult.checks.user?.passed || false,
          professional: authResult.checks.professional?.passed || false,
          facility: authResult.checks.facility?.passed || false,
          staff: authResult.checks.staff?.passed || false,
          role: authResult.checks.role?.passed || false,
          permissions: authResult.checks.permissions?.passed || false,
          credentials: authResult.checks.credentials?.passed || false,
          patientAccess: authResult.checks.patientAccess?.passed || false,
          patientVerification: authResult.checks.patientVerification?.passed || false,
        },
      });
    } catch (error) {
      logger.error(`Authorization check failed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Authorization check failed',
      });
    }
  }
);

/**
 * GET /api/v1/authorization/my-facilities
 * Get list of facilities where user has active staff association
 */
router.get(
  '/my-facilities',
  authMiddleware,
  async (req, res) => {
    try {
      const staffRecords = await StaffService.getUserActiveStaffRecords(req.user._id);

      const facilities = staffRecords.map((s) => ({
        staffId: s._id,
        facilityId: s.hospitalId?._id,
        internalFacilityId: s.hospitalId?.facilityId,
        facilityName: s.hospitalId?.name,
        role: s.role,
        associationStatus: s.associationStatus,
        employmentStatus: s.employmentStatus,
        permissions: s.permissions,
      }));

      res.json({
        success: true,
        count: facilities.length,
        data: facilities,
      });
    } catch (error) {
      logger.error(`Failed to fetch user facilities: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch facilities',
      });
    }
  }
);

/**
 * GET /api/v1/authorization/professional-status
 * Get authenticated user's professional status
 */
router.get(
  '/professional-status',
  authMiddleware,
  async (req, res) => {
    try {
      const professional = await HealthcareProfessional.findOne({
        userId: req.user._id,
      }).populate('credentials');

      if (!professional) {
        return res.json({
          success: true,
          hasProfessionalProfile: false,
        });
      }

      const validCredentials = professional.credentials?.filter(
        (c) => c.status === 'verified' && (!c.expiryDate || new Date() <= c.expiryDate)
      );

      res.json({
        success: true,
        hasProfessionalProfile: true,
        data: {
          professionalId: professional._id,
          internalProfessionalId: professional.professionalId,
          firstName: professional.firstName,
          lastName: professional.lastName,
          professionalType: professional.professionalType,
          verificationStatus: professional.verificationStatus,
          accountStatus: professional.accountStatus,
          verificationExpired:
            professional.verification?.verificationExpiry &&
            new Date() > professional.verification.verificationExpiry,
          validCredentialsCount: validCredentials?.length || 0,
          canPerformClinicalOperations:
            professional.verificationStatus === 'verified' &&
            professional.accountStatus === 'active' &&
            validCredentials?.length > 0,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch professional status: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch professional status',
      });
    }
  }
);

/**
 * POST /api/v1/authorization/check-facility-role
 * Check if user has specific role at facility
 */
router.post(
  '/check-facility-role',
  authMiddleware,
  [
    body('hospitalId').isMongoId().withMessage('Invalid facility ID'),
    body('role').trim().notEmpty().withMessage('Role is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { hospitalId, role } = req.body;

      const hasRole = await StaffService.hasRoleAtFacility(
        req.user._id,
        hospitalId,
        role
      );

      res.json({
        success: true,
        hasRole: hasRole,
      });
    } catch (error) {
      logger.error(`Role check failed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Role check failed',
      });
    }
  }
);

/**
 * POST /api/v1/authorization/check-facility-permission
 * Check if user has specific permission at facility
 */
router.post(
  '/check-facility-permission',
  authMiddleware,
  [
    body('hospitalId').isMongoId().withMessage('Invalid facility ID'),
    body('permissionKey').trim().notEmpty().withMessage('Permission key is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { hospitalId, permissionKey } = req.body;

      const hasPermission = await StaffService.hasPermissionAtFacility(
        req.user._id,
        hospitalId,
        permissionKey
      );

      res.json({
        success: true,
        hasPermission: hasPermission,
      });
    } catch (error) {
      logger.error(`Permission check failed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Permission check failed',
      });
    }
  }
);

/**
 * GET /api/v1/authorization/facility/:hospitalId/status
 * Get facility authorization status
 */
router.get(
  '/facility/:hospitalId/status',
  authMiddleware,
  [param('hospitalId').isMongoId().withMessage('Invalid facility ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const hospital = await Hospital.findById(req.params.hospitalId);

      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
        });
      }

      const staffRecord = await StaffService.getStaffRecord(
        // Find active staff record
        (
          await require('../models/HospitalStaff.js').default.findOne({
            userId: req.user._id,
            hospitalId: req.params.hospitalId,
            associationStatus: 'active',
          })
        )?._id
      );

      res.json({
        success: true,
        data: {
          facilityId: hospital._id,
          internalFacilityId: hospital.facilityId,
          facilityName: hospital.name,
          verificationStatus: hospital.verificationStatus,
          status: hospital.status,
          userAssociation: staffRecord
            ? {
                associationStatus: staffRecord.associationStatus,
                role: staffRecord.role,
                permissions: staffRecord.permissions,
              }
            : null,
          canPerformOperations:
            hospital.verificationStatus === 'verified' && hospital.status === 'active',
        },
      });
    } catch (error) {
      logger.error(`Facility status check failed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Facility status check failed',
      });
    }
  }
);

/**
 * POST /api/v1/authorization/report
 * Generate detailed authorization report for debugging
 * ADMIN ONLY
 */
router.post(
  '/report',
  authMiddleware,
  [
    body('hospitalId').isMongoId().withMessage('Invalid facility ID'),
    body('patientId').isMongoId().withMessage('Invalid patient ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check admin role
      if (req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Admin role required',
        });
      }

      const { hospitalId, patientId } = req.body;

      const report = await ClinicalAuthorizationBoundary.getAuthorizationReport(
        req.user._id,
        hospitalId,
        patientId
      );

      await AuditService.logEvent({
        action: 'AUTHORIZATION_REPORT_GENERATED',
        actor: req.user._id,
        resource: 'Authorization',
        details: {
          hospitai dId: hospitalId,
          patientId: patientId,
        },
      });

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      logger.error(`Report generation failed: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Report generation failed',
      });
    }
  }
);

export default router;

