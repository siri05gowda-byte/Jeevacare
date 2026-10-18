import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import logger from '../utils/logger.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';
import { authMiddleware } from '../middleware/authentication.js';
import AuditService from '../services/AuditService.js';
import { generateJeevaId } from '../utils/jeevaIdGenerator.js';
import {
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  ConflictError,
  NotFoundError,
  InvalidOperationError,
} from '../utils/errors.js';

const router = express.Router();

// All supported user roles for registration
const ALL_USER_ROLES = [
  'PATIENT',
  'GUARDIAN',
  'DOCTOR',
  'NURSE',
  'LAB_TECHNICIAN',
  'RADIOLOGY_TECHNICIAN',
  'PHARMACIST',
  'PARAMEDIC',
  'RECEPTION_STAFF',
  'OTHER_STAFF',
];

// Roles that bypass verification (patients and guardians)
const AUTO_VERIFIED_ROLES = ['PATIENT', 'GUARDIAN'];

// Roles that require verification (all staff roles)
const STAFF_ROLES = [
  'DOCTOR',
  'NURSE',
  'LAB_TECHNICIAN',
  'RADIOLOGY_TECHNICIAN',
  'PHARMACIST',
  'PARAMEDIC',
  'RECEPTION_STAFF',
  'OTHER_STAFF',
];

// Administrative roles that cannot self-register
const ADMIN_ROLES = ['HOSPITAL_ADMIN', 'EMERGENCY', 'SYSTEM_ADMIN'];

/**
 * POST /api/v1/auth/register
 * Public registration for all user roles.
 * - PATIENT/GUARDIAN: Auto-verified
 * - Staff roles: Pending verification until hospital admin approves
 * - Admin roles: Cannot self-register
 */
router.post(
  '/register',
  [
    body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
    body('role')
      .optional()
      .custom((value) => {
        if (!value) return true;
        const upper = value.toUpperCase();
        if (ADMIN_ROLES.includes(upper)) {
          throw new Error(
            'Self-registration for administrative roles is prohibited. Admin accounts must be provisioned by system administrators.'
          );
        }
        if (!ALL_USER_ROLES.includes(upper)) {
          throw new Error('Invalid role. Please select a valid user role.');
        }
        return true;
      }),
    body('dateOfBirth')
      .optional({ checkFalsy: true })
      .isISO8601()
      .withMessage('Date of birth must be a valid date')
      .custom((val) => {
        if (new Date(val) > new Date()) {
          throw new Error('Date of birth cannot be in the future');
        }
        return true;
      }),
    body('sex')
      .optional({ checkFalsy: true })
      .isIn(['M', 'F', 'O', 'Prefer not to say'])
      .withMessage('Sex must be M, F, O, or Prefer not to say'),
    body('aadhaarNumber')
      .optional({ checkFalsy: true })
      .trim()
      .custom((value) => {
        if (!value) return true;
        // Remove spaces and hyphens
        const cleaned = value.replace(/[\s-]/g, '');
        if (!/^\d{12}$/.test(cleaned)) {
          throw new Error('Aadhaar number must be exactly 12 digits');
        }
        return true;
      }),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationError('Validation failed', errors.array()));
      }

      const { email, password, firstName, lastName, phone, aadhaarNumber } = req.body;

      // Enforce role security
      const rawRole = (req.body.role || 'PATIENT').toUpperCase();
      if (ADMIN_ROLES.includes(rawRole)) {
        return next(
          new AuthorizationError(
            'Self-registration for administrative roles is prohibited. Admin accounts must be provisioned by system administrators.'
          )
        );
      }
      if (!ALL_USER_ROLES.includes(rawRole)) {
        return next(
          new ValidationError('Invalid role for registration.')
        );
      }
      const role = rawRole;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new ConflictError('An account with this email address already exists. Please log in instead.'));
      }

      // Generate unique JeevaId
      const jeevaId = await generateJeevaId();

      // Determine verification status based on role
      const verificationStatus = AUTO_VERIFIED_ROLES.includes(role) ? 'verified' : 'pending';

      // Clean and prepare Aadhaar number if provided
      const cleanedAadhaar = aadhaarNumber ? aadhaarNumber.replace(/[\s-]/g, '') : undefined;

      // Create new user
      const user = new User({
        email,
        passwordHash: password,
        role,
        jeevaId,
        verificationStatus,
        profile: {
          firstName,
          lastName,
          phone,
          ...(cleanedAadhaar && { aadhaarNumber: cleanedAadhaar }),
        },
        consentRecord: {
          termsAccepted: req.body.termsAccepted || false,
          termsAcceptedAt: req.body.termsAccepted ? new Date() : null,
          privacyPolicyAccepted: req.body.privacyPolicyAccepted || false,
          privacyPolicyAcceptedAt: req.body.privacyPolicyAccepted ? new Date() : null,
        },
      });

      await user.save();

      // If registering as patient, create patient profile
      if (role === 'PATIENT') {
        const patient = new Patient({
          userId: user._id,
          personalIdentity: {
            firstName,
            lastName,
            dateOfBirth: req.body.dateOfBirth ? new Date(req.body.dateOfBirth) : new Date('1990-01-01'),
            sex: req.body.sex || 'Prefer not to say',
            phone,
          },
          createdBy: user._id,
        });

        await patient.save();

        // Update user profile with patient reference
        user.profile.patientId = patient._id;
        await user.save();
      }

      // Log audit event
      await AuditService.logAuthenticationEvent({
        actor: user._id,
        action: 'registration',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Generate tokens
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        user: user.toJSON(),
        tokens: {
          token,
          refreshToken,
        },
      });
    } catch (error) {
      if (error.code === 11000) {
        return next(new ConflictError('An account with this email address already exists. Please log in instead.'));
      }
      logger.error(`Registration error: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/login
 * Authenticate user and return JWT token
 */
router.post(
  '/login',
  [body('email').isEmail().normalizeEmail(), body('password').notEmpty()],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationError('Validation failed', errors.array()));
      }

      const { email, password } = req.body;

      // Find user by email
      const user = await User.findOne({ email }).select('+passwordHash');

      if (!user) {
        await AuditService.logAuthenticationEvent({
          actor: null,
          action: 'failed_login',
          status: 'failure',
          statusMessage: 'User not found',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return next(new AuthenticationError('Invalid email or password'));
      }

      // Check if user account is active
      if (user.status !== 'active') {
        await AuditService.logAuthenticationEvent({
          actor: user._id,
          action: 'failed_login',
          status: 'denied',
          statusMessage: `Account is ${user.status}`,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return next(new InvalidOperationError(`Your account is currently ${user.status}`));
      }

      // Verify password
      const passwordMatch = await user.comparePassword(password);

      if (!passwordMatch) {
        // Increment failed login attempts
        user.auditMetadata.loginAttempts = (user.auditMetadata.loginAttempts || 0) + 1;

        if (user.auditMetadata.loginAttempts >= 5) {
          user.auditMetadata.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
          logger.warn(`Account locked due to multiple failed login attempts: ${email}`);
        }

        await user.save();

        await AuditService.logAuthenticationEvent({
          actor: user._id,
          action: 'failed_login',
          status: 'failure',
          statusMessage: 'Invalid password',
          ipAddress: req.ip,
          userAgent: req.headers['user-agent'],
        });

        return next(new AuthenticationError('Invalid email or password'));
      }

      // Check if account is locked
      if (user.auditMetadata.lockedUntil && user.auditMetadata.lockedUntil > new Date()) {
        return next(
          new InvalidOperationError(
            'Account is temporarily locked. Please try again later or contact support.'
          )
        );
      }

      // Reset failed attempts
      user.auditMetadata.loginAttempts = 0;
      user.auditMetadata.lastLoginAt = new Date();
      user.auditMetadata.lastLoginIp = req.ip;
      user.auditMetadata.lockedUntil = null;

      // Auto-verify patient and guardian accounts on login if they were pending
      if (['PATIENT', 'GUARDIAN'].includes(user.role) && user.verificationStatus === 'pending') {
        user.verificationStatus = 'verified';
      }

      await user.save();

      // Log successful login
      await AuditService.logAuthenticationEvent({
        actor: user._id,
        action: 'login',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      // Generate tokens
      const token = generateToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      // Prepare user response with additional data
      const userResponse = user.toJSON();

      // Add facilityId at top level for convenience
      if (userResponse.profile?.hospitalId) {
        userResponse.facilityId = userResponse.profile.hospitalId;
      }

      // If user is a healthcare professional, resolve staff association and professional profile
      if (['DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'PHARMACIST', 'HOSPITAL_ADMIN'].includes(user.role)) {
        try {
          const { ensureStaffAssociation } = await import('../utils/staffHelper.js');
          const staffAssociation = await ensureStaffAssociation(user);

          if (staffAssociation) {
            userResponse.facilityId = staffAssociation.hospitalId;
            userResponse.staffId = staffAssociation._id;

            const Hospital = (await import('../models/Hospital.js')).default;
            const hospital = await Hospital.findById(staffAssociation.hospitalId).select('name');
            if (hospital) {
              userResponse.facilityName = hospital.name;
            }
          }
        } catch (staffErr) {
          logger.warn(`Failed to resolve staff association on login: ${staffErr.message}`);
        }

        const HealthcareProfessional = (await import('../models/HealthcareProfessional.js')).default;
        const professional = await HealthcareProfessional.findOne({ userId: user._id })
          .select('_id professionalId professionalType specialization verificationStatus')
          .lean();
        
        if (professional) {
          userResponse.professional = professional;
          userResponse.professionalId = professional._id;
        }
      }

      // If user is a patient, fetch/ensure their patient profile
      if (user.role === 'PATIENT') {
        let patient = await Patient.findOne({ userId: user._id })
          .select('_id jeevaId personalIdentity')
          .lean();
        
        if (!patient) {
          try {
            const newPatient = new Patient({
              userId: user._id,
              personalIdentity: {
                firstName: user.profile?.firstName || 'Patient',
                lastName: user.profile?.lastName || 'User',
                dateOfBirth: new Date('1990-01-01'),
                sex: 'Prefer not to say',
                phone: user.profile?.phone,
              },
              status: 'active',
              createdBy: user._id,
            });
            const savedPatient = await newPatient.save();
            patient = savedPatient.toObject();
          } catch (createErr) {
            logger.warn(`Failed to auto-create patient record on login: ${createErr.message}`);
          }
        }

        if (patient) {
          userResponse.patient = patient;
          userResponse.patientId = patient._id;
        }
      }

      res.json({
        success: true,
        message: 'Login successful',
        user: userResponse,
        tokens: {
          token,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/refresh-token
 * Refresh access token using refresh token
 */
router.post(
  '/refresh-token',
  [body('refreshToken').notEmpty().withMessage('Refresh token is required')],
  async (req, res, next) => {
    try {
      const { refreshToken } = req.body;

      const decoded = verifyRefreshToken(refreshToken);

      if (!decoded) {
        return next(new AuthenticationError('Invalid or expired refresh token'));
      }

      const user = await User.findById(decoded.userId);

      if (!user || user.status !== 'active') {
        return next(new AuthenticationError('User not found or inactive'));
      }

      // Generate new tokens
      const newToken = generateToken(user._id, user.role);
      const newRefreshToken = generateRefreshToken(user._id);

      res.json({
        success: true,
        tokens: {
          token: newToken,
          refreshToken: newRefreshToken,
        },
      });
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/logout
 * Logout user (invalidate session)
 */
router.post('/logout', authMiddleware, async (req, res, next) => {
  try {
    await AuditService.logAuthenticationEvent({
      actor: req.user._id,
      action: 'logout',
      status: 'success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    logger.error(`Logout error: ${error.message}`);
    next(error);
  }
});

/**
 * PUT /api/v1/auth/profile
 * Update user profile
 */
router.put(
  '/profile',
  [
    body('firstName').optional().trim().notEmpty().withMessage('First name cannot be empty'),
    body('lastName').optional().trim().notEmpty().withMessage('Last name cannot be empty'),
    body('phone').optional().trim(),
  ],
  authMiddleware,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationError('Validation failed', errors.array()));
      }

      const { firstName, lastName, phone } = req.body;
      const updates = {};

      if (firstName) updates['profile.firstName'] = firstName;
      if (lastName) updates['profile.lastName'] = lastName;
      if (phone !== undefined) updates['profile.phone'] = phone;

      const user = await User.findByIdAndUpdate(
        req.user._id,
        { $set: updates },
        { new: true, runValidators: true }
      );

      if (!user) {
        return next(new NotFoundError('User not found'));
      }

      await AuditService.logEvent({
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'patient_profile_updated',
        details: { updatedFields: Object.keys(updates) },
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: user.toJSON(),
      });
    } catch (error) {
      logger.error(`Profile update error: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/change-password
 * Change user password
 */
router.post(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  ],
  authMiddleware,
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationError('Validation failed', errors.array()));
      }

      const { currentPassword, newPassword } = req.body;

      // Get user with password
      const user = await User.findById(req.user._id).select('+passwordHash');

      if (!user) {
        return next(new NotFoundError('User not found'));
      }

      // Verify current password
      const passwordMatch = await user.comparePassword(currentPassword);

      if (!passwordMatch) {
        await AuditService.logAuthenticationEvent({
          actor: user._id,
          action: 'password_change',
          status: 'failure',
          statusMessage: 'Current password incorrect',
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        return next(new AuthenticationError('Current password is incorrect'));
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save hook
      await user.save();

      await AuditService.logAuthenticationEvent({
        actor: user._id,
        action: 'password_change',
        status: 'success',
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      });

      res.json({
        success: true,
        message: 'Password changed successfully',
      });
    } catch (error) {
      logger.error(`Password change error: ${error.message}`);
      next(error);
    }
  }
);

/**
 * POST /api/v1/auth/upload-profile-picture
 * Upload profile picture to Cloudinary
 */
router.post('/upload-profile-picture', authMiddleware, async (req, res, next) => {
  try {
    const multer = (await import('multer')).default;
    const CloudinaryAdapter = (await import('../adapters/CloudinaryAdapter.js')).default;

    // Configure multer for memory storage
    const upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024, // 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
        }
      },
    }).single('profilePicture');

    // Handle file upload
    upload(req, res, async (err) => {
      if (err) {
        return next(new ValidationError(err.message));
      }

      if (!req.file) {
        return next(new ValidationError('No file uploaded'));
      }

      try {
        // Upload to Cloudinary
        const result = await CloudinaryAdapter.uploadFile(req.file.buffer, {
          folder: 'jeevacare/profile-pictures',
          resourceType: 'image',
          fileName: `profile-${req.user._id}-${Date.now()}`,
          documentType: 'profile-picture',
        });

        // Update user profile
        const user = await User.findByIdAndUpdate(
          req.user._id,
          { $set: { 'profile.profilePictureUrl': result.secureUrl || result.url } },
          { new: true }
        );

        await AuditService.logEvent({
          actor: req.user._id,
          actorRole: req.user.role,
          action: 'patient_profile_updated',
          details: { updatedFields: ['profilePictureUrl'] },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        });

        res.json({
          success: true,
          message: 'Profile picture uploaded successfully',
          url: result.secureUrl || result.url,
          user: user.toJSON(),
        });
      } catch (uploadError) {
        logger.error(`Cloudinary upload error: ${uploadError.message}`);
        next(new Error('Failed to upload profile picture'));
      }
    });
  } catch (error) {
    logger.error(`Profile picture upload error: ${error.message}`);
    next(error);
  }
});

/**
 * GET /api/v1/auth/current-user
 * Get current authenticated user with populated data
 */
router.get('/current-user', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('profile.hospitalId', 'name')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    // Remove sensitive fields
    delete user.passwordHash;
    delete user.twoFactorSecret;

    // Auto-verify patient and guardian accounts if pending
    if (['PATIENT', 'GUARDIAN'].includes(user.role) && user.verificationStatus === 'pending') {
      user.verificationStatus = 'verified';
      await User.updateOne({ _id: user._id }, { $set: { verificationStatus: 'verified' } });
    }

    // Add facilityId at top level for convenience
    if (user.profile?.hospitalId) {
      if (typeof user.profile.hospitalId === 'object') {
        user.facilityId = user.profile.hospitalId._id;
        user.facilityName = user.profile.hospitalId.name;
      } else {
        user.facilityId = user.profile.hospitalId;
      }
    }

    // If user is a healthcare professional, resolve staff association and professional profile
    if (['DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'PHARMACIST', 'HOSPITAL_ADMIN'].includes(user.role)) {
      try {
        const { ensureStaffAssociation } = await import('../utils/staffHelper.js');
        const staffAssociation = await ensureStaffAssociation(user);

        if (staffAssociation) {
          user.facilityId = staffAssociation.hospitalId;
          user.staffId = staffAssociation._id;

          const Hospital = (await import('../models/Hospital.js')).default;
          const hospital = await Hospital.findById(staffAssociation.hospitalId).select('name');
          if (hospital) {
            user.facilityName = hospital.name;
          }
        }
      } catch (staffErr) {
        logger.warn(`Failed to resolve staff association in /current-user: ${staffErr.message}`);
      }

      const HealthcareProfessional = (await import('../models/HealthcareProfessional.js')).default;
      const professional = await HealthcareProfessional.findOne({ userId: user._id })
        .select('_id professionalId professionalType specialization verificationStatus facilityAssociations')
        .lean();
      
      if (professional) {
        user.professional = professional;
        user.professionalId = professional._id;
      }
    }

    // If user is a patient, fetch/ensure their patient profile
    if (user.role === 'PATIENT') {
      let patient = await Patient.findOne({ userId: user._id })
        .select('_id jeevaId personalIdentity')
        .lean();
      
      if (!patient) {
        try {
          const newPatient = new Patient({
            userId: user._id,
            personalIdentity: {
              firstName: user.profile?.firstName || 'Patient',
              lastName: user.profile?.lastName || 'User',
              dateOfBirth: new Date('1990-01-01'),
              sex: 'Prefer not to say',
              phone: user.profile?.phone,
            },
            status: 'active',
            createdBy: user._id,
          });
          const savedPatient = await newPatient.save();
          patient = savedPatient.toObject();
        } catch (createErr) {
          logger.warn(`Failed to auto-create patient record in /current-user: ${createErr.message}`);
        }
      }

      if (patient) {
        user.patient = patient;
        user.patientId = patient._id;
      }
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    logger.error(`Current user fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/auth/provision-system-admin
 * Provision a system administrator (bootstrap endpoint)
 * 
 * Security: Requires JEEVACARE_ADMIN_SECRET environment variable
 * This prevents unauthorized admin creation
 */
router.post(
  '/provision-system-admin',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('firstName')
      .trim()
      .notEmpty()
      .withMessage('First name required'),
    body('lastName')
      .trim()
      .notEmpty()
      .withMessage('Last name required'),
    body('secret')
      .trim()
      .notEmpty()
      .withMessage('Admin secret required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationError('Validation failed', errors.array()));
      }

      // Verify secret matches environment variable
      const adminSecret = process.env.JEEVACARE_ADMIN_SECRET;
      if (!adminSecret) {
        return next(
          new InvalidOperationError(
            'System administrator provisioning is not enabled. Set JEEVACARE_ADMIN_SECRET environment variable.'
          )
        );
      }

      if (req.body.secret !== adminSecret) {
        logger.warn(`Failed admin provisioning attempt with invalid secret from ${req.ip}`);
        return next(new AuthorizationError('Invalid admin secret'));
      }

      const { email, password, firstName, lastName } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new ConflictError('User with this email already exists'));
      }

      // Check if there are any system admins (for first-time bootstrap)
      const adminCount = await User.countDocuments({ role: 'SYSTEM_ADMIN' });
      const isFirstAdmin = adminCount === 0;

      // Create system administrator
      const admin = new User({
        email,
        passwordHash: password,
        role: 'SYSTEM_ADMIN',
        jeevaId: `JC-SYSADM-${Date.now()}`,
        verificationStatus: 'verified',
        profile: {
          firstName,
          lastName,
        },
      });

      await admin.save();

      // Audit log
      await AuditService.logAuthenticationEvent({
        actor: admin._id,
        action: 'system_admin_provisioned',
        status: 'success',
        details: {
          isFirstAdmin,
        },
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      });

      logger.info(
        `System administrator provisioned: ${email}${isFirstAdmin ? ' (FIRST ADMIN)' : ''}`
      );

      // Generate tokens
      const token = generateToken(admin._id, admin.role);
      const refreshToken = generateRefreshToken(admin._id);

      res.status(201).json({
        success: true,
        message: `System administrator created successfully${isFirstAdmin ? ' (First admin)' : ''}`,
        user: admin.toJSON(),
        tokens: {
          token,
          refreshToken,
        },
      });
    } catch (error) {
      logger.error(`System admin provisioning error: ${error.message}`);
      next(error);
    }
  }
);

export default router;
