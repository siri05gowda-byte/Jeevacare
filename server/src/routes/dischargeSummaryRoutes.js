import express from 'express';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import DischargeSummaryService from '../services/DischargeSummaryService.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /api/discharge-summaries
 * Create a discharge summary record
 */
router.post('/', authMiddleware, authorize(['DOCTOR', 'NURSE']), async (req, res) => {
  try {
    const {
      patientId,
      hospitalId,
      admissionDate,
      dischargeDate,
      primaryDiagnosis,
      primaryDiagnosisCode,
      secondaryDiagnoses,
      secondaryDiagnosisCodes,
      procedures,
      surgeriesPerformed,
      complications,
      medications,
      dischargeInstructions,
      dietaryRecommendations,
      activityRestrictions,
      followUpRequired,
      followUpSpecialty,
      followUpSchedule,
      referralToSpecialist,
      dischargeProviderId,
      dischargeVitals,
      dischargeDisposition,
      encounterId,
    } = req.body;

    if (!patientId || !admissionDate || !dischargeDate || !primaryDiagnosis || !hospitalId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, hospitalId, admissionDate, dischargeDate, primaryDiagnosis',
      });
    }

    const dischargeData = {
      patientId,
      hospitalId,
      encounterId,
      admissionDate,
      dischargeDate,
      primaryDiagnosis,
      primaryDiagnosisCode,
      secondaryDiagnoses,
      secondaryDiagnosisCodes,
      procedures,
      surgeriesPerformed,
      complications,
      medications,
      dischargeInstructions,
      dietaryRecommendations,
      activityRestrictions,
      followUpRequired,
      followUpSpecialty,
      followUpSchedule,
      referralToSpecialist,
      dischargeProviderId,
      dischargeVitals,
      dischargeDisposition,
    };

    const dischargeSummary = await DischargeSummaryService.createDischargeSummary(dischargeData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: dischargeSummary,
      message: 'Discharge summary created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/discharge-summaries/:dischargeSummaryId
 * Get discharge summary details
 */
router.get('/:dischargeSummaryId', authMiddleware, async (req, res) => {
  try {
    const { dischargeSummaryId } = req.params;

    const dischargeSummary = await DischargeSummaryService.getDischargeSummary(dischargeSummaryId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: dischargeSummary,
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/discharge-summaries/patient/:patientId
 * Get all discharge summaries for a patient
 * Query params:
 * - dischargeDisposition: optional (home|against_medical_advice|hospital_transfer|extended_care|hospice|expired)
 * - followUpRequired: optional (true/false)
 * - dateFrom: optional ISO8601
 * - dateTo: optional ISO8601
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { dischargeDisposition, followUpRequired, dateFrom, dateTo } = req.query;

    const filters = {};
    if (dischargeDisposition) filters.dischargeDisposition = dischargeDisposition;
    if (followUpRequired !== undefined) filters.followUpRequired = followUpRequired === 'true';
    if (dateFrom) filters.dateFrom = dateFrom;
    if (dateTo) filters.dateTo = dateTo;

    const summaries = await DischargeSummaryService.getPatientDischargeSummaries(patientId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    }, filters);

    res.json({
      success: true,
      data: summaries,
      count: summaries.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PUT /api/discharge-summaries/:dischargeSummaryId
 * Update/amend discharge summary
 * Body: {
 *   admissionDate?: ISO8601,
 *   dischargeDate?: ISO8601,
 *   primaryDiagnosis?: string,
 *   primaryDiagnosisCode?: string,
 *   secondaryDiagnoses?: array,
 *   secondaryDiagnosisCodes?: array,
 *   procedures?: array,
 *   surgeriesPerformed?: array,
 *   complications?: array,
 *   medications?: array,
 *   dischargeInstructions?: string,
 *   dietaryRecommendations?: string,
 *   activityRestrictions?: string,
 *   followUpRequired?: boolean,
 *   followUpSpecialty?: string,
 *   followUpSchedule?: string,
 *   dischargeVitals?: object,
 *   dischargeDisposition?: string,
 *   reason: string (required - reason for amendment)
 * }
 */
router.put('/:dischargeSummaryId', authMiddleware, authorize(['DOCTOR', 'NURSE']), async (req, res) => {
  try {
    const { dischargeSummaryId } = req.params;
    const updateData = req.body;

    if (!updateData.reason) {
      return res.status(400).json({
        error: 'Missing required field: reason (for amendment)',
      });
    }

    const amendment = await DischargeSummaryService.updateDischargeSummary(dischargeSummaryId, updateData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: amendment,
      message: 'Discharge summary amended successfully',
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/discharge-summaries/:dischargeSummaryId/flag-sensitive
 * Mark discharge summary as sensitive
 * Body: { isSensitive: boolean }
 */
router.patch('/:dischargeSummaryId/flag-sensitive', authMiddleware, authorize(['SYSTEM_ADMIN', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { dischargeSummaryId } = req.params;
    const { isSensitive } = req.body;

    const dischargeSummary = await DischargeSummaryService.setSensitiveFlag(dischargeSummaryId, isSensitive, {
      _id: req.user.id,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: dischargeSummary,
      message: `Discharge summary flagged as ${isSensitive ? 'sensitive' : 'not sensitive'}`,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
