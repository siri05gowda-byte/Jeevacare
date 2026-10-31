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
import Notification from '../models/Notification.js';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import logger from '../utils/logger.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /appointments/book or POST /appointments
 * Book a new appointment
 */
router.post(['/', '/book'], authMiddleware, async (req, res) => {
  try {
    const rawPatientId = req.body.patientId || (req.user.role === 'PATIENT' ? req.user.patientId || req.user._id : null);
    const providerId = req.body.providerId || req.body.doctorId;
    const facilityId = req.body.facilityId || req.body.hospitalId;
    const scheduledDateTime = req.body.scheduledDateTime || req.body.appointmentDate;
    const duration = Number(req.body.duration) || 30;
    const reason = req.body.reason || req.body.reasonForVisit || req.body.appointmentType || 'General Consultation';
    const notes = req.body.notes || '';

    // Validate required fields
    if (!rawPatientId || !providerId || !facilityId || !scheduledDateTime || !reason) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: patientId, providerId (or doctorId), facilityId (or hospitalId), scheduledDateTime (or appointmentDate), reason',
      });
    }

    const appointmentData = {
      patientId: rawPatientId,
      providerId,
      facilityId,
      hospitalId: facilityId,
      scheduledDateTime: new Date(scheduledDateTime),
      appointmentDate: new Date(scheduledDateTime),
      duration,
      reason,
      reasonForVisit: reason,
      notes,
    };

    const appointment = await AppointmentService.bookAppointment(appointmentData, {
      _id: req.user._id,
      id: req.user._id,
      role: req.user.role,
      facilityId: req.user.facilityId || facilityId,
    });

    // Create notification for patient about new appointment
    if (process.env.NODE_ENV !== 'test') {
      try {
        await Notification.createNotification({
          userId: appointmentData.patientId || rawPatientId,
          type: 'appointment_created',
          title: 'Appointment Scheduled',
          message: `Your appointment has been scheduled for ${new Date(scheduledDateTime).toLocaleString()}. Reason: ${reason}`,
          link: '/appointments',
          metadata: {
            appointmentId: appointment._id,
            providerId,
            facilityId,
            scheduledDateTime,
            reason,
          },
        });
      } catch (notifError) {
        logger?.warn?.(`Failed to create appointment notification: ${notifError.message}`);
        // Don't fail the appointment if notification fails
      }
    }

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
      _id: req.user._id,
      id: req.user._id,
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
router.get('/doctor/:doctorId', authMiddleware, authorize('DOCTOR', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'), async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { facilityId, status, startDate, endDate, date } = req.query;

    // Get facilityId from query or resolve from user's staff association
    let targetFacilityId = facilityId || req.user.facilityId;

    if (!targetFacilityId && req.user.role === 'DOCTOR') {
      try {
        const { ensureStaffAssociation } = await import('../utils/staffHelper.js');
        const staff = await ensureStaffAssociation(req.user);
        if (staff) {
          targetFacilityId = staff.hospitalId;
          req.user.facilityId = staff.hospitalId;
        }
      } catch (staffErr) {
        logger?.warn?.(`Failed to look up doctor staff association: ${staffErr.message}`);
      }
    }

    if (!targetFacilityId) {
      return res.status(400).json({
        success: false,
        error: 'No facility associated with your account. Please contact your administrator.',
        message: 'No active hospital facility association found for your doctor account. Please contact your hospital administrator for onboarding approval.',
        code: 'NO_FACILITY_ASSOCIATION',
        action: 'contact_admin'
      });
    }

    const filters = {
      facilityId: targetFacilityId,
    };
    if (status) filters.status = status;
    if (date) filters.date = date;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const appointments = await AppointmentService.getDoctorAppointments(doctorId, {
      _id: req.user._id,
      id: req.user._id?.toString(),
      role: req.user.role,
      facilityId: targetFacilityId,
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
 * GET /appointments/available-slots
 * Get available time slots for doctor at facility
 */
router.get('/available-slots', authMiddleware, async (req, res) => {
  try {
    const doctorId = req.query.doctorId || req.query.providerId;
    const facilityId = req.query.facilityId || req.query.hospitalId;
    const date = req.query.date;

    if (!doctorId || !facilityId || !date) {
      return res.status(400).json({
        success: false,
        error: 'Missing required query parameters: doctorId, facilityId, date',
      });
    }

    const slots = await AppointmentService.getAvailableSlots({
      doctorId,
      facilityId,
      date,
    });

    res.json({
      success: true,
      data: slots,
    });
  } catch (error) {
    logger?.error?.(`Available slots calculation error: ${error.message}`);
    res.status(400).json({
      success: false,
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
      _id: req.user._id,
      id: req.user._id,
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
 * PATCH or POST /appointments/:appointmentId/reschedule
 * Reschedule an appointment
 */
const handleReschedule = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const newScheduledDateTime = req.body.newScheduledDateTime || req.body.appointmentDate || req.body.scheduledDateTime;
    const reason = req.body.reason || req.body.reasonForVisit;

    if (!newScheduledDateTime) {
      return res.status(400).json({
        success: false,
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
        _id: req.user._id,
        id: req.user._id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    // Create notification for patient about rescheduled appointment
    try {
      const targetUserId = appointment?.patientId?.userId || appointment?.patientId || appointment?.patient;
      if (targetUserId) {
        await Notification.createNotification({
          userId: targetUserId,
          type: 'appointment_updated',
          title: 'Appointment Rescheduled',
          message: `Your appointment has been rescheduled to ${new Date(newScheduledDateTime).toLocaleString()}${reason ? `. Reason: ${reason}` : '.'}`,
          link: '/appointments',
          metadata: {
            appointmentId: appointment._id,
            newScheduledDateTime,
            reason,
          },
        });
      }
    } catch (notifError) {
      logger?.warn?.(`Failed to create reschedule notification: ${notifError.message}`);
    }

    res.json({
      success: true,
      data: appointment,
      message: 'Appointment rescheduled successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      success: false,
      error: error.message,
    });
  }
};

router.patch('/:appointmentId/reschedule', authMiddleware, handleReschedule);
router.post('/:appointmentId/reschedule', authMiddleware, handleReschedule);

/**
 * DELETE or POST /appointments/:appointmentId/cancel
 * Cancel an appointment
 */
const handleCancel = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const reason = req.query.reason || req.body.reason;

    const result = await AppointmentService.cancelAppointment(appointmentId, {
      reason: reason || '',
      cancelledBy: req.user._id,
    }, {
      _id: req.user._id,
      id: req.user._id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    // Create notification for patient about cancelled appointment
    try {
      const targetUserId = result?.patientId?.userId || result?.patientId || result?.patient;
      if (targetUserId) {
        await Notification.createNotification({
          userId: targetUserId,
          type: 'appointment_cancelled',
          title: 'Appointment Cancelled',
          message: `Your appointment has been cancelled${reason ? `. Reason: ${reason}` : '.'}`,
          link: '/appointments',
          metadata: {
            appointmentId,
            reason,
            cancelledBy: req.user._id,
          },
        });
      }
    } catch (notifError) {
      logger?.warn?.(`Failed to create cancellation notification: ${notifError.message}`);
    }

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: result,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      success: false,
      error: error.message,
    });
  }
};

router.delete('/:appointmentId', authMiddleware, handleCancel);
router.post('/:appointmentId/cancel', authMiddleware, handleCancel);

const handleStatusUpdate = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;

    const validStatuses = ['scheduled', 'arrived', 'in-progress', 'completed', 'cancelled', 'no-show'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const appointment = await AppointmentService.updateAppointmentStatus(
      appointmentId,
      status,
      {
        _id: req.user._id,
        id: req.user._id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    res.json({
      success: true,
      data: appointment,
      message: `Appointment status updated to ${status}`,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      success: false,
      error: error.message,
    });
  }
};

router.patch('/:appointmentId/status', authMiddleware, handleStatusUpdate);
router.put('/:appointmentId/status', authMiddleware, handleStatusUpdate);

export default router;
