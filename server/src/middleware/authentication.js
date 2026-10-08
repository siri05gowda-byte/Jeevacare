import logger from '../utils/logger.js';
import { extractTokenFromHeader, verifyToken } from '../utils/auth.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import GuardianRelationship from '../models/GuardianRelationship.js';
import EmergencyAccess from '../models/EmergencyAccess.js';

/**
 * Middleware to verify JWT token and attach user to request
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (!token) {
      logger.warn('Request without authentication token received');
      return next(new AuthenticationError('No token provided'));
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      logger.warn('Invalid or expired token received');
      return next(new AuthenticationError('Invalid or expired token'));
    }

    // Fetch user from database to ensure status hasn't changed
    const user = await User.findById(decoded.userId).select('-passwordHash -twoFactorSecret');

    if (!user) {
      logger.warn(`User not found for token: ${decoded.userId}`);
      return next(new AuthenticationError('User not found'));
    }

    if (user.status !== 'active') {
      logger.warn(`Inactive user attempted access: ${user.email} (status: ${user.status})`);
      return next(new AuthenticationError(`User account is ${user.status}`));
    }

    // Attach user and token to request
    req.user = user;
    req.token = token;

    next();
  } catch (error) {
    logger.error(`Authentication middleware error: ${error.message}`);
    next(error);
  }
};

/**
 * Middleware to check if user has required role(s)
 */
export const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('User not authenticated'));
      }

      if (!allowedRoles.includes(req.user.role)) {
        logger.warn(
          `Unauthorized access attempt: ${req.user.email} (${req.user.role}) tried to access ${req.method} ${req.path}`
        );
        return next(
          new AuthorizationError(`This action requires one of the following roles: ${allowedRoles.join(', ')}`)
        );
      }

      next();
    } catch (error) {
      logger.error(`Role checking middleware error: ${error.message}`);
      next(error);
    }
  };
};

/**
 * Middleware to check patient isolation (can only access own records)
 * Patients cannot access other patients' records without proper authorization
 */
export const requirePatientIsolation = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    // Patients can only access their own records
    if (req.user.role === 'PATIENT') {
      const patientIdFromRequest = req.params.patientId || req.body.patientId;

      if (!patientIdFromRequest) {
        return next(new Error('Patient ID not found in request'));
      }

      // Get patient for this user
      const userPatient = await Patient.findOne({ userId: req.user._id });
      if (!userPatient) {
        return next(new AuthenticationError('Patient profile not found for user'));
      }

      // Verify patient ID matches
      if (userPatient._id.toString() !== patientIdFromRequest) {
        logger.warn(
          `Patient isolation violation: ${req.user.email} attempted to access patient ${patientIdFromRequest}`
        );
        return next(new AuthorizationError('Cannot access other patients\' records'));
      }
    }
    // Guardians can only access records for patients they are authorized guardians for
    else if (req.user.role === 'GUARDIAN') {
      const patientIdFromRequest = req.params.patientId || req.body.patientId;

      if (!patientIdFromRequest) {
        return next(new Error('Patient ID not found in request'));
      }

      // Check if user is authorized guardian for this patient
      const guardianship = await GuardianRelationship.findOne({
        patientId: patientIdFromRequest,
        guardianUserId: req.user._id,
        status: 'active',
        verificationStatus: 'verified',
      });

      if (!guardianship) {
        logger.warn(
          `Guardian access violation: ${req.user.email} attempted to access unauthorized patient ${patientIdFromRequest}`
        );
        return next(new AuthorizationError('Not authorized guardian for this patient'));
      }

      // Store guardianship in request for permission checks
      req.guardianship = guardianship;
    }

    next();
  } catch (error) {
    logger.error(`Patient isolation check error: ${error.message}`);
    next(error);
  }
};

/**
 * Middleware to verify guardian has specific permission
 */
export const requireGuardianPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(new AuthenticationError('User not authenticated'));
      }

      if (req.user.role === 'GUARDIAN') {
        if (!req.guardianship) {
          return next(new Error('Guardian relationship not found in request context'));
        }

        if (!req.guardianship.permissions[permissionName]) {
          logger.warn(
            `Guardian permission violation: ${req.user.email} lacks ${permissionName} permission`
          );
          return next(new AuthorizationError(`Missing permission: ${permissionName}`));
        }
      }

      next();
    } catch (error) {
      logger.error(`Guardian permission check error: ${error.message}`);
      next(error);
    }
  };
};

/**
 * Optional authentication middleware (doesn't fail if token missing)
 */
export const optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = extractTokenFromHeader(authHeader);

    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        const user = await User.findById(decoded.userId).select('-passwordHash -twoFactorSecret');
        if (user && user.status === 'active') {
          req.user = user;
          req.token = token;
        }
      }
    }

    next();
  } catch (error) {
    logger.error(`Optional authentication middleware error: ${error.message}`);
    next();
  }
};

/**
 * Middleware to verify emergency access authorization
 * Used for accessing emergency summaries
 * Verifies that:
 * 1. Access ID exists
 * 2. Access is authorized and not expired
 * 3. Professional matches requestor or is admin
 * 4. Patient ID matches access record
 */
export const requireEmergencyAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    // Must be healthcare professional
    if (!['DOCTOR', 'NURSE', 'PARAMEDIC', 'EMERGENCY', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN'].includes(req.user.role)) {
      return next(new AuthorizationError('Only healthcare professionals can access emergency profiles'));
    }

    // Extract access ID from request
    const accessId = req.params.accessId || req.query.accessId;
    if (!accessId) {
      return next(new Error('Emergency access ID not provided'));
    }

    // Extract patient ID from request
    const patientId = req.params.patientId || req.body.patientId;
    if (!patientId) {
      return next(new Error('Patient ID not provided'));
    }

    // Find emergency access record
    const access = await EmergencyAccess.findOne({ accessId }).exec();
    if (!access) {
      logger.warn(`Emergency access not found: ${accessId}`);
      return next(new AuthorizationError('Emergency access not found'));
    }

    // Verify access is authorized
    if (access.authorizationStatus !== 'authorized') {
      logger.warn(`Emergency access not authorized: ${accessId} (status: ${access.authorizationStatus})`);
      return next(new AuthorizationError(`Emergency access is ${access.authorizationStatus}`));
    }

    // Check if access has expired
    if (access.accessExpirationDateTime && access.accessExpirationDateTime < new Date()) {
      logger.warn(`Emergency access expired: ${accessId}`);
      return next(new AuthorizationError('Emergency access has expired'));
    }

    // Verify patient ID matches
    if (access.patientId.toString() !== patientId) {
      logger.warn(
        `Emergency access patient mismatch: ${req.user.email} attempted to access patient ${patientId} with access for patient ${access.patientId}`
      );
      return next(new AuthorizationError('Access ID does not match requested patient'));
    }

    // Verify professional is either the requestor or is admin
    if (access.professionalId.toString() !== req.user._id.toString() && 
        !['HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role)) {
      logger.warn(
        `Emergency access professional mismatch: ${req.user.email} attempted to use access granted to different professional`
      );
      return next(new AuthorizationError('This emergency access was not granted to you'));
    }

    // Attach access record to request for later use
    req.emergencyAccess = access;

    // Log that emergency access was used
    access.accessEvents.push({
      accessDateTime: new Date(),
      dataAccessed: req.method === 'GET' ? 'emergency_summary_view' : 'emergency_data_access',
      ipAddress: req.ip || req.connection.remoteAddress || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
    });
    await access.save();

    next();
  } catch (error) {
    logger.error(`Emergency access authorization check error: ${error.message}`);
    next(error);
  }
};

/**
 * Middleware to restrict emergency dashboard access
 * Only healthcare professionals in emergency context can access
 * Regular patients cannot access emergency dashboard
 */
export const requireEmergencyDashboardAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    // Only healthcare professionals
    if (!['DOCTOR', 'NURSE', 'PARAMEDIC', 'EMERGENCY', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(req.user.role)) {
      logger.warn(`Unauthorized emergency dashboard access attempt: ${req.user.email} (role: ${req.user.role})`);
      return next(new AuthorizationError('Only healthcare professionals can access the emergency dashboard'));
    }

    next();
  } catch (error) {
    logger.error(`Emergency dashboard access check error: ${error.message}`);
    next(error);
  }
};

/**
 * Middleware to prevent patients from accessing emergency clinical data
 * Patients can manage their own emergency profile but cannot view clinical emergency access
 */
export const blockPatientEmergencyAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    // Block patients from emergency clinical endpoints
    if (req.user.role === 'PATIENT') {
      // Check if this is a clinical emergency endpoint
      if (req.path.includes('/access/') || req.path.includes('/summary')) {
        logger.warn(`Patient attempted to access emergency clinical data: ${req.user.email}`);
        return next(new AuthorizationError('Patients cannot access emergency clinical data'));
      }
    }

    next();
  } catch (error) {
    logger.error(`Emergency access blocking error: ${error.message}`);
    next(error);
  }
};
