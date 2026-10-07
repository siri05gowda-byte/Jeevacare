import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate JWT token
 */
export const generateToken = (userId, role) => {
  const payload = {
    userId,
    role,
  };

  const token = jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiration,
  });

  return token;
};

/**
 * Generate refresh token
 */
export const generateRefreshToken = (userId) => {
  const payload = {
    userId,
  };

  const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiration,
  });

  return refreshToken;
};

/**
 * Verify JWT token
 */
export const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Verify refresh token
 */
export const verifyRefreshToken = (token) => {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret);
    return decoded;
  } catch (error) {
    return null;
  }
};

/**
 * Extract token from Authorization header
 */
export const extractTokenFromHeader = (authHeader) => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};
