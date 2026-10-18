/**
 * Staff Registration Routes
 * Handles healthcare professional registration requests and hospital admin approvals
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import StaffRegistrationService from '../services/StaffRegistrationService.js';
import StaffService from '../services/StaffService.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/staff-registration/request
 * Submit a staff registration request for a hospital
 * Accessible by: DOCTOR, NURSE, LAB_TECHNICIAN, RADIOLOGY_TECHNICIAN, PHARMACIST, etc.
 */
router.post(
  '/request',
  authMiddleware,
  [
    body('hospitalId')
      .trim()
      .notEmpty()
      .withMessage('Hospital ID is required')
      .isMongoId()
      .withMessage('Invalid hospital ID format'),
    body('department')
      .optional()
      .trim(),
    body('specialization')
      .optional()
      .isArray()
      .withMessage('Specialization must be an array'),
    body('licenseNumber')
      .optional()
      .trim(),
    body('registrationNumber')
      .optional()
      .trim(),
    body('yearsOfExperience')
      .optional()
      .isInt({ min: 0, max: 70 })
      .withMessage('Years of experience must be between 0 and 70'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const staffRoles = [
        'DOCTOR',
        'NURSE',
        'LAB_TECHNICIAN',
        'RADIOLOGY_TECHNICIAN',
        'PHARMACIST',
        'PARAMEDIC',
        'RECEPTION_STAFF',
        'OTHER_STAFF',
      ];

      if (!staffRoles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: `Only healthcare staff can request facility affiliation. Current role: ${req.user.role}`,
        });
      }

      const registrationRequest = await StaffRegistrationService.submitRegistrationRequest(
        req.user._id,
        req.body.hospitalId,
        {
          firstName: req.body.firstName || req.user.profile?.firstName,
          lastName: req.body.lastName || req.user.profile?.lastName,
          phone: req.body.phone || req.user.profile?.phone,
          department: req.body.department,
          specialization: req.body.specialization,
          licenseNumber: req.body.licenseNumber,
          registrationNumber: req.body.registrationNumber,
          qualifications: req.body.qualifications,
          yearsOfExperience: req.body.yearsOfExperience,
        },
        req.ip,
        req.headers['user-agent']
      );

      res.status(201).json({
        success: true,
        message: 'Registration request submitted successfully',
        data: registrationRequest,
      });
    } catch (error) {
      logger.error(`Staff registration submission error: ${error.message}`);
      next(error);
    }
  }
);

/**
 * GET /api/v1/staff-registration/my-requests
 * Get current user's registration requests
 * Accessible by: Authenticated users
 */
router.get('/my-requests', authMiddleware, async (req, res, next) => {
  try {
    const requests = await StaffRegistrationService.getUserRegistrationRequests(
      req.user._id
    );

    res.json({
      success: true,
      data: requests,
    });
  } catch (error) {
    logger.error(`Failed to fetch user registration requests: ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/staff-registration/hospital/:hospitalId/pending
 * Get pending registration requests for a hospital
 * Accessible by: HOSPITAL_ADMIN (for their hospital), SYSTEM_ADMIN
 */
router.get(
  '/hospital/:hospitalId/pending',
  authMiddleware,
  [param('hospitalId').isMongoId().withMessage('Invalid hospital ID format')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { hospitalId } = req.params;

      // Authorization check
      if (req.user.role === 'HOSPITAL_ADMIN') {
        // Hospital admin can only see their own hospital
        const isAdmin = await StaffService.hasRoleAtFacility(
          req.user._id,
          hospitalId,
          'hospital_admin'
        );

        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'You are not authorized to view requests for this hospital',
          });
        }
      } else if (req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only hospital administrators and system administrators can view registration requests',
        });
      }

      const requests = await StaffRegistrationService.getPendingRequestsForHospital(
        hospitalId
      );

      res.json({
        success: true,
        data: requests,
        count: requests.length,
      });
    } catch (error) {
      logger.error(`Failed to fetch pending requests: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/staff-registration/:requestId/approve
 * Approve a staff registration request
 * Accessible by: HOSPITAL_ADMIN (for their hospital), SYSTEM_ADMIN
 */
router.post(
  '/:requestId/approve',
  authMiddleware,
  [
    param('requestId').isMongoId().withMessage('Invalid request ID format'),
    body('approvalReason')
      .optional()
      .trim(),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { approvalReason } = req.body;

      // Get request to check hospital
      const StaffRegistrationRequest = (
        await import('../models/StaffRegistrationRequest.js')
      ).default;
      const request = await StaffRegistrationRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Registration request not found',
        });
      }

      // Authorization check
      if (req.user.role === 'HOSPITAL_ADMIN') {
        const isAdmin = await StaffService.hasRoleAtFacility(
          req.user._id,
          request.hospitalId,
          'hospital_admin'
        );

        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'You are not authorized to approve requests for this hospital',
          });
        }
      } else if (req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only hospital administrators and system administrators can approve requests',
        });
      }

      const result = await StaffRegistrationService.approveRegistrationRequest(
        requestId,
        req.user._id,
        approvalReason
      );

      res.json({
        success: true,
        message: 'Registration request approved successfully',
        data: result,
      });
    } catch (error) {
      logger.error(`Failed to approve registration request: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/staff-registration/:requestId/reject
 * Reject a staff registration request
 * Accessible by: HOSPITAL_ADMIN (for their hospital), SYSTEM_ADMIN
 */
router.post(
  '/:requestId/reject',
  authMiddleware,
  [
    param('requestId').isMongoId().withMessage('Invalid request ID format'),
    body('rejectionReason')
      .trim()
      .notEmpty()
      .withMessage('Rejection reason is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;
      const { rejectionReason } = req.body;

      // Get request to check hospital
      const StaffRegistrationRequest = (
        await import('../models/StaffRegistrationRequest.js')
      ).default;
      const request = await StaffRegistrationRequest.findById(requestId);

      if (!request) {
        return res.status(404).json({
          success: false,
          error: 'Registration request not found',
        });
      }

      // Authorization check
      if (req.user.role === 'HOSPITAL_ADMIN') {
        const isAdmin = await StaffService.hasRoleAtFacility(
          req.user._id,
          request.hospitalId,
          'hospital_admin'
        );

        if (!isAdmin) {
          return res.status(403).json({
            success: false,
            error: 'You are not authorized to reject requests for this hospital',
          });
        }
      } else if (req.user.role !== 'SYSTEM_ADMIN') {
        return res.status(403).json({
          success: false,
          error: 'Only hospital administrators and system administrators can reject requests',
        });
      }

      const updatedRequest = await StaffRegistrationService.rejectRegistrationRequest(
        requestId,
        req.user._id,
        rejectionReason
      );

      res.json({
        success: true,
        message: 'Registration request rejected successfully',
        data: updatedRequest,
      });
    } catch (error) {
      logger.error(`Failed to reject registration request: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/staff-registration/:requestId/withdraw
 * Withdraw a pending registration request
 * Accessible by: The applicant (user who submitted the request)
 */
router.post(
  '/:requestId/withdraw',
  authMiddleware,
  [param('requestId').isMongoId().withMessage('Invalid request ID format')],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array(),
        });
      }

      const { requestId } = req.params;

      const updatedRequest = await StaffRegistrationService.withdrawRegistrationRequest(
        requestId,
        req.user._id
      );

      res.json({
        success: true,
        message: 'Registration request withdrawn successfully',
        data: updatedRequest,
      });
    } catch (error) {
      logger.error(`Failed to withdraw registration request: ${error.message}`);
      next(error);
    }
  }
);

export default router;
