/**
 * Schedule Routes
 * 
 * Handles doctor schedule management, availability slots, and leave/unavailable dates.
 * Full authorization integration.
 * 
 * Endpoints:
 * POST   /schedules                         - Create/update doctor schedule
 * GET    /schedules/doctor/:doctorId        - Get doctor's schedule
 * GET    /schedules/doctor/:doctorId/slots - Get available appointment slots
 * POST   /schedules/:scheduleId/unavailable - Add unavailable date/time
 * GET    /schedules/facility/:facilityId    - Get all doctor schedules at facility (admin only)
 */

const express = require('express');
const router = express.Router();
const ScheduleService = require('../services/ScheduleService');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

/**
 * POST /schedules
 * Create or update doctor schedule
 * Only the doctor or admin can create/update their own schedule
 * 
 * Body: {
 *   doctorId: string (UUID),
 *   facilityId: string (UUID),
 *   workingDays: [
 *     {
 *       day: 'MONDAY' | 'TUESDAY' | ... | 'SUNDAY',
 *       startTime: 'HH:MM' (24-hour),
 *       endTime: 'HH:MM' (24-hour),
 *       slotDuration: number (minutes per appointment)
 *     }
 *   ],
 *   capacityPerDay: number,
 *   speciality: string (optional)
 * }
 */
router.post('/', authenticateToken, authorize(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const { doctorId, facilityId, workingDays, capacityPerDay, speciality } = req.body;

    // Validate required fields
    if (!doctorId || !facilityId || !workingDays || !capacityPerDay) {
      return res.status(400).json({
        error: 'Missing required fields: doctorId, facilityId, workingDays, capacityPerDay',
      });
    }

    // Doctor can only update their own schedule (unless admin)
    if (req.user.role === 'DOCTOR' && req.user.id !== doctorId) {
      return res.status(403).json({
        error: 'Doctor can only update their own schedule',
      });
    }

    const scheduleData = {
      doctorId,
      facilityId,
      workingDays,
      capacityPerDay,
      speciality: speciality || '',
    };

    const schedule = await ScheduleService.createOrUpdateSchedule(scheduleData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: schedule,
      message: 'Schedule created/updated successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /schedules/doctor/:doctorId
 * Get doctor's schedule
 */
router.get('/doctor/:doctorId', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;

    const schedule = await ScheduleService.getSchedule(doctorId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    if (!schedule) {
      return res.status(404).json({
        error: 'Schedule not found for this doctor',
      });
    }

    res.json({
      success: true,
      data: schedule,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /schedules/doctor/:doctorId/slots
 * Get available appointment slots for a doctor
 * 
 * Query params:
 * - facilityId: required (UUID)
 * - date: optional (specific date to check, ISO8601)
 * - dateRange: optional ('today', 'week', 'month')
 */
router.get('/doctor/:doctorId/slots', authenticateToken, async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { facilityId, date, dateRange } = req.query;

    if (!facilityId) {
      return res.status(400).json({
        error: 'facilityId query parameter is required',
      });
    }

    let targetDate = null;
    if (date) {
      targetDate = new Date(date);
      if (isNaN(targetDate)) {
        return res.status(400).json({
          error: 'Invalid date format',
        });
      }
    }

    const slots = await ScheduleService.getAvailableSlots(
      doctorId,
      facilityId,
      {
        specificDate: targetDate,
        dateRange: dateRange || 'week',
      },
      {
        id: req.user.id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    res.json({
      success: true,
      data: slots,
      count: slots.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /schedules/:scheduleId/unavailable
 * Add unavailable date or time slot
 * Only the doctor or admin can add unavailable times
 * 
 * Body: {
 *   type: 'date' | 'time',
 *   date: ISO8601 date (required for both),
 *   startTime: 'HH:MM' (required if type='time'),
 *   endTime: 'HH:MM' (required if type='time'),
 *   reason: string (optional, e.g., 'Leave', 'Conference')
 * }
 */
router.post('/:scheduleId/unavailable', authenticateToken, authorize(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const { type, date, startTime, endTime, reason } = req.body;

    // Validate
    if (!type || !date) {
      return res.status(400).json({
        error: 'Missing required fields: type (date|time), date',
      });
    }

    if (type === 'time' && (!startTime || !endTime)) {
      return res.status(400).json({
        error: 'startTime and endTime required for type=time',
      });
    }

    const unavailableData = {
      type,
      date: new Date(date),
      startTime: startTime || null,
      endTime: endTime || null,
      reason: reason || '',
    };

    const schedule = await ScheduleService.addUnavailableDate(scheduleId, unavailableData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: schedule,
      message: 'Unavailable time added successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : error.message.includes('Not found') ? 404 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /schedules/facility/:facilityId
 * Get all doctor schedules at a facility
 * Admin or facility staff only
 */
router.get('/facility/:facilityId', authenticateToken, authorize(['ADMIN', 'STAFF']), async (req, res) => {
  try {
    const { facilityId } = req.params;

    // Verify user is authorized to view schedules at this facility
    if (req.user.role === 'STAFF' && req.user.facilityId !== facilityId) {
      return res.status(403).json({
        error: 'Not authorized to view schedules at this facility',
      });
    }

    const schedules = await ScheduleService.getSchedulesByFacility(facilityId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: schedules,
      count: schedules.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

module.exports = router;
