import express from 'express';
import { authMiddleware, requireRole } from '../middleware/authentication.js';
import VaccinationService from '../services/VaccinationService.js';

const router = express.Router();
const { authorize } = { authorize: requireRole };

/**
 * POST /api/vaccinations
 * Create a vaccination record
 * Body: {
 *   patientId: string (UUID),
 *   hospitalId: string (UUID),
 *   vaccineName: string (required),
 *   dose: string (required),
 *   administrationDate: ISO8601 (required),
 *   batchNumber: string,
 *   provider: string (required),
 *   nextScheduledDate: ISO8601,
 *   site: string,
 *   route: string (intramuscular|oral|subcutaneous|intradermal|intravenous)
 * }
 */
router.post('/', authMiddleware, authorize(['DOCTOR', 'NURSE', 'PHARMACIST']), async (req, res) => {
  try {
    const {
      patientId,
      hospitalId,
      vaccineName,
      dose,
      administrationDate,
      batchNumber,
      provider,
      nextScheduledDate,
      site,
      route,
      encounterId,
    } = req.body;

    if (!patientId || !vaccineName || !dose || !administrationDate || !provider || !hospitalId) {
      return res.status(400).json({
        error: 'Missing required fields: patientId, hospitalId, vaccineName, dose, administrationDate, provider',
      });
    }

    const vaccinationData = {
      patientId,
      hospitalId,
      encounterId,
      vaccineName,
      dose,
      administrationDate,
      batchNumber,
      provider,
      nextScheduledDate,
      site,
      route,
    };

    const vaccination = await VaccinationService.createVaccination(vaccinationData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.status(201).json({
      success: true,
      data: vaccination,
      message: 'Vaccination record created successfully',
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/vaccinations/:vaccinationId
 * Get vaccination record details
 */
router.get('/:vaccinationId', authMiddleware, async (req, res) => {
  try {
    const { vaccinationId } = req.params;

    const vaccination = await VaccinationService.getVaccination(vaccinationId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: vaccination,
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * GET /api/vaccinations/patient/:patientId
 * Get all vaccination records for a patient
 */
router.get('/patient/:patientId', authMiddleware, async (req, res) => {
  try {
    const { patientId } = req.params;

    const vaccinations = await VaccinationService.getPatientVaccinations(patientId, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: vaccinations,
      count: vaccinations.length,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PUT /api/vaccinations/:vaccinationId
 * Update/amend vaccination record
 * Body: {
 *   vaccineName?: string,
 *   dose?: string,
 *   administrationDate?: ISO8601,
 *   batchNumber?: string,
 *   provider?: string,
 *   nextScheduledDate?: ISO8601,
 *   site?: string,
 *   route?: string,
 *   reason: string (required - reason for amendment)
 * }
 */
router.put('/:vaccinationId', authMiddleware, authorize(['DOCTOR', 'NURSE', 'PHARMACIST']), async (req, res) => {
  try {
    const { vaccinationId } = req.params;
    const updateData = req.body;

    if (!updateData.reason) {
      return res.status(400).json({
        error: 'Missing required field: reason (for amendment)',
      });
    }

    const amendment = await VaccinationService.updateVaccination(vaccinationId, updateData, {
      _id: req.user.id,
      role: req.user.role,
      facilityId: req.user.facilityId,
    });

    res.json({
      success: true,
      data: amendment,
      message: 'Vaccination record amended successfully',
    });
  } catch (error) {
    res.status(error.message.includes('not found') ? 404 : error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

/**
 * PATCH /api/vaccinations/:vaccinationId/flag-sensitive
 * Mark vaccination as sensitive
 * Body: { isSensitive: boolean }
 */
router.patch('/:vaccinationId/flag-sensitive', authMiddleware, authorize(['SYSTEM_ADMIN', 'HOSPITAL_ADMIN']), async (req, res) => {
  try {
    const { vaccinationId } = req.params;
    const { isSensitive } = req.body;

    const vaccination = await VaccinationService.setSensitiveFlag(vaccinationId, isSensitive, {
      _id: req.user.id,
      role: req.user.role,
    });

    res.json({
      success: true,
      data: vaccination,
      message: `Vaccination flagged as ${isSensitive ? 'sensitive' : 'not sensitive'}`,
    });
  } catch (error) {
    res.status(error.message.includes('Not authorized') ? 403 : 400).json({
      error: error.message,
    });
  }
});

export default router;
