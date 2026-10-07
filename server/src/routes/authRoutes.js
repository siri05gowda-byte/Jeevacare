import express from 'express';
import { body, validationResult } from 'express-validator';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import logger from '../utils/logger.js';
import { generateToken, generateRefreshToken, verifyRefreshToken } from '../utils/auth.js';
import { authMiddleware } from '../middleware/authentication.js';
import AuditService from '../services/AuditService.js';
import {
  ValidationError,
  AuthenticationError,
  ConflictError,
  NotFoundError,
  InvalidOperationError,
} from '../utils/errors.js';

const router = express.Router();

/**
 * POST /api/v1/auth/register
 * Register a new user (patient, hospital admin, etc.)
 */
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('role')
      .isIn(['PATIENT', 'GUARDIAN', 'HOSPITAL_ADMIN', 'DOCTOR', 'EMERGENCY', 'SYSTEM_ADMIN'])
      .withMessage('Invalid role'),
    body('firstName').trim().notEmpty().withMessage('First name is required'),
    body('lastName').trim().notEmpty().withMessage('Last name is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return next(new ValidationError('Validation failed', errors.array()));
      }

      const { email, password, role, firstName, lastName, phone } = req.body;

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return next(new ConflictError('User with this email already exists'));
      }

      // Create new user
      const user = new User({
        email,
        passwordHash: password,
        role,
        profile: {
          firstName,
          lastName,
          phone,
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
      if (role === 'PATIENT' && req.body.dateOfBirth && req.body.sex) {
        const patient = new Patient({
          userId: user._id,
          personalIdentity: {
            firstName,
            lastName,
            dateOfBirth: req.body.dateOfBirth,
            sex: req.body.sex,
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

      res.json({
        success: true,
        message: 'Login successful',
        user: user.toJSON(),
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
 * GET /api/v1/auth/current-user
 * Get current authenticated user
 */
router.get('/current-user', authMiddleware, async (req, res) => {
  try {
    res.json({
      success: true,
      user: req.user.toJSON(),
    });
  } catch (error) {
    logger.error(`Current user fetch error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
