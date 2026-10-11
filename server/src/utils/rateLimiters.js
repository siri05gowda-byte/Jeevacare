import rateLimit from 'express-rate-limit';
import config from '../config/index.js';
import logger from './logger.js';

/**
 * Extracts the real client IP address behind reverse proxies (Render, Cloudflare, etc.).
 * Prioritizes trusted provider headers before falling back to req.ip.
 *
 * @param {import('express').Request} req
 * @returns {string}
 */
export const getClientIp = (req) => {
  if (!req) return '127.0.0.1';

  // Rely on Express's validated req.ip (configured with trusted proxy subnets).
  // Express traverses X-Forwarded-For from right to left across trusted internal proxies
  // (loopback, linklocal, uniquelocal), safely ignoring any client-injected spoofed headers.
  return req.ip || req.socket?.remoteAddress || '127.0.0.1';
};

/**
 * Dedicated rate limiter for authentication endpoints (login, register).
 * Provides strict brute-force protection without sharing limits with general EHR API browsing.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 authentication attempts per 15 minutes per IP
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    const clientIp = getClientIp(req);
    logger.warn(`Auth rate limit exceeded for client IP: ${clientIp}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many authentication attempts. Please try again after 15 minutes.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      },
    });
  },
});

/**
 * General API rate limiter for EHR data endpoints.
 * Keyed per real client IP so traffic is isolated per user.
 */
export const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs || 900000,
  max: config.security.rateLimitMaxRequests || 100,
  keyGenerator: (req) => getClientIp(req),
  standardHeaders: true,
  legacyHeaders: false,
  // Skip auth endpoints as they have their own dedicated limiter
  skip: (req) => {
    const path = req.path || req.originalUrl || '';
    return path.includes('/auth/login') || path.includes('/auth/register');
  },
  handler: (req, res) => {
    const clientIp = getClientIp(req);
    logger.warn(`API rate limit exceeded for client IP: ${clientIp}`);
    res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests from this IP, please try again later.',
        code: 'API_RATE_LIMIT_EXCEEDED',
        statusCode: 429,
        timestamp: new Date().toISOString(),
      },
    });
  },
});
