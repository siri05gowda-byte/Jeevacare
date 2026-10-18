/**
 * Hospital Administration Routes
 * System administrator only - provisioning hospitals and hospital admins
 */

import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import HospitalStaff from '../models/HospitalStaff.js';
import AuditService from '../services/AuditService.js';
import Notification from '../models/Notification.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/hospital-admin/create-hospital
 * Create a new hospital
 * Accessible by: SYSTEM_ADMIN only
 */
router.post(
  '/create-hospital',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    body('name')
      .trim()
      .notEmpty()
      .withMessage('Hospital name is required')
      .isLength({ min: 3 })
      .withMessage('Hospital name must be at least 3 characters'),
    body('facilityType')
      .optional()
      .isIn([
        'general_hospital',
        'specialty_hospital',
        'clinic',
        'diagnostic_center',
        'nursing_home',
        'primary_health_center',
        'community_health_center',
        'other',
      ]),
    body('city').optional().trim(),
    body('state').optional().trim(),
    body('phone').optional().trim(),
    body('email')
      .optional()
      .isEmail()
      .withMessage('Invalid email format'),
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

      const { name, facilityType, city, state, phone, email } = req.body;

      // Check if hospital with same name already exists
      const existing = await Hospital.findOne({ name });
      if (existing) {
        return res.status(409).json({
          success: false,
          error: 'A hospital with this name already exists',
        });
      }

      const hospital = new Hospital({
        name,
        facilityType: facilityType || 'general_hospital',
        address: {
          city,
          state,
        },
        contactInfo: {
          phone,
          email,
        },
        status: 'active',
        verificationStatus: 'verified', // System admin can auto-verify
        createdBy: req.user._id,
      });

      await hospital.save();

      // Audit log
      await AuditService.logEvent({
        action: 'hospital_created',
        actor: req.user._id,
        resource: hospital._id,
        resourceType: 'Hospital',
        status: 'success',
        details: {
          hospitalName: hospital.name,
          facilityType,
        },
      });

      logger.info(`Hospital created: ${hospital.name} (${hospital._id})`);

      res.status(201).json({
        success: true,
        message: 'Hospital created successfully',
        data: hospital,
      });
    } catch (error) {
      logger.error(`Failed to create hospital: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/hospital-admin/assign-admin
 * Assign a hospital administrator to a hospital
 * Accessible by: SYSTEM_ADMIN only
 */
router.post(
  '/assign-admin',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  [
    body('hospitalId')
      .isMongoId()
      .withMessage('Invalid hospital ID'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Invalid email address'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name is required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name is required'),
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

      const { hospitalId, email, firstName, lastName } = req.body;

      // Verify hospital exists
      const hospital = await Hospital.findById(hospitalId);
      if (!hospital) {
        return res.status(404).json({
          success: false,
          error: 'Hospital not found',
        });
      }

      // Check if admin email already exists
      let adminUser = await User.findOne({ email });

      if (adminUser) {
        // Update existing user to hospital admin if needed
        if (adminUser.role !== 'HOSPITAL_ADMIN') {
          return res.status(409).json({
            success: false,
            error: 'User exists with different role. Cannot assign as hospital admin.',
          });
        }

        // Check if already admin for this hospital
        const existing = await HospitalStaff.findOne({
          userId: adminUser._id,
          hospitalId,
          role: 'hospital_admin',
        });

        if (existing) {
          return res.status(409).json({
            success: false,
            error: 'User is already an administrator for this hospital',
          });
        }
      } else {
        // Create new hospital admin user
        adminUser = new User({
          email,
          passwordHash: 'temp_password_' + Math.random().toString(36).slice(2),
          role: 'HOSPITAL_ADMIN',
          verificationStatus: 'verified',
          profile: {
            firstName,
            lastName,
            hospitalId,
          },
        });

        await adminUser.save();
        logger.info(`New hospital admin user created: ${email}`);
      }

      // Create HospitalStaff association if not exists
      let staff = await HospitalStaff.findOne({
        userId: adminUser._id,
        hospitalId,
        role: 'hospital_admin',
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: adminUser._id,
          hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date(),
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            manageStaff: true,
            manageFacility: true,
            accessEmergencyProfiles: true,
            approveEmergencyAccess: true,
          },
          approvalInformation: {
            approvedAt: new Date(),
            approvedBy: req.user._id,
            approvalMethod: 'system_admin',
          },
        });

        await staff.save();
      }

      // Add hospital admin to hospital's administrators list
      if (!hospital.administrators.includes(adminUser._id)) {
        hospital.administrators.push(adminUser._id);
        await hospital.save();
      }

      // Send notification to new admin
      const notification = new Notification({
        userId: adminUser._id,
        type: 'hospital_admin_assigned',
        subject: `You have been assigned as administrator for ${hospital.name}`,
        message: `You are now the hospital administrator for ${hospital.name}. You can approve staff registration requests, manage facility information, and oversee hospital operations.`,
        priority: 'high',
      });
      await notification.save();

      // Audit log
      await AuditService.logEvent({
        action: 'hospital_admin_assigned',
        actor: req.user._id,
        resource: hospitalId,
        resourceType: 'Hospital',
        status: 'success',
        details: {
          adminEmail: email,
          hospitalName: hospital.name,
        },
      });

      logger.info(`Hospital admin assigned: ${email} → ${hospital.name}`);

      res.status(201).json({
        success: true,
        message: 'Hospital administrator assigned successfully',
        data: {
          admin: adminUser,
          hospital,
          staffAssociation: staff,
        },
      });
    } catch (error) {
      logger.error(`Failed to assign hospital admin: ${error.message}`);
      next(error);
    }
  }
);

/**
 * GET /api/v1/hospital-admin/hospitals
 * List all hospitals (system admin)
 * Accessible by: SYSTEM_ADMIN only
 */
router.get(
  '/hospitals',
  authMiddleware,
  requireRole('SYSTEM_ADMIN'),
  async (req, res, next) => {
    try {
      const hospitals = await Hospital.find()
        .populate('administrators', 'email profile')
        .sort({ createdAt: -1 });

      res.json({
        success: true,
        count: hospitals.length,
        data: hospitals,
      });
    } catch (error) {
      logger.error(`Failed to fetch hospitals: ${error.message}`);
      next(error);
    }
  }
);

/**
 * GET /api/v1/hospital-admin/list
 * List all active hospitals (public endpoint for authenticated users)
 * Used by staff registration form to show available hospitals
 * Accessible by: Any authenticated user
 */
router.get(
  '/list',
  authMiddleware,
  async (req, res, next) => {
    try {
      const hospitals = await Hospital.find({ status: 'active' })
        .select('_id name facilityType address contactInfo')
        .sort({ name: 1 });

      res.json({
        success: true,
        hospitals,
      });
    } catch (error) {
      logger.error(`Failed to fetch hospital list: ${error.message}`);
      next(error);
    }
  }
);

export default router;
