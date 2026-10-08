import express from 'express';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import RadiologyService from '../services/RadiologyService.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /api/radiology
 * Create a radiology record
 */
router.post('/', authMiddleware, authorize(['DOCTOR', 'NURSE', 'RADIOLOGY_TECHNICIAN']), async (req, res) => {
  try {
    const {
      patientId,
      hospitalId,
      studyDate,
      reportDate,
      modalityType,
      bodyPart,
      clinicalIndication,
      findings,
      impression,
      recommendation,
      radiologistName,
      radiologistLicense,
      imageReference,
      encounterId,
    } = req.body;

    if (!patientId || !studyDate || !reportDate || !modalityType || !bodyPart || !hospitalId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, hospitalId, studyDate, reportDate, modalityType, bodyPart',
      });
    }

    const radiologyData = {
      patientId,
      hospitalId,
      encounterId,
      studyDate,
      reportDate,
      modalityType,
      bodyPart,
      clinicalIndication,
      findings,
      impression,
      recommendation,
      radiologistName,
      radiologistLicense,
      imageReference,
    };

    const radiologyRecord = await RadiologyService.createRadiologyRecord(radiologyData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: radiologyRecord,
      message: 'Radiology record created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/radiology/:radiologyId
 * Get radiology record details
 */
router.get('/:radiologyId', authMiddleware, async (req, res) => {
  try {
    const { radiologyId } = req.params;

    const radiologyRecord = await RadiologyService.getRadiologyRecord(radiologyId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: radiologyRecord,
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/radiology/patient/:patientId
 * Get all radiology records for a patient
 * Query params:
 * - modalityType: optional (x_ray|ct_scan|mri|ultrasound|pet_scan|dexa_scan|other)
 * - bodyPart: optional
 * - hasCriticalFindings: optional (true/false)
 * - dateFrom: optional ISO8601
 * - dateTo: optional ISO8601
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { modalityType, bodyPart, hasCriticalFindings, dateFrom, dateTo } = req.query;

    const filters = {};
    if (modalityType) filters.modalityType = modalityType;
    if (bodyPart) filters.bodyPart = bodyPart;
    if (hasCriticalFindings !== undefined) filters.hasCriticalFindings = hasCriticalFindings === 'true';
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const records = await RadiologyService.getPatientRadiologyRecords(patientId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: records,
      count: records.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PUT /api/radiology/:radiologyId
 * Update/amend radiology record
 * Body: {
 *   studyDate?: ISO8601,
 *   reportDate?: ISO8601,
 *   modalityType?: string,
 *   bodyPart?: string,
 *   clinicalIndication?: string,
 *   findings?: string,
 *   impression?: string,
 *   recommendation?: string,
 *   radiologistName?: string,
 *   radiologistLicense?: string,
 *   reason: string (required - reason for amendment)
 * }
 */
router.put('/:radiologyId', authMiddleware, authorize(['DOCTOR', 'NURSE', 'RADIOLOGY_TECHNICIAN']), async (req, res) => {
  try {
    const { radiologyId } = req.params;
    const updateData = req.body;

    if (!updateData.reason) {
      return res.status(400).json({
        error: 'Missing required field: reason (for amendment)',
      });
    }

    const amendment = await RadiologyService.updateRadiologyRecord(radiologyId, updateData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: amendment,
      message: 'Radiology record amended successfully',
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/radiology/:radiologyId/flag-critical
 * Flag radiology record as having critical findings
 * Body: { findings: string }
 */
router.patch('/:radiologyId/flag-critical', authMiddleware, authorize(['DOCTOR', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { radiologyId } = req.params;
    const { findings } = req.body;

    if (!findings) {
      return res.status(400).json({
        error: 'Missing required field: findings',
      });
    }

    const radiologyRecord = await RadiologyService.flagAsCritical(radiologyId, { findings }, {
      _id: req.user.id,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: radiologyRecord,
      message: 'Radiology record flagged as critical',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
