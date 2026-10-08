/**
 * Appointment Routes
 * 
 * Handles appointment booking, retrieval, rescheduling, and cancellation.
 * Full authorization integration via ClinicalAuthorizationBoundary.
 * 
 * Endpoints:
 * POST   /appointments/book              - Book new appointment
 * GET    /appointments/patient/:patientId - Get patient's appointments
 * GET    /appointments/doctor/:doctorId  - Get doctor's appointments (doctor/admin only)
 * GET    /appointments/:appointmentId    - Get appointment details
 * PATCH  /appointments/:appointmentId/reschedule - Reschedule appointment
 * DELETE /appointments/:appointmentId    - Cancel appointment
 */

import express from 'express';
import AppointmentService from '../services/AppointmentService.js';
import { authMiddleware, requireRole } from '../middleware/authentication.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /appointments/book
 * Book a new appointment
 * 
 * Body: {
 *   patientId: string (UUID),
 *   providerId: string (UUID),
 *   facilityId: string (UUID),
 *   scheduledDateTime: ISO8601 date string,
 *   duration: number (minutes),
 *   reason: string,
 *   notes: string (optional)
 * }
 */
router.post('/book', authMiddleware, async (req, res) => {
  try {
    const { patientId, providerId, facilityId, scheduledDateTime, duration, reason, notes } =
      req.body;

    // Validate required fields
    if (!patientId || !providerId || !facilityId || !scheduledDateTime || !duration || !reason) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, providerId, facilityId, scheduledDateTime, duration, reason',
      });
    }

    const appointmentData = {
      patientId,
      providerId,
      facilityId,
      scheduledDateTime: new Date(scheduledDateTime),
      duration,
      reason,
      notes: notes || '',
    };

    const appointment = await AppointmentService.bookAppointment(appointmentData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /appointments/patient/:patientId
 * Get all appointments for a patient
 * 
 * Query params:
 * - status: optional filter (e.g. 'scheduled', 'completed', 'cancelled')
 * - startDate: optional ISO8601
 * - endDate: optional ISO8601
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, startDate, endDate } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const appointments = await AppointmentService.getPatientAppointments(patientId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /appointments/doctor/:doctorId
 * Get all appointments for a doctor
 * Requires DOCTOR or ADMIN role
 * 
 * Query params:
 * - facilityId: required (doctor can only view appointments at authorized facilities)
 * - status: optional filter
 * - startDate: optional ISO8601
 * - endDate: optional ISO8601
 */
router.get('/doctor/:doctorId', authMiddleware, authorize(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { facilityId, status, startDate, endDate } = req.query;

    if (!facilityId) {
      return res.status(400).json({
        error: 'facilityId query parameter is required',
      });
    }

    const filters = {
      facilityId,
    };
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const appointments = await AppointmentService.getDoctorAppointments(doctorId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: appointments,
      count: appointments.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /appointments/:appointmentId
 * Get appointment details
 */
router.get('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await AppointmentService.getAppointmentDetails(appointmentId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: appointment,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /appointments/:appointmentId/reschedule
 * Reschedule an appointment
 * 
 * Body: {
 *   newScheduledDateTime: ISO8601 date string,
 *   reason: string (optional reschedule reason)
 * }
 */
router.patch('/:appointmentId/reschedule', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { newScheduledDateTime, reason } = req.body;

    if (!newScheduledDateTime) {
      return res.status(400).json({
        error: 'Missing required field: newScheduledDateTime',
      });
    }

    const appointment = await AppointmentService.rescheduleAppointment(
      appointmentId,
      {
        newScheduledDateTime: new Date(newScheduledDateTime),
        reason: reason || '',
      },
      {
        id: req.user.id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment rescheduled successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * DELETE /appointments/:appointmentId
 * Cancel an appointment
 * 
 * Query params:
 * - reason: optional cancellation reason
 */
router.delete('/:appointmentId', authMiddleware, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { reason } = req.query;

    const result = await AppointmentService.cancelAppointment(appointmentId, {
      reason: reason || '',
      cancelledBy: req.user.id,
    }, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: result,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
