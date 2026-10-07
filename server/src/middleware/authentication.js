import logger from '../utils/logger.js';
import { extractTokenFromHeader, verifyToken } from '../utils/auth.js';
import { AuthenticationError, AuthorizationError } from '../utils/errors.js';
import User from '../models/User.js';

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
 */
export const requirePatientIsolation = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new AuthenticationError('User not authenticated'));
    }

    const patientIdFromRequest = req.params.patientId || req.body.patientId;

    if (!patientIdFromRequest) {
      return next(new Error('Patient ID not found in request'));
    }

    // Patients can only access their own records
    if (req.user.role === 'PATIENT') {
      const userPatient = await User.findById(req.user._id);
      if (!userPatient || !userPatient.profile) {
        return next(new AuthenticationError('User profile not found'));
      }

      // TODO: Link user to patient and verify
      // For now, this is a placeholder for patient isolation logic
    }

    next();
  } catch (error) {
    logger.error(`Patient isolation check error: ${error.message}`);
    next(error);
  }
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
