/**
 * Encounter Routes
 * 
 * Handles clinical encounters (appointment-based consultations).
 * Full authorization integration.
 * 
 * Endpoints:
 * POST   /encounters                   - Create encounter from appointment
 * GET    /encounters/:encounterId      - Get encounter details
 * PATCH  /encounters/:encounterId      - Update encounter notes
 * POST   /encounters/:encounterId/complete - Complete encounter
 * GET    /encounters/patient/:patientId - Get patient's encounters
 * GET    /encounters/by-appointment/:appointmentId - Get encounter for appointment
 */

const express = require('express');
const router = express.Router();
const EncounterService = require('../services/EncounterService');
const { authenticateToken, authorize } = require('../middleware/authMiddleware');

/**
 * POST /encounters
 * Create encounter from appointment
 * Doctor/Staff only
 * 
 * Body: {
 *   appointmentId: string (UUID),
 *   patientId: string (UUID),
 *   doctorId: string (UUID),
 *   facilityId: string (UUID),
 *   encounterType: string (e.g., 'consultation', 'follow-up', 'procedure'),
 *   notes: string (optional)
 * }
 */
router.post('/', authenticateToken, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { appointmentId, patientId, doctorId, facilityId, encounterType, notes } = req.body;

    // Validate required fields
    if (!appointmentId || !patientId || !doctorId || !facilityId || !encounterType) {
      return res.status(400).json({
        error: 'Missing required fields: appointmentId, patientId, doctorId, facilityId, encounterType',
      });
    }

    const encounterData = {
      appointmentId,
      patientId,
      doctorId,
      facilityId,
      encounterType,
      notes: notes || '',
      status: 'in_progress',
    };

    const encounter = await EncounterService.createEncounter(encounterData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: encounter,
      message: 'Encounter created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /encounters/:encounterId
 * Get encounter details
 */
router.get('/:encounterId', authenticateToken, async (req, res) => {
  try {
    const { encounterId } = req.params;

    const encounter = await EncounterService.getEncounterDetails(encounterId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: encounter,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /encounters/:encounterId
 * Update encounter notes and/or status
 * Doctor/Staff only
 * 
 * Body: {
 *   notes: string (optional, appends to existing notes),
 *   status: string (optional, e.g., 'in_progress', 'completed')
 * }
 */
router.patch('/:encounterId', authenticateToken, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { encounterId } = req.params;
    const { notes, status } = req.body;

    const updateData = {};
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        error: 'No update fields provided',
      });
    }

    const encounter = await EncounterService.updateEncounter(encounterId, updateData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: encounter,
      message: 'Encounter updated successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /encounters/:encounterId/complete
 * Complete encounter (mark as completed)
 * Doctor/Staff only
 * 
 * Body: {
 *   completionNotes: string (optional, final notes)
 * }
 */
router.post('/:encounterId/complete', authenticateToken, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { encounterId } = req.params;
    const { completionNotes } = req.body;

    const encounter = await EncounterService.completeEncounter(
      encounterId,
      {
        completionNotes: completionNotes || '',
        completedBy: req.user.id,
      },
      {
        id: req.user.id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    res.json({
      success: true,
      data: encounter,
      message: 'Encounter completed successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /encounters/patient/:patientId
 * Get all encounters for a patient
 * 
 * Query params:
 * - status: optional filter (in_progress, completed)
 * - startDate: optional ISO8601
 * - endDate: optional ISO8601
 */
router.get('/patient/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { status, startDate, endDate } = req.query;

    const filters = {};
    if (status) filters.status = status;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const encounters = await EncounterService.getPatientEncounters(patientId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: encounters,
      count: encounters.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /encounters/by-appointment/:appointmentId
 * Get encounter linked to specific appointment
 */
router.get('/by-appointment/:appointmentId', authenticateToken, async (req, res) => {
  try {
    const { appointmentId } = req.params;

    const encounter = await EncounterService.getEncounterByAppointment(appointmentId);

    if (!encounter) {
      return res.status(404).json({
        error: 'No encounter found for this appointment',
      });
    }

    // Authorization check
    const { ClinicalAuthorizationBoundary } = require('../authorization/ClinicalAuthorizationBoundary');
    const { authorized } = await ClinicalAuthorizationBoundary.canAccessPatientClinicalRecord(
      req.user.id,
      encounter.patientId,
      req.user.facilityId
    );

    if (!authorized) {
      return res.status(403).json({
        error: 'Not authorized to view this encounter',
      });
    }

    res.json({
      success: true,
      data: encounter,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

module.exports = router;
