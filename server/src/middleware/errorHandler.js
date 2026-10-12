import logger from '../utils/logger.js';
import { formatErrorResponse } from '../utils/errors.js';
import { redactError } from '../utils/secretRedactor.js';

/**
 * Global error handling middleware
 * Must be registered last in the middleware chain
 */
export const errorHandler = (err, req, res, _next) => {
  // Redact sensitive data from error before logging
  const sanitizedError = redactError(err);

  // Log the error
  const errorInfo = {
    method: req.method,
    path: req.path,
    message: sanitizedError.message,
    code: err.code,
    statusCode: err.statusCode || 500,
    userId: req.user?._id,
  };

  if (err.statusCode >= 500 || !err.statusCode) {
    logger.error(`Server error: ${JSON.stringify(errorInfo)}`);
  } else {
    logger.warn(`Client error: ${JSON.stringify(errorInfo)}`);
  }

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Format error response (never include stack traces in production)
  const response = formatErrorResponse(err);

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found middleware
 * Should be registered after all other routes
 */
export const notFoundHandler = (req, res) => {
  // Reduce noise: only log non-trivial 404s
  const isHealthCheck = req.path === '/' || req.path === '/healthz' || req.path === '/health';
  const isAssetRequest = req.path.match(/\.(js|css|png|jpg|ico|woff2?)$/);

  if (!isHealthCheck && !isAssetRequest) {
    logger.warn(`404 Not Found: ${req.method} ${req.path}`);
  }

  res.status(404).json({
    success: false,
    error: {
      message: 'Resource not found',
      code: 'NOT_FOUND',
      statusCode: 404,
      path: req.path,
      timestamp: new Date(),
    },
  });
};
