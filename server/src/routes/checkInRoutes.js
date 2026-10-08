/**
 * Check-In Routes
 * 
 * Handles patient check-in, token assignment, and queue management.
 * Full authorization integration.
 * 
 * Endpoints:
 * POST   /checkin/check-in/:appointmentId   - Patient checks in for appointment
 * POST   /checkin/:tokenId/assign-token     - Assign token number (staff)
 * POST   /checkin/:tokenId/move-to-waiting  - Move to waiting (staff)
 * POST   /checkin/:tokenId/call-next        - Call next patient (doctor)
 * POST   /checkin/:tokenId/complete         - Complete consultation (doctor)
 * GET    /checkin/:tokenId/status           - Get token/queue status
 * GET    /checkin/queue/:facilityId/today   - Get today's queue (staff/doctor)
 */

const express = require('express');
const router = express.Router();
const CheckInService = require('../services/CheckInService');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

/**
 * POST /checkin/check-in/:appointmentId
 * Patient checks in for scheduled appointment
 * Creates AppointmentToken
 * 
 * Body: {
 *   patientPhone: string (optional, for verification),
 *   notes: string (optional, e.g., 'Running late')
 * }
 */
router.post('/check-in/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { patientPhone, notes } = req.body;

    const token = await CheckInService.checkInPatient(appointmentId, {
      patientPhone: patientPhone || '',
      notes: notes || '',
      checkedInBy: req.user.id,
    }, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: token,
      message: 'Patient checked in successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /checkin/:tokenId/assign-token
 * Assign token number to checked-in patient
 * Staff/Admin only
 * 
 * Body: {
 *   tokenNumber: number (e.g., 101, 102)
 * }
 */
router.post('/:tokenId/assign-token', authenticateToken, authorize(['STAFF', 'ADMIN', 'DOCTOR']), async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { tokenNumber } = req.body;

    if (tokenNumber === undefined) {
      return res.status(400).json({
        error: 'Missing required field: tokenNumber',
      });
    }

    const token = await CheckInService.assignToken(tokenId, {
      tokenNumber,
      assignedBy: req.user.id,
    }, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: token,
      message: `Token ${tokenNumber} assigned successfully`,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /checkin/:tokenId/move-to-waiting
 * Move patient from CHECKED_IN → WAITING state
 * Staff/Admin only
 */
router.post('/:tokenId/move-to-waiting', authenticateToken, authorize(['STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { tokenId } = req.params;

    const token = await CheckInService.moveToWaiting(tokenId, {
      movedBy: req.user.id,
    }, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: token,
      message: 'Patient moved to waiting',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /checkin/:tokenId/call-next
 * Call next patient from waiting queue → IN_CONSULTATION
 * Doctor/Staff only
 * 
 * Body: {
 *   roomNumber: string (optional, e.g., 'Room 5')
 * }
 */
router.post('/:tokenId/call-next', authenticateToken, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { roomNumber } = req.body;

    const token = await CheckInService.callNextPatient(tokenId, {
      roomNumber: roomNumber || '',
      calledBy: req.user.id,
    }, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: token,
      message: 'Patient called for consultation',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /checkin/:tokenId/complete
 * Complete consultation → COMPLETED state
 * Doctor/Staff only
 * 
 * Body: {
 *   consultationNotes: string (optional)
 * }
 */
router.post('/:tokenId/complete', authenticateToken, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { tokenId } = req.params;
    const { consultationNotes } = req.body;

    const token = await CheckInService.completeConsultation(tokenId, {
      consultationNotes: consultationNotes || '',
      completedBy: req.user.id,
    }, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: token,
      message: 'Consultation completed',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /checkin/:tokenId/status
 * Get current token status and queue position
 */
router.get('/:tokenId/status', authenticateToken, async (req, res) => {
  try {
    const { tokenId } = req.params;

    const status = await CheckInService.getTokenStatus(tokenId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /checkin/queue/:facilityId/today
 * Get today's queue for a facility
 * Shows all patients checked in today with their statuses
 * Staff/Doctor/Admin only
 * 
 * Query params:
 * - status: optional filter (CHECKED_IN, TOKEN_ASSIGNED, WAITING, IN_CONSULTATION, COMPLETED)
 * - doctorId: optional filter (for doctor's patients)
 */
router.get('/queue/:facilityId/today', authenticateToken, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { facilityId } = req.params;
    const { status, doctorId } = req.query;

    // Verify user is authorized at this facility
    if (req.user.role === 'STAFF' && req.user.facilityId !== facilityId) {
      return res.status(403).json({
        error: 'Not authorized to view queue at this facility',
      });
    }

    const filters = {};
    if (status) filters.status = status;
    if (doctorId) filters.doctorId = doctorId;

    const queue = await CheckInService.getTodayQueue(facilityId, filters, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: queue,
      count: queue.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

module.exports = router;
