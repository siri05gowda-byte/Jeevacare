import express from 'express';
import { query, param, validationResult } from 'express-validator';
import Notification from '../models/Notification.js';
import { authMiddleware } from '../middleware/authentication.js';
import { ValidationError, NotFoundError } from '../utils/errors.js';

const router = express.Router();

/**
 * Middleware for validation error handling
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        details: errors.array(),
      },
    });
  }
  next();
};

// All notification routes require authentication
router.use(authMiddleware);

/**
 * GET /api/v1/notifications
 * Get notifications for the authenticated user
 */
router.get(
  '/',
  [
    query('read').optional().isBoolean().withMessage('read must be a boolean'),
    query('type')
      .optional()
      .isIn([
        'staff_invitation',
        'staff_approval',
        'staff_rejection',
        'document_uploaded',
        'appointment_created',
        'appointment_updated',
        'appointment_cancelled',
        'lab_result_ready',
        'prescription_ready',
        'system_announcement',
        'verification_required',
      ])
      .withMessage('Invalid notification type'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
    query('skip').optional().isInt({ min: 0 }).withMessage('skip must be >= 0'),
  ],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { read, type, limit = 50, skip = 0 } = req.query;

      const filter = { userId };
      if (read !== undefined) {
        filter.read = read === 'true';
      }
      if (type) {
        filter.type = type;
      }

      const notifications = await Notification.find(filter)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip))
        .lean();

      const total = await Notification.countDocuments(filter);
      const unreadCount = await Notification.getUnreadCount(userId);

      res.json({
        success: true,
        data: notifications,
        meta: {
          total,
          unreadCount,
          limit: parseInt(limit),
          skip: parseInt(skip),
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/v1/notifications/unread-count
 * Get count of unread notifications
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const count = await Notification.getUnreadCount(userId);

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PATCH /api/v1/notifications/:id/read
 * Mark a notification as read
 */
router.patch(
  '/:id/read',
  [param('id').isMongoId().withMessage('Invalid notification ID')],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const notification = await Notification.findOne({ _id: id, userId });
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      await notification.markAsRead();

      res.json({
        success: true,
        message: 'Notification marked as read',
        data: notification,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/v1/notifications/mark-all-read
 * Mark all notifications as read for the authenticated user
 */
router.patch('/mark-all-read', async (req, res, next) => {
  try {
    const userId = req.user._id;
    const result = await Notification.markAllAsRead(userId);

    res.json({
      success: true,
      message: 'All notifications marked as read',
      data: {
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/v1/notifications/:id
 * Delete a notification
 */
router.delete(
  '/:id',
  [param('id').isMongoId().withMessage('Invalid notification ID')],
  handleValidationErrors,
  async (req, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      const notification = await Notification.findOneAndDelete({ _id: id, userId });
      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      res.json({
        success: true,
        message: 'Notification deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
