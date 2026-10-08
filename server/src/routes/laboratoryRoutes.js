import express from 'express';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import LaboratoryService from '../services/LaboratoryService.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /api/lab-results
 * Create a laboratory result record
 */
router.post('/', authMiddleware, authorize(['DOCTOR', 'NURSE', 'LAB_TECHNICIAN']), async (req, res) => {
  try {
    const {
      patientId,
      hospitalId,
      labName,
      labTestName,
      labTestCode,
      sampleCollectionDate,
      resultReceivedDate,
      results,
      interpretation,
      labProviderId,
      encounterId,
    } = req.body;

    if (!patientId || !labName || !labTestName || !sampleCollectionDate || !resultReceivedDate || !hospitalId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, hospitalId, labName, labTestName, sampleCollectionDate, resultReceivedDate',
      });
    }

    const labData = {
      patientId,
      hospitalId,
      encounterId,
      labName,
      labTestName,
      labTestCode,
      sampleCollectionDate,
      resultReceivedDate,
      results,
      interpretation,
      labProviderId,
    };

    const labResult = await LaboratoryService.createLaboratoryResult(labData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: labResult,
      message: 'Laboratory result created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/lab-results/:labResultId
 * Get laboratory result details
 */
router.get('/:labResultId', authMiddleware, async (req, res) => {
  try {
    const { labResultId } = req.params;

    const labResult = await LaboratoryService.getLaboratoryResult(labResultId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: labResult,
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/lab-results/patient/:patientId
 * Get all laboratory results for a patient
 * Query params:
 * - labTestName: optional
 * - isCritical: optional (true/false)
 * - dateFrom: optional ISO8601
 * - dateTo: optional ISO8601
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { labTestName, isCritical, dateFrom, dateTo } = req.query;

    const filters = {};
    if (labTestName) filters.labTestName = labTestName;
    if (isCritical !== undefined) filters.isCritical = isCritical === 'true';
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const results = await LaboratoryService.getPatientLaboratoryResults(patientId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PUT /api/lab-results/:labResultId
 * Update/amend laboratory result
 * Body: {
 *   labName?: string,
 *   labTestName?: string,
 *   labTestCode?: string,
 *   sampleCollectionDate?: ISO8601,
 *   resultReceivedDate?: ISO8601,
 *   results?: array,
 *   interpretation?: string,
 *   reason: string (required - reason for amendment)
 * }
 */
router.put('/:labResultId', authMiddleware, authorize(['DOCTOR', 'NURSE', 'LAB_TECHNICIAN']), async (req, res) => {
  try {
    const { labResultId } = req.params;
    const updateData = req.body;

    if (!updateData.reason) {
      return res.status(400).json({
        error: 'Missing required field: reason (for amendment)',
      });
    }

    const amendment = await LaboratoryService.updateLaboratoryResult(labResultId, updateData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: amendment,
      message: 'Laboratory result amended successfully',
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/lab-results/:labResultId/flag-critical
 * Flag laboratory result as critical
 * Body: { reason: string }
 */
router.patch('/:labResultId/flag-critical', authMiddleware, authorize(['DOCTOR', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { labResultId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        error: 'Missing required field: reason',
      });
    }

    const labResult = await LaboratoryService.flagAsCritical(labResultId, { reason }, {
      _id: req.user.id,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: labResult,
      message: 'Laboratory result flagged as critical',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
