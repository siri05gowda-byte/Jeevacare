import ClinicalRecord from '../models/ClinicalRecord.js';
import CorrectionRequest from '../models/CorrectionRequest.js';
import Patient from '../models/Patient.js';
import Encounter from '../models/Encounter.js';
import AuditService from './AuditService.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';

/**
 * ClinicalRecordService
 * Manages clinical record creation, verification, and amendment workflow
 * 
 * Core principles:
 * - Provider-verified records are immutable (use amendments instead)
 * - Patient can view but cannot directly edit official records
 * - All changes are traceable
 * - Correction workflow is formal and audited
 */
class ClinicalRecordService {
  /**
   * Create clinical record (provider-verified)
   * @param {Object} recordData - {recordType, recordDate, encounterId, providerId, hospitalId, data}
   * @param {Object} requestingUser
   * @returns {Object} Created clinical record
   */
  static async createClinicalRecord(recordData, requestingUser) {
    try {
      // Only doctors can create official records
      if (!['DOCTOR', 'NURSE'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can create clinical records');
      }

      // Get encounter if provided
      let encounter = null;
      let patient = null;

      if (recordData.encounterId) {
        encounter = await Encounter.findById(recordData.encounterId);
        if (!encounter) {
          throw new Error(`Encounter not found: ${recordData.encounterId}`);
        }
        patient = await Patient.findById(encounter.patientId);
      } else {
        patient = await Patient.findById(recordData.patientId);
      }

      if (!patient) {
        throw new Error('Patient information required');
      }

      // Verify authorization
      const { authorized } =
        await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          recordData.hospitalId,
          patient._id
        );

      if (!authorized) {
        throw new Error(
          'Not authorized to create clinical records at this facility'
        );
      }

      // Create record
      const clinicalRecord = new ClinicalRecord({
        patientId: patient._id,
        encounterId: recordData.encounterId,
        recordType: recordData.recordType,
        recordDate: new Date(recordData.recordDate),
        providerId: requestingUser._id,
        hospitalId: recordData.hospitalId,
        data: recordData.data,
        verificationStatus: 'provider_verified',
        createdBy: requestingUser._id,
        providerVerification: {
          professionalId: recordData.professionalId,
          facilityId: recordData.hospitalId,
          createdAt: new Date(),
          createdByUserId: requestingUser._id,
          authorizationVerifiedAt: new Date(),
          authorizationDetails: {
            allChecksPassed: true,
          },
        },
      });

      await clinicalRecord.save();

      // Audit event
      await AuditService.logEvent({
        action: 'clinical_record_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: clinicalRecord._id,
        resourceType: 'clinical_record',
        patient: patient._id,
        hospital: recordData.hospitalId,
        status: 'success',
        details: {
          recordType: recordData.recordType,
          verificationStatus: 'provider_verified',
        },
      });

      return clinicalRecord;
    } catch (error) {
      throw new Error(`Failed to create clinical record: ${error.message}`);
    }
  }

  /**
   * Request correction to a clinical record
   * @param {String} clinicalRecordId
   * @param {Object} correctionData - {reason, requestReason, suggestedCorrection, supportingDocuments}
   * @param {Object} requestingUser
   * @returns {Object} CorrectionRequest
   */
  static async requestCorrection(
    clinicalRecordId,
    correctionData,
    requestingUser
  ) {
    try {
      const clinicalRecord = await ClinicalRecord.findById(clinicalRecordId);
      if (!clinicalRecord) {
        throw new Error(`Clinical record not found: ${clinicalRecordId}`);
      }

      const patient = await Patient.findById(clinicalRecord.patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Only patient or authorized provider can request correction
      if (requestingUser.role === 'PATIENT') {
        if (
          requestingUser._id.toString() !== patient.userId.toString()
        ) {
          throw new Error('Patient can only request corrections for their own records');
        }
      } else if (!['DOCTOR', 'HOSPITAL_ADMIN'].includes(requestingUser.role)) {
        throw new Error('Not authorized to request record correction');
      }

      // Create correction request
      const correctionRequest = new CorrectionRequest({
        clinicalRecordId,
        patientId: patient._id,
        recordType: clinicalRecord.recordType,
        recordDate: clinicalRecord.recordDate,
        facilityId: clinicalRecord.hospitalId,
        providerId: clinicalRecord.providerId,
        reason: correctionData.reason,
        requestReason: correctionData.requestReason,
        suggestedCorrection: correctionData.suggestedCorrection,
        supportingDocuments: correctionData.supportingDocuments || [],
        status: 'pending',
        createdBy: requestingUser._id,
      });

      await correctionRequest.save();

      // Mark record as having correction requested
      clinicalRecord.correctionRequested = true;
      clinicalRecord.correctionRequest = {
        requestId: correctionRequest._id,
        requestedAt: new Date(),
        requestedBy: requestingUser._id,
        reason: correctionData.reason,
        status: 'pending',
      };
      await clinicalRecord.save();

      // Audit event
      await AuditService.logEvent({
        action: 'correction_requested',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: correctionRequest._id,
        resourceType: 'correction_request',
        patient: patient._id,
        hospital: clinicalRecord.hospitalId,
        status: 'success',
        details: {
          clinicalRecordId,
          reason: correctionData.reason,
        },
      });

      return correctionRequest;
    } catch (error) {
      throw new Error(
        `Failed to request correction: ${error.message}`
      );
    }
  }

  /**
   * Accept correction and create amendment
   * @param {String} correctionRequestId
   * @param {String} reviewNotes
   * @param {Object} requestingUser
   * @returns {Object} Amended clinical record
   */
  static async acceptCorrection(
    correctionRequestId,
    reviewNotes,
    requestingUser
  ) {
    try {
      const correctionRequest = await CorrectionRequest.findById(
        correctionRequestId
      );
      if (!correctionRequest) {
        throw new Error(`Correction request not found: ${correctionRequestId}`);
      }

      if (correctionRequest.status !== 'pending') {
        throw new Error(
          `Correction must be in 'pending' status. Current status: ${correctionRequest.status}`
        );
      }

      // Get original clinical record
      const originalRecord = await ClinicalRecord.findById(
        correctionRequest.clinicalRecordId
      );
      if (!originalRecord) {
        throw new Error('Original clinical record not found');
      }

      // Create amended record
      const amendedRecord = new ClinicalRecord({
        patientId: originalRecord.patientId,
        recordType: originalRecord.recordType,
        recordDate: originalRecord.recordDate,
        providerId: requestingUser._id,
        hospitalId: originalRecord.hospitalId,
        verificationStatus: 'amended',
        data: originalRecord.data, // Copy original data (will be replaced)
        createdBy: requestingUser._id,
        amendmentHistory: [
          {
            originalRecordId: originalRecord._id,
            amendedAt: new Date(),
            amendedBy: requestingUser._id,
            reason: correctionRequest.reason,
            previousData: originalRecord.data,
          },
        ],
      });

      // Update with suggested correction
      if (correctionRequest.suggestedCorrection) {
        amendedRecord.data = {
          ...amendedRecord.data,
          ...JSON.parse(correctionRequest.suggestedCorrection),
        };
      }

      await amendedRecord.save();

      // Update correction request
      correctionRequest.status = 'amendment_created';
      correctionRequest.amendmentRecordId = amendedRecord._id;
      correctionRequest.reviewedBy = requestingUser._id;
      correctionRequest.reviewedAt = new Date();
      correctionRequest.reviewNotes = reviewNotes;
      await correctionRequest.save();

      // Update original record
      originalRecord.correctionRequest.status = 'amendment_created';
      await originalRecord.save();

      // Audit event
      await AuditService.logEvent({
        action: 'correction_accepted_amendment_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: amendedRecord._id,
        resourceType: 'clinical_record',
        patient: originalRecord.patientId,
        hospital: originalRecord.hospitalId,
        status: 'success',
        details: {
          originalRecordId: originalRecord._id,
          correctionRequestId: correctionRequest._id,
          reason: correctionRequest.reason,
        },
      });

      return amendedRecord;
    } catch (error) {
      throw new Error(
        `Failed to accept correction: ${error.message}`
      );
    }
  }

  /**
   * Reject correction request
   * @param {String} correctionRequestId
   * @param {String} rejectionReason
   * @param {Object} requestingUser
   * @returns {Object} Updated correction request
   */
  static async rejectCorrection(
    correctionRequestId,
    rejectionReason,
    requestingUser
  ) {
    try {
      const correctionRequest = await CorrectionRequest.findById(
        correctionRequestId
      );
      if (!correctionRequest) {
        throw new Error(`Correction request not found: ${correctionRequestId}`);
      }

      correctionRequest.status = 'rejected';
      correctionRequest.rejectionReason = rejectionReason;
      correctionRequest.rejectedBy = requestingUser._id;
      correctionRequest.rejectedAt = new Date();
      await correctionRequest.save();

      // Audit event
      await AuditService.logEvent({
        action: 'correction_rejected',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: correctionRequest._id,
        resourceType: 'correction_request',
        patient: correctionRequest.patientId,
        hospital: correctionRequest.facilityId,
        status: 'success',
        details: {
          rejectionReason,
        },
      });

      return correctionRequest;
    } catch (error) {
      throw new Error(
        `Failed to reject correction: ${error.message}`
      );
    }
  }

  /**
   * Get clinical record (with authorization)
   * @param {String} recordId
   * @param {Object} requestingUser
   * @returns {Object} Clinical record
   */
  static async getClinicalRecord(recordId, requestingUser) {
    try {
      const record = await ClinicalRecord.findById(recordId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('hospitalId', 'name facilityId');

      if (!record) {
        throw new Error(`Clinical record not found: ${recordId}`);
      }

      const patient = await Patient.findById(record.patientId);

      // Authorization: patient can view their own, doctor can view if authorized
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own records');
        }
      } else if (requestingUser.role === 'DOCTOR') {
        const { authorized } =
          await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
            requestingUser._id,
            record.hospitalId,
            patient._id
          );
        if (!authorized) {
          throw new Error('Not authorized to view this record');
        }
      }

      // Log access
      await AuditService.logEvent({
        action: 'clinical_record_accessed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: record._id,
        resourceType: 'clinical_record',
        patient: patient._id,
        hospital: record.hospitalId,
        status: 'success',
      });

      return record;
    } catch (error) {
      throw new Error(`Failed to get clinical record: ${error.message}`);
    }
  }

  /**
   * Get patient clinical records
   * @param {String} patientId
   * @param {Object} requestingUser
   * @param {Object} filters - {recordType, dateFrom, dateTo, verificationStatus}
   * @returns {Array} Clinical records
   */
  static async getPatientRecords(patientId, requestingUser, filters = {}) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Authorization
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patients can only view their own records');
      }

      const query = { patientId };

      if (filters.recordType) {
        query.recordType = filters.recordType;
      }

      if (filters.verificationStatus) {
        query.verificationStatus = filters.verificationStatus;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.recordDate = {};
        if (filters.dateFrom) {
          query.recordDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.recordDate.$lte = new Date(filters.dateTo);
        }
      }

      const records = await ClinicalRecord.find(query)
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('hospitalId', 'name facilityId')
        .sort({ recordDate: -1 });

      return records;
    } catch (error) {
      throw new Error(`Failed to get patient records: ${error.message}`);
    }
  }
}

export default ClinicalRecordService;
