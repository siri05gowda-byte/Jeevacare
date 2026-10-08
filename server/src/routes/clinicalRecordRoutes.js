/**
 * Clinical Record Routes
 * 
 * Handles clinical record creation, retrieval, and amendment workflow.
 * Enforces immutability: provider-verified records cannot be edited.
 * Patients can request corrections via amendment workflow.
 * 
 * Endpoints:
 * POST   /records                          - Create clinical record
 * GET    /records/:recordId                - Get record details
 * GET    /records/patient/:patientId       - Get patient's records
 * POST   /records/:recordId/request-correction - Request amendment
 * POST   /records/:recordId/amendments/:amendmentId/accept - Accept correction
 * POST   /records/:recordId/amendments/:amendmentId/reject - Reject correction
 */

import express from 'express';
import ClinicalRecordService from '../services/ClinicalRecordService.js';
import { authMiddleware, requireRole } from '../middleware/authentication.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /records
 * Create clinical record
 * Doctor/Professional/Staff only
 * 
 * Body: {
 *   patientId: string (UUID),
 *   encounterId: string (UUID),
 *   facilityId: string (UUID),
 *   providerId: string (UUID),
 *   recordType: string (e.g., 'diagnosis', 'prescription', 'lab_result', 'imaging'),
 *   data: object (record-specific data),
 *   provider_verified: boolean (default: false),
 *   verifiedAt: ISO8601 (optional, if provider_verified=true)
 * }
 */
router.post('/', authMiddleware, authorize(['DOCTOR', 'STAFF', 'ADMIN']), async (req, res) => {
  try {
    const { patientId, encounterId, facilityId, providerId, recordType, data, provider_verified, verifiedAt } = req.body;

    // Validate required fields
    if (!patientId || !recordType || !data) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, recordType, data',
      });
    }

    const recordData = {
      patientId,
      encounterId: encounterId || null,
      facilityId: facilityId || req.user.facilityId,
      providerId: providerId || req.user.id,
      recordType,
      data,
      provider_verified: provider_verified === true,
      verifiedAt: provider_verified ? new Date(verifiedAt || Date.now()) : null,
    };

    const record = await ClinicalRecordService.createClinicalRecord(recordData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: record,
      message: 'Clinical record created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /records/:recordId
 * Get clinical record details
 * Patient can view their own records, doctor/staff can view authorized patient records
 */
router.get('/:recordId', authMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;

    const record = await ClinicalRecordService.getClinicalRecord(recordId, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /records/patient/:patientId
 * Get all clinical records for a patient
 * 
 * Query params:
 * - recordType: optional filter (diagnosis, prescription, lab_result, imaging)
 * - provider_verified: optional filter (true/false)
 * - startDate: optional ISO8601
 * - endDate: optional ISO8601
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { recordType, provider_verified, startDate, endDate } = req.query;

    const filters = {};
    if (recordType) filters.recordType = recordType;
    if (provider_verified !== undefined) filters.provider_verified = provider_verified === 'true';
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    const records = await ClinicalRecordService.getPatientRecords(patientId, {
      id: req.user.id,
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
 * POST /records/:recordId/request-correction
 * Request correction/amendment to clinical record
 * Patient initiates; provider accepts/rejects
 * 
 * Body: {
 *   reason: string (why correction is needed),
 *   changedFields: object (which fields should be changed and why),
 *   suggestedData: object (optional suggested changes)
 * }
 */
router.post('/:recordId/request-correction', authMiddleware, async (req, res) => {
  try {
    const { recordId } = req.params;
    const { reason, changedFields, suggestedData } = req.body;

    // Validate
    if (!reason || !changedFields) {
      return res.status(400).json({
        error: 'Missing required fields: reason, changedFields',
      });
    }

    const correctionData = {
      reason,
      changedFields,
      suggestedData: suggestedData || {},
      requestedBy: req.user.id,
    };

    const result = await ClinicalRecordService.requestCorrection(recordId, correctionData, {
      id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: result,
      message: 'Correction request submitted successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /records/:recordId/amendments/:amendmentId/accept
 * Accept correction request - creates amended record
 * Provider only
 * 
 * Body: {
 *   amendedData: object (final corrected data),
 *   acceptanceNotes: string (optional, why correction was accepted)
 * }
 */
router.post('/:recordId/amendments/:amendmentId/accept', authMiddleware, authorize(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const { recordId, amendmentId } = req.params;
    const { amendedData, acceptanceNotes } = req.body;

    if (!amendedData) {
      return res.status(400).json({
        error: 'Missing required field: amendedData',
      });
    }

    const result = await ClinicalRecordService.acceptCorrection(
      recordId,
      amendmentId,
      {
        amendedData,
        acceptanceNotes: acceptanceNotes || '',
        acceptedBy: req.user.id,
      },
      {
        id: req.user.id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    res.json({
      success: true,
      data: result,
      message: 'Correction accepted. Amendment record created.',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * POST /records/:recordId/amendments/:amendmentId/reject
 * Reject correction request
 * Provider only
 * 
 * Body: {
 *   rejectionReason: string (why correction was rejected)
 * }
 */
router.post('/:recordId/amendments/:amendmentId/reject', authMiddleware, authorize(['DOCTOR', 'ADMIN']), async (req, res) => {
  try {
    const { recordId, amendmentId } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason) {
      return res.status(400).json({
        error: 'Missing required field: rejectionReason',
      });
    }

    const result = await ClinicalRecordService.rejectCorrection(
      recordId,
      amendmentId,
      {
        rejectionReason,
        rejectedBy: req.user.id,
      },
      {
        id: req.user.id,
        role: req.user.role,
        facilityId: req.user.facilityId,
      }
    );

    res.json({
      success: true,
      data: result,
      message: 'Correction request rejected',
    });
  } catch (error) {
    res.status(error.message.includes('Not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
