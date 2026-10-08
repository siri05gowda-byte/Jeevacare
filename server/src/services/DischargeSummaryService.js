import DischargeSummary from '../models/DischargeSummary.js';
import Patient from '../models/Patient.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import AuditService from './AuditService.js';

class DischargeSummaryService {
  /**
   * Create a discharge summary record
   * @param {Object} dischargeData
   * @param {Object} requestingUser
   * @returns {Object} Discharge summary record
   */
  static async createDischargeSummary(dischargeData, requestingUser) {
    try {
      // Only healthcare professionals can create official records
      if (!['DOCTOR', 'NURSE'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can create discharge summary records');
      }

      // Get patient
      const patient = await Patient.findById(dischargeData.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${dischargeData.patientId}`);
      }

      // Verify authorization
      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        dischargeData.hospitalId,
        patient._id
      );

      if (!authorized) {
        throw new Error('Not authorized to create discharge summary records at this facility');
      }

      // Calculate length of stay
      const admission = new Date(dischargeData.admissionDate);
      const discharge = new Date(dischargeData.dischargeDate);
      const lengthOfStay = Math.floor((discharge - admission) / (1000 * 60 * 60 * 24));

      // Create discharge summary record
      const dischargeSummary = new DischargeSummary({
        patientId: patient._id,
        encounterId: dischargeData.encounterId,
        admissionDate: admission,
        dischargeDate: discharge,
        lengthOfStay: lengthOfStay,
        primaryDiagnosis: dischargeData.primaryDiagnosis,
        primaryDiagnosisCode: dischargeData.primaryDiagnosisCode,
        secondaryDiagnoses: dischargeData.secondaryDiagnoses || [],
        secondaryDiagnosisCodes: dischargeData.secondaryDiagnosisCodes || [],
        procedures: dischargeData.procedures || [],
        surgeriesPerformed: dischargeData.surgeriesPerformed || [],
        complications: dischargeData.complications || [],
        medications: dischargeData.medications || [],
        dischargeInstructions: dischargeData.dischargeInstructions,
        dietaryRecommendations: dischargeData.dietaryRecommendations,
        activityRestrictions: dischargeData.activityRestrictions,
        followUpRequired: dischargeData.followUpRequired || false,
        followUpSpecialty: dischargeData.followUpSpecialty,
        followUpSchedule: dischargeData.followUpSchedule,
        referralToSpecialist: dischargeData.referralToSpecialist,
        facilityId: dischargeData.hospitalId,
        providerId: requestingUser._id,
        dischargeProviderId: dischargeData.dischargeProviderId || requestingUser._id,
        dischargeVitals: dischargeData.dischargeVitals,
        dischargeDisposition: dischargeData.dischargeDisposition || 'home',
        verificationStatus: 'provider_verified',
        createdBy: requestingUser._id,
      });

      await dischargeSummary.save();

      // Audit event
      await AuditService.logEvent({
        action: 'discharge_summary_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: dischargeSummary._id,
        resourceType: 'discharge_summary',
        patient: patient._id,
        hospital: dischargeData.hospitalId,
        status: 'success',
        details: {
          primaryDiagnosis: dischargeData.primaryDiagnosis,
          lengthOfStay: lengthOfStay,
          verificationStatus: 'provider_verified',
        },
      });

      return dischargeSummary;
    } catch (error) {
      throw new Error(`Failed to create discharge summary: ${error.message}`);
    }
  }

  /**
   * Get a discharge summary record
   * @param {String} dischargeSummaryId
   * @param {Object} requestingUser
   * @returns {Object} Discharge summary record
   */
  static async getDischargeSummary(dischargeSummaryId, requestingUser) {
    try {
      const dischargeSummary = await DischargeSummary.findById(dischargeSummaryId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('dischargeProviderId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .populate('linkedDocument');

      if (!dischargeSummary) {
        throw new Error(`Discharge summary not found: ${dischargeSummaryId}`);
      }

      const patient = await Patient.findById(dischargeSummary.patientId);

      // Authorization: patient can view their own, professional can view if authorized
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own discharge summaries');
        }
      } else if (requestingUser.role !== 'SYSTEM_ADMIN' && requestingUser.role !== 'HOSPITAL_ADMIN') {
        const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          dischargeSummary.facilityId,
          patient._id
        );
        if (!authorized) {
          throw new Error('Not authorized to view this discharge summary');
        }
      }

      // Log access
      await AuditService.logEvent({
        action: 'discharge_summary_accessed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: dischargeSummary._id,
        resourceType: 'discharge_summary',
        patient: patient._id,
        hospital: dischargeSummary.facilityId,
        status: 'success',
      });

      return dischargeSummary;
    } catch (error) {
      throw new Error(`Failed to get discharge summary: ${error.message}`);
    }
  }

  /**
   * Get patient discharge summaries
   * @param {String} patientId
   * @param {Object} requestingUser
   * @param {Object} filters - optional filters
   * @returns {Array} Discharge summary records
   */
  static async getPatientDischargeSummaries(patientId, requestingUser, filters = {}) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Authorization
      if (requestingUser.role === 'PATIENT' && requestingUser._id.toString() !== patient.userId.toString()) {
        throw new Error('Patients can only view their own discharge summaries');
      }

      // For healthcare professionals, check authorization
      if (requestingUser.role !== 'PATIENT' && requestingUser.role !== 'SYSTEM_ADMIN' && requestingUser.role !== 'HOSPITAL_ADMIN') {
        if (requestingUser.facilityId) {
          const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
            requestingUser._id,
            requestingUser.facilityId,
            patientId
          );
          if (!authorized) {
            throw new Error('Not authorized to view patient discharge summaries');
          }
        }
      }

      const query = { patientId };

      if (filters.dischargeDisposition) {
        query.dischargeDisposition = filters.dischargeDisposition;
      }

      if (filters.followUpRequired !== undefined) {
        query.followUpRequired = filters.followUpRequired;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.dischargeDate = {};
        if (filters.dateFrom) {
          query.dischargeDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.dischargeDate.$lte = new Date(filters.dateTo);
        }
      }

      const summaries = await DischargeSummary.find(query)
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('dischargeProviderId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .sort({ dischargeDate: -1 });

      return summaries;
    } catch (error) {
      throw new Error(`Failed to get patient discharge summaries: ${error.message}`);
    }
  }

  /**
   * Update discharge summary record (amendment workflow)
   * @param {String} dischargeSummaryId
   * @param {Object} updateData
   * @param {Object} requestingUser
   * @returns {Object} New amended discharge summary record
   */
  static async updateDischargeSummary(dischargeSummaryId, updateData, requestingUser) {
    try {
      const originalSummary = await DischargeSummary.findById(dischargeSummaryId);
      if (!originalSummary) {
        throw new Error(`Discharge summary not found: ${dischargeSummaryId}`);
      }

      // Authorization: only healthcare professionals at authorized facility
      if (!['DOCTOR', 'NURSE'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can update discharge summaries');
      }

      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        originalSummary.facilityId,
        originalSummary.patientId
      );

      if (!authorized) {
        throw new Error('Not authorized to update discharge summaries at this facility');
      }

      // Calculate new length of stay if dates changed
      const admissionDate = updateData.admissionDate
        ? new Date(updateData.admissionDate)
        : originalSummary.admissionDate;
      const dischargeDate = updateData.dischargeDate
        ? new Date(updateData.dischargeDate)
        : originalSummary.dischargeDate;
      const lengthOfStay = Math.floor((dischargeDate - admissionDate) / (1000 * 60 * 60 * 24));

      // Create amendment record
      const amendedSummary = new DischargeSummary({
        patientId: originalSummary.patientId,
        encounterId: originalSummary.encounterId,
        admissionDate: admissionDate,
        dischargeDate: dischargeDate,
        lengthOfStay: lengthOfStay,
        primaryDiagnosis: updateData.primaryDiagnosis || originalSummary.primaryDiagnosis,
        primaryDiagnosisCode: updateData.primaryDiagnosisCode || originalSummary.primaryDiagnosisCode,
        secondaryDiagnoses: updateData.secondaryDiagnoses || originalSummary.secondaryDiagnoses,
        secondaryDiagnosisCodes: updateData.secondaryDiagnosisCodes || originalSummary.secondaryDiagnosisCodes,
        procedures: updateData.procedures || originalSummary.procedures,
        surgeriesPerformed: updateData.surgeriesPerformed || originalSummary.surgeriesPerformed,
        complications: updateData.complications || originalSummary.complications,
        medications: updateData.medications || originalSummary.medications,
        dischargeInstructions: updateData.dischargeInstructions || originalSummary.dischargeInstructions,
        dietaryRecommendations: updateData.dietaryRecommendations || originalSummary.dietaryRecommendations,
        activityRestrictions: updateData.activityRestrictions || originalSummary.activityRestrictions,
        followUpRequired: updateData.followUpRequired !== undefined ? updateData.followUpRequired : originalSummary.followUpRequired,
        followUpSpecialty: updateData.followUpSpecialty || originalSummary.followUpSpecialty,
        followUpSchedule: updateData.followUpSchedule || originalSummary.followUpSchedule,
        facilityId: originalSummary.facilityId,
        providerId: requestingUser._id,
        dischargeProviderId: updateData.dischargeProviderId || originalSummary.dischargeProviderId,
        dischargeVitals: updateData.dischargeVitals || originalSummary.dischargeVitals,
        dischargeDisposition: updateData.dischargeDisposition || originalSummary.dischargeDisposition,
        verificationStatus: 'amended',
        createdBy: requestingUser._id,
        amendmentHistory: [
          {
            originalDischargeSummaryId: originalSummary._id,
            amendedAt: new Date(),
            amendedBy: requestingUser._id,
            reason: updateData.reason || 'Summary corrected',
            previousData: {
              primaryDiagnosis: originalSummary.primaryDiagnosis,
              dischargeInstructions: originalSummary.dischargeInstructions,
              medications: originalSummary.medications,
            },
          },
        ],
      });

      await amendedSummary.save();

      // Audit event
      await AuditService.logEvent({
        action: 'discharge_summary_amended',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: amendedSummary._id,
        resourceType: 'discharge_summary',
        patient: originalSummary.patientId,
        hospital: originalSummary.facilityId,
        status: 'success',
        details: {
          originalRecordId: originalSummary._id,
          reason: updateData.reason,
          lengthOfStay: lengthOfStay,
        },
      });

      return amendedSummary;
    } catch (error) {
      throw new Error(`Failed to update discharge summary: ${error.message}`);
    }
  }

  /**
   * Mark discharge summary as sensitive
   * @param {String} dischargeSummaryId
   * @param {Boolean} isSensitive
   * @param {Object} requestingUser
   * @returns {Object} Updated discharge summary
   */
  static async setSensitiveFlag(dischargeSummaryId, isSensitive, requestingUser) {
    try {
      if (!['SYSTEM_ADMIN', 'HOSPITAL_ADMIN'].includes(requestingUser.role)) {
        throw new Error('Only administrators can set sensitive flags');
      }

      const dischargeSummary = await DischargeSummary.findByIdAndUpdate(
        dischargeSummaryId,
        { flaggedAsSensitive: isSensitive },
        { new: true }
      );

      if (!dischargeSummary) {
        throw new Error(`Discharge summary not found: ${dischargeSummaryId}`);
      }

      // Audit event
      await AuditService.logEvent({
        action: 'discharge_summary_flagged',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: dischargeSummary._id,
        resourceType: 'discharge_summary',
        patient: dischargeSummary.patientId,
        hospital: dischargeSummary.facilityId,
        status: 'success',
        details: { flaggedAsSensitive: isSensitive },
      });

      return dischargeSummary;
    } catch (error) {
      throw new Error(`Failed to set sensitive flag: ${error.message}`);
    }
  }
}

export default DischargeSummaryService;
