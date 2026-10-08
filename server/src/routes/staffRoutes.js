/**
 * Staff Management Routes
 * Handles facility staff association, permissions, and multi-facility management
 * Part of Phase 4: Healthcare Provider Authority Layer
 */

import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import {
  requireHospitalAdmin,
  requireFacilityRole,
  attachFacilityContext,
} from '../middleware/facilityRBAC.js';
import StaffService from '../services/StaffService.js';
import HospitalStaff from '../models/HospitalStaff.js';
import User from '../models/User.js';
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
 * POST /api/v1/staff/invite
 * Invite user to associate with facility
 * Accessible by: Facility administrators
 */
router.post(
  '/invite',
  authMiddleware,
  requireHospitalAdmin,
  [
    body('userId').isMongoId().withMessage('Invalid user ID'),
    body('hospitalId').isMongoId().withMessage('Invalid facility ID'),
    body('role')
      .isIn([
        'hospital_admin',
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'paramedic',
        'reception_staff',
        'other_staff',
      ])
      .withMessage('Valid role required'),
    body('department').optional(),
    body('employmentStatus')
      .isIn(['active', 'on_leave', 'contract', 'visiting', 'temporary'])
      .withMessage('Valid employment status required'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const {
        userId,
        hospitalId,
        role,
        department,
        employmentStatus,
        startDate,
        facilityContactEmail,
        facilityContactPhone,
        specialization,
        notes,
      } = req.body;

      // Verify facility exists and user is admin there
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          message: 'Facility not found',
        });
      }

      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User not found',
        });
      }

      // Associate professional with facility
      const staff = await StaffService.associateProfessionalWithFacility(
        userId,
        null, // professionalId optional for non-clinical staff
        hospitalId,
        {
          role,
          department,
          employmentStatus,
          startDate: new Date(startDate),
          facilityContactEmail,
          facilityContactPhone,
          specialization,
          notes,
        },
        req.user._id
      );

      await AuditService.logEvent({
        action: 'STAFF_INVITED',
        actor: req.user._id,
        resource: 'HospitalStaff',
        resourceId: staff._id,
        details: {
          userId,
          facilityId: hospital.facilityId,
          role,
        },
      });

      res.status(201).json({
        success: true,
        message: 'Staff invitation created',
        data: {
          staffId: staff._id,
          userId: staff.userId,
          hospitalId: staff.hospitalId,
          role: staff.role,
          associationStatus: staff.associationStatus,
          startDate: staff.startDate,
        },
      });
    } catch (error) {
      logger.error(`Failed to invite staff: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/staff/:staffId/approve
 * Approve pending staff association
 * Accessible by: Facility administrators or SYSTEM_ADMIN
 */
router.post(
  '/:staffId/approve',
  authMiddleware,
  [
    param('staffId').isMongoId().withMessage('Invalid staff ID'),
    body('approvalMethod')
      .isIn(['facility_admin', 'jeevacare_admin', 'automatic'])
      .withMessage('Valid approval method required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await HospitalStaff.findById(req.params.staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found',
        });
      }

      // Check authorization
      let hasPermission = false;

      if (req.user.role === 'SYSTEM_ADMIN') {
        hasPermission = true;
      } else {
        // Check if user is facility admin at this facility
        const adminStaff = await HospitalStaff.findOne({
          userId: req.user._id,
          hospitalId: staff.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });
        hasPermission = !!adminStaff;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const approvedStaff = await StaffService.approveStaffAssociation(
        req.params.staffId,
        req.body,
        req.user._id
      );

      await AuditService.logEvent({
        action: 'STAFF_APPROVED',
        actor: req.user._id,
        resource: 'HospitalStaff',
        resourceId: staff._id,
        details: {
          facilityId: staff.hospitalId,
          role: staff.role,
        },
      });

      res.json({
        success: true,
        message: 'Staff association approved',
        data: {
          staffId: approvedStaff._id,
          associationStatus: approvedStaff.associationStatus,
          approvedAt: approvedStaff.approvalInformation?.approvedAt,
        },
      });
    } catch (error) {
      logger.error(`Failed to approve staff: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/staff/:staffId/reject
 * Reject pending staff association
 * Accessible by: Facility administrators or SYSTEM_ADMIN
 */
router.post(
  '/:staffId/reject',
  authMiddleware,
  [
    param('staffId').isMongoId().withMessage('Invalid staff ID'),
    body('reason').trim().notEmpty().withMessage('Rejection reason is required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await HospitalStaff.findById(req.params.staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found',
        });
      }

      // Check authorization
      let hasPermission = false;

      if (req.user.role === 'SYSTEM_ADMIN') {
        hasPermission = true;
      } else {
        const adminStaff = await HospitalStaff.findOne({
          userId: req.user._id,
          hospitalId: staff.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });
        hasPermission = !!adminStaff;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const rejectedStaff = await StaffService.rejectStaffAssociation(
        req.params.staffId,
        req.body,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Staff association rejected',
        data: {
          staffId: rejectedStaff._id,
          associationStatus: rejectedStaff.associationStatus,
        },
      });
    } catch (error) {
      logger.error(`Failed to reject staff: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/staff/:staffId/suspend
 * Suspend staff association
 * Accessible by: Facility administrators or SYSTEM_ADMIN
 */
router.post(
  '/:staffId/suspend',
  authMiddleware,
  [
    param('staffId').isMongoId().withMessage('Invalid staff ID'),
    body('reason').trim().notEmpty().withMessage('Suspension reason is required'),
    body('expiryDate').optional().isISO8601().withMessage('Valid expiry date required'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await HospitalStaff.findById(req.params.staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found',
        });
      }

      // Check authorization
      let hasPermission = false;

      if (req.user.role === 'SYSTEM_ADMIN') {
        hasPermission = true;
      } else {
        const adminStaff = await HospitalStaff.findOne({
          userId: req.user._id,
          hospitalId: staff.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });
        hasPermission = !!adminStaff;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const suspendedStaff = await StaffService.suspendStaffAssociation(
        req.params.staffId,
        req.body,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Staff suspended',
        data: {
          staffId: suspendedStaff._id,
          associationStatus: suspendedStaff.associationStatus,
          suspensionExpiry: suspendedStaff.suspension?.suspensionExpiryDate,
        },
      });
    } catch (error) {
      logger.error(`Failed to suspend staff: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * POST /api/v1/staff/:staffId/reactivate
 * Reactivate suspended staff
 */
router.post(
  '/:staffId/reactivate',
  authMiddleware,
  [param('staffId').isMongoId().withMessage('Invalid staff ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await HospitalStaff.findById(req.params.staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found',
        });
      }

      // Check authorization
      let hasPermission = false;

      if (req.user.role === 'SYSTEM_ADMIN') {
        hasPermission = true;
      } else {
        const adminStaff = await HospitalStaff.findOne({
          userId: req.user._id,
          hospitalId: staff.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });
        hasPermission = !!adminStaff;
      }

      if (!hasPermission) {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const reactivatedStaff = await StaffService.reactivateStaffAssociation(
        req.params.staffId,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Staff reactivated',
        data: {
          staffId: reactivatedStaff._id,
          associationStatus: reactivatedStaff.associationStatus,
        },
      });
    } catch (error) {
      logger.error(`Failed to reactivate staff: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * PUT /api/v1/staff/:staffId/permissions
 * Update staff permissions
 * Accessible by: Facility administrators
 */
router.put(
  '/:staffId/permissions',
  authMiddleware,
  [
    param('staffId').isMongoId().withMessage('Invalid staff ID'),
    body('permissions').isObject().withMessage('Permissions must be an object'),
  ],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await HospitalStaff.findById(req.params.staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found',
        });
      }

      // Check authorization
      const adminStaff = await HospitalStaff.findOne({
        userId: req.user._id,
        hospitalId: staff.hospitalId,
        role: 'hospital_admin',
        associationStatus: 'active',
      });

      if (!adminStaff && req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const updatedStaff = await StaffService.updateStaffPermissions(
        req.params.staffId,
        req.body.permissions,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Staff permissions updated',
        data: {
          staffId: updatedStaff._id,
          permissions: updatedStaff.permissions,
        },
      });
    } catch (error) {
      logger.error(`Failed to update permissions: ${error.message}`);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
);

/**
 * GET /api/v1/staff/:staffId
 * Get staff record details
 */
router.get(
  '/:staffId',
  authMiddleware,
  [param('staffId').isMongoId().withMessage('Invalid staff ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await StaffService.getStaffRecord(req.params.staffId);

      if (!staff) {
        return res.status(404).json({
          success: false,
          message: 'Staff record not found',
        });
      }

      res.json({
        success: true,
        data: {
          staffId: staff._id,
          userId: staff.userId?._id,
          userName: staff.userId?.name,
          hospitalId: staff.hospitalId?._id,
          facilityName: staff.hospitalId?.name,
          role: staff.role,
          department: staff.department,
          employmentStatus: staff.employmentStatus,
          associationStatus: staff.associationStatus,
          permissions: staff.permissions,
          startDate: staff.startDate,
          endDate: staff.endDate,
        },
      });
    } catch (error) {
      logger.error(`Failed to fetch staff record: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch staff record',
      });
    }
  }
);

/**
 * GET /api/v1/staff/facility/:hospitalId
 * Get all active staff at facility
 * Accessible by: Facility administrators
 */
router.get(
  '/facility/:hospitalId',
  authMiddleware,
  requireHospitalAdmin,
  [param('hospitalId').isMongoId().withMessage('Invalid facility ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      const staff = await StaffService.getActiveFacilityStaff(req.params.hospitalId);

      res.json({
        success: true,
        count: staff.length,
        data: staff.map((s) => ({
          staffId: s._id,
          userId: s.userId?._id,
          userName: s.userId?.name,
          role: s.role,
          employmentStatus: s.employmentStatus,
          associationStatus: s.associationStatus,
          startDate: s.startDate,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch facility staff: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch facility staff',
      });
    }
  }
);

/**
 * GET /api/v1/staff/user/:userId/records
 * Get all staff records for a user (multi-facility)
 * Accessible by: User themselves or SYSTEM_ADMIN
 */
router.get(
  '/user/:userId/records',
  authMiddleware,
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check authorization
      if (req.params.userId !== req.user._id.toString() && req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const staff = await StaffService.getUserStaffRecords(req.params.userId);

      res.json({
        success: true,
        count: staff.length,
        data: staff.map((s) => ({
          staffId: s._id,
          facilityId: s.hospitalId?._id,
          facilityName: s.hospitalId?.name,
          role: s.role,
          employmentStatus: s.employmentStatus,
          associationStatus: s.associationStatus,
          startDate: s.startDate,
          endDate: s.endDate,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch user staff records: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch staff records',
      });
    }
  }
);

/**
 * GET /api/v1/staff/user/:userId/active
 * Get user's active staff records (current facilities)
 */
router.get(
  '/user/:userId/active',
  authMiddleware,
  [param('userId').isMongoId().withMessage('Invalid user ID')],
  handleValidationErrors,
  async (req, res) => {
    try {
      // Check authorization
      if (req.params.userId !== req.user._id.toString() && req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'Permission denied',
        });
      }

      const staff = await StaffService.getUserActiveStaffRecords(req.params.userId);

      res.json({
        success: true,
        count: staff.length,
        data: staff.map((s) => ({
          staffId: s._id,
          facilityId: s.hospitalId?._id,
          facilityName: s.hospitalId?.name,
          facilityStatus: s.hospitalId?.status,
          role: s.role,
          employmentStatus: s.employmentStatus,
          associationStatus: s.associationStatus,
          startDate: s.startDate,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch active staff records: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch active staff records',
      });
    }
  }
);

/**
 * GET /api/v1/staff/pending-associations
 * Get pending staff associations (ADMIN ONLY)
 */
router.get(
  '/pending-associations',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  async (req, res) => {
    try {
      const pending = await StaffService.getPendingAssociations();

      res.json({
        success: true,
        count: pending.length,
        data: pending.map((s) => ({
          staffId: s._id,
          userId: s.userId?._id,
          userName: s.userId?.name,
          facilityId: s.hospitalId?._id,
          facilityName: s.hospitalId?.name,
          role: s.role,
          createdAt: s.createdAt,
        })),
      });
    } catch (error) {
      logger.error(`Failed to fetch pending associations: ${error.message}`);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending associations',
      });
    }
  }
);

export default router;

