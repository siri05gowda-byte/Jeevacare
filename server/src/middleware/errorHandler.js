import logger from '../utils/logger.js';
import { formatErrorResponse, JeevaError } from '../utils/errors.js';

/**
 * Global error handling middleware
 * Must be registered last in the middleware chain
 */
export const errorHandler = (err, req, res, next) => {
  // Log the error
  const errorInfo = {
    method: req.method,
    path: req.path,
    message: err.message,
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

  // Format error response
  const response = formatErrorResponse(err);

  res.status(statusCode).json(response);
};

/**
 * 404 Not Found middleware
 * Should be registered after all other routes
 */
export const notFoundHandler = (req, res) => {
  logger.warn(`404 Not Found: ${req.method} ${req.path}`);

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
