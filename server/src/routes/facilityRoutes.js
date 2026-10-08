/**
 * Facility Management Routes
 * Handles hospital/facility registration, verification, and management
 * Part of Phase 4: Healthcare Provider Authority Layer
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import {
  blockSuspendedFacilities,
  requireFacilityRole,
  requireHospitalAdmin,
  attachFacilityContext,
} from '../middleware/facilityRBAC.js';
import FacilityService from '../services/FacilityService.js';
import Hospital from '../models/Hospital.js';
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
 * POST /api/v1/facilities/register
 * Register a new healthcare facility
 * Accessible by: SYSTEM_ADMIN, or hospital representatives submitting registration
 */
router.post(
  '/register',
  authMiddleware,
  [
    body('name').trim().notEmpty().withMessage('Facility name is required'),
    body('type')
      .isIn(['hospital', 'clinic', 'diagnostic_center', 'pharmacy', 'laboratory'])
      .withMessage('Valid facility type required'),
    body('registrationNumber').trim().notEmpty().withMessage('Registration number is required'),
    body('address.street').trim().notEmpty().withMessage('Street address is required'),
    body('address.city').trim().notEmpty().withMessage('City is required'),
    body('address.state').trim().notEmpty().withMessage('State is required'),
    body('address.postalCode').trim().notEmpty().withMessage('Postal code is required'),
    body('address.country').trim().notEmpty().withMessage('Country is required'),
    body('contact.phone').isMobilePhone().withMessage('Valid phone number required'),
    body('contact.email').isEmail().withMessage('Valid email required'),
    body('departments').optional().isArray().withMessage('Departments must be an array'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, type, registrationNumber, address, contact, departments } = req.body;

      // Create facility
      const facility = await FacilityService.registerFacility(
        {
          name,
          type,
          registrationNumber,
          address,
          contact,
          departments: departments || [],
        },
        req.user._id
      );

      await AuditService.logEvent({
        action: 'FACILITY_REGISTERED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
          name: name,
          type: type,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Facility registered successfully',
        data: {
          facilityId: facility._id,
          internalFacilityId: facility.facilityId,
          name: facility.name,
          registrationNumber: facility.registrationNumber,
          verificationStatus: facility.verificationStatus,
          status: facility.status,
        },
      });
    } catch (error) {
      logger.error(`Failed to register facility: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/facilities/:facilityId
 * Get facility details
 * Accessible by: Anyone (public facility info)
 */
router.get(
  '/:facilityId',
  [param('facilityId').isMongoId().withMessage('Invalid facility ID')],
  handleValidationErrors,
  attachFacilityContext,
  async (req, res) => {
    try {
      const facility = await FacilityService.getFacilityById(req.params.facilityId);

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
        });
      }

      res.json({
        success: true,
        data: {
          facilityId: facility._id,
          internalFacilityId: facility.facilityId,
          name: facility.name,
          type: facility.type,
          registrationNumber: facility.registrationNumber,
          verificationStatus: facility.verificationStatus,
          status: facility.status,
          address: facility.address,
          contact: facility.contact,
          departments: facility.departments,
          createdAt: facility.createdAt,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch facility: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch facility',
      });
    }
  }
);

/**
 * GET /api/v1/facilities/by-facility-id/:facilityId
 * Get facility by JeevaCare Facility ID
 * Accessible by: Anyone
 */
router.get(
  '/by-facility-id/:facilityId',
  [param('facilityId').matches(/^FH-\d{6}-\d{5}$/).withMessage('Invalid JeevaCare Facility ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await FacilityService.getFacilityByFacilityId(req.params.facilityId);

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
        });
      }

      res.json({
        success: true,
        data: {
          facilityId: facility._id,
          internalFacilityId: facility.facilityId,
          name: facility.name,
          type: facility.type,
          verificationStatus: facility.verificationStatus,
          status: facility.status,
          address: facility.address,
          contact: facility.contact,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch facility by ID: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch facility',
      });
    }
  }
);

/**
 * POST /api/v1/facilities/:facilityId/verify
 * Verify a facility (ADMIN ONLY)
 * Transitions to verified status, enables clinical operations
 */
router.post(
  '/:facilityId/verify',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    param('facilityId').isMongoId().withMessage('Invalid facility ID'),
    body('verificationMethod')
      .isIn(['jeevacare_admin', 'government_verification', 'manual'])
      .withMessage('Valid verification method required'),
    body('notes').optional().trim(),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { verificationMethod, notes } = req.body;

      const facility = await FacilityService.verifyFacility(
        req.params.facilityId,
        {
          verificationMethod,
          notes,
        },
        req.user._id
      );

      await AuditService.logEvent({
        action: 'FACILITY_VERIFIED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
          verificationMethod,
        },
      });

      res.json({
        success: true,
        message: 'Facility verified successfully',
        data: {
          facilityId: facility._id,
          internalFacilityId: facility.facilityId,
          verificationStatus: facility.verificationStatus,
          status: facility.status,
          verificationExpiry: facility.verification?.verificationExpiry,
        },
      });
    } catch (error) {
      logger.error(`Failed to verify facility: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/facilities/:facilityId/reject
 * Reject a facility (ADMIN ONLY)
 */
router.post(
  '/:facilityId/reject',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    param('facilityId').isMongoId().withMessage('Invalid facility ID'),
    body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason } = req.body;

      const facility = await FacilityService.rejectFacility(
        req.params.facilityId,
        { reason },
        req.user._id
      );

      await AuditService.logEvent({
        action: 'FACILITY_REJECTED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
          reason,
        },
      });

      res.json({
        success: true,
        message: 'Facility rejected',
        data: {
          facilityId: facility._id,
          verificationStatus: facility.verificationStatus,
          rejectionReason: reason,
        },
      });
    } catch (error) {
      logger.error(`Failed to reject facility: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/facilities/:facilityId/suspend
 * Suspend a facility (ADMIN ONLY)
 */
router.post(
  '/:facilityId/suspend',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    param('facilityId').isMongoId().withMessage('Invalid facility ID'),
    body('reason').trim().notEmpty().withMessage('Suspension reason is required'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { reason, expiryDate } = req.body;

      const facility = await FacilityService.suspendFacility(
        req.params.facilityId,
        {
          reason,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
        },
        req.user._id
      );

      await AuditService.logEvent({
        action: 'FACILITY_SUSPENDED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
          reason,
          expiryDate,
        },
      });

      res.json({
        success: true,
        message: 'Facility suspended',
        data: {
          facilityId: facility._id,
          status: facility.status,
          suspensionExpiry: facility.suspension?.suspensionExpiryDate,
        },
      });
    } catch (error) {
      logger.error(`Failed to suspend facility: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/facilities/:facilityId/reactivate
 * Reactivate a suspended facility (ADMIN ONLY)
 */
router.post(
  '/:facilityId/reactivate',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [param('facilityId').isMongoId().withMessage('Invalid facility ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const facility = await FacilityService.reactivateFacility(
        req.params.facilityId,
        req.user._id
      );

      await AuditService.logEvent({
        action: 'FACILITY_REACTIVATED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
        },
      });

      res.json({
        success: true,
        message: 'Facility reactivated',
        data: {
          facilityId: facility._id,
          status: facility.status,
        },
      });
    } catch (error) {
      logger.error(`Failed to reactivate facility: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/facilities/:facilityId/add-administrator
 * Add an administrator to a facility
 * Accessible by: SYSTEM_ADMIN or existing facility admin
 */
router.post(
  '/:facilityId/add-administrator',
  authMiddleware,
  [
    param('facilityId').isMongoId().withMessage('Invalid facility ID'),
    body('adminUserId').isMongoId().withMessage('Invalid admin user ID'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { adminUserId } = req.body;

      // Check permission: SYSTEM_ADMIN or facility admin
      const isSystemAdmin = req.user.role === 'SYSTEM_ADMIN';
      let isFacilityAdmin = false;

      if (!isSystemAdmin) {
        const currentStaff = await require('../models/HospitalStaff.js').default.findOne({
          userId: req.user._id,
          hospitalId: req.params.facilityId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });
        isFacilityAdmin = !!currentStaff;
      }

      if (!isSystemAdmin && !isFacilityAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const facility = await FacilityService.addAdministrator(
        req.params.facilityId,
        adminUserId,
        req.user._id
      );

      await AuditService.logEvent({
        action: 'FACILITY_ADMINISTRATOR_ADDED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
          adminUserId,
        },
      });

      res.json({
        success: true,
        message: 'Administrator added to facility',
        data: {
          facilityId: facility._id,
          administrators: facility.administrators,
        },
      });
    } catch (error) {
      logger.error(`Failed to add administrator: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/facilities/pending-verification
 * Get all pending facility verifications (ADMIN ONLY)
 */
router.get(
  '/pending-verification',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const facilities = await FacilityService.getPendingVerifications();

      res.json({
        success: true,
        count: facilities.length,
        data: facilities.map((f) => ({
          facilityId: f._id,
          internalFacilityId: f.facilityId,
          name: f.name,
          type: f.type,
          registrationNumber: f.registrationNumber,
          verificationStatus: f.verificationStatus,
          submittedAt: f.createdAt,
          contact: f.contact,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch pending verifications: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending verifications',
      });
    }
  }
);

/**
 * PUT /api/v1/facilities/:facilityId
 * Update facility information
 * Accessible by: Facility administrators
 */
router.put(
  '/:facilityId',
  authMiddleware,
  requireHospitalAdmin,
  [
    param('facilityId').isMongoId().withMessage('Invalid facility ID'),
    body('name').optional().trim(),
    body('contact.phone').optional().isMobilePhone().withMessage('Valid phone required'),
    body('contact.email').optional().isEmail().withMessage('Valid email required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, contact, departments } = req.body;

      const facility = await Hospital.findByIdAndUpdate(
        req.params.facilityId,
        {
          ...(name && { name }),
          ...(contact && { contact }),
          ...(departments && { departments }),
        },
        { new: true, runValidators: true }
      );

      if (!facility) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
        });
      }

      await AuditService.logEvent({
        action: 'FACILITY_UPDATED',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facility._id,
        details: {
          facilityId: facility.facilityId,
          fields: Object.keys(req.body),
        },
      });

      res.json({
        success: true,
        message: 'Facility updated successfully',
        data: {
          facilityId: facility._id,
          name: facility.name,
          contact: facility.contact,
        },
      });
    } catch (error) {
      logger.error(`Failed to update facility: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

export default router;

