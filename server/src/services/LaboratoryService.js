import LaboratoryResult from '../models/LaboratoryResult.js';
import Patient from '../models/Patient.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import AuditService from './AuditService.js';

class LaboratoryService {
  /**
   * Create a laboratory result record
   * @param {Object} labData
   * @param {Object} requestingUser
   * @returns {Object} Laboratory result record
   */
  static async createLaboratoryResult(labData, requestingUser) {
    try {
      // Only healthcare professionals can create official records
      if (!['DOCTOR', 'NURSE', 'LAB_TECHNICIAN'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can create laboratory result records');
      }

      // Get patient
      const patient = await Patient.findById(labData.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${labData.patientId}`);
      }

      // Verify authorization
      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        labData.hospitalId,
        patient._id
      );

      if (!authorized) {
        throw new Error('Not authorized to create laboratory results at this facility');
      }

      // Create laboratory result record
      const labResult = new LaboratoryResult({
        patientId: patient._id,
        encounterId: labData.encounterId,
        labName: labData.labName,
        labTestName: labData.labTestName,
        labTestCode: labData.labTestCode,
        sampleCollectionDate: new Date(labData.sampleCollectionDate),
        resultReceivedDate: new Date(labData.resultReceivedDate),
        results: labData.results || [],
        interpretation: labData.interpretation,
        facilityId: labData.hospitalId,
        providerId: requestingUser._id,
        labProviderId: labData.labProviderId,
        verificationStatus: 'provider_verified',
        createdBy: requestingUser._id,
      });

      // Check if any results are abnormal
      if (labResult.results.some(r => r.isAbnormal)) {
        labResult.isCritical = true;
      }

      await labResult.save();

      // Audit event
      await AuditService.logEvent({
        action: 'laboratory_result_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: labResult._id,
        resourceType: 'laboratory_result',
        patient: patient._id,
        hospital: labData.hospitalId,
        status: 'success',
        details: {
          labTestName: labData.labTestName,
          isCritical: labResult.isCritical,
          verificationStatus: 'provider_verified',
        },
      });

      return labResult;
    } catch (error) {
      throw new Error(`Failed to create laboratory result: ${error.message}`);
    }
  }

  /**
   * Get a laboratory result record
   * @param {String} labResultId
   * @param {Object} requestingUser
   * @returns {Object} Laboratory result record
   */
  static async getLaboratoryResult(labResultId, requestingUser) {
    try {
      const labResult = await LaboratoryResult.findById(labResultId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .populate('linkedDocument');

      if (!labResult) {
        throw new Error(`Laboratory result not found: ${labResultId}`);
      }

      const patient = await Patient.findById(labResult.patientId);

      // Authorization: patient can view their own, professional can view if authorized
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own laboratory results');
        }
      } else if (requestingUser.role !== 'SYSTEM_ADMIN' && requestingUser.role !== 'HOSPITAL_ADMIN') {
        const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          labResult.facilityId,
          patient._id
        );
        if (!authorized) {
          throw new Error('Not authorized to view this laboratory result');
        }
      }

      // Log access
      await AuditService.logEvent({
        action: 'laboratory_result_accessed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: labResult._id,
        resourceType: 'laboratory_result',
        patient: patient._id,
        hospital: labResult.facilityId,
        status: 'success',
      });

      return labResult;
    } catch (error) {
      throw new Error(`Failed to get laboratory result: ${error.message}`);
    }
  }

  /**
   * Get patient laboratory results
   * @param {String} patientId
   * @param {Object} requestingUser
   * @param {Object} filters - optional filters
   * @returns {Array} Laboratory result records
   */
  static async getPatientLaboratoryResults(patientId, requestingUser, filters = {}) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Authorization
      if (requestingUser.role === 'PATIENT' && requestingUser._id.toString() !== patient.userId.toString()) {
        throw new Error('Patients can only view their own laboratory results');
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
            throw new Error('Not authorized to view patient laboratory results');
          }
        }
      }

      const query = { patientId };

      if (filters.labTestName) {
        query.labTestName = new RegExp(filters.labTestName, 'i');
      }

      if (filters.isCritical !== undefined) {
        query.isCritical = filters.isCritical;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.sampleCollectionDate = {};
        if (filters.dateFrom) {
          query.sampleCollectionDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.sampleCollectionDate.$lte = new Date(filters.dateTo);
        }
      }

      const results = await LaboratoryResult.find(query)
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .sort({ sampleCollectionDate: -1 });

      return results;
    } catch (error) {
      throw new Error(`Failed to get patient laboratory results: ${error.message}`);
    }
  }

  /**
   * Update laboratory result record (amendment workflow)
   * @param {String} labResultId
   * @param {Object} updateData
   * @param {Object} requestingUser
   * @returns {Object} New amended laboratory result record
   */
  static async updateLaboratoryResult(labResultId, updateData, requestingUser) {
    try {
      const originalResult = await LaboratoryResult.findById(labResultId);
      if (!originalResult) {
        throw new Error(`Laboratory result not found: ${labResultId}`);
      }

      // Authorization: only healthcare professionals at authorized facility
      if (!['DOCTOR', 'NURSE', 'LAB_TECHNICIAN'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can update laboratory results');
      }

      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        originalResult.facilityId,
        originalResult.patientId
      );

      if (!authorized) {
        throw new Error('Not authorized to update laboratory results at this facility');
      }

      // Create amendment record
      const amendedResult = new LaboratoryResult({
        patientId: originalResult.patientId,
        encounterId: originalResult.encounterId,
        labName: updateData.labName || originalResult.labName,
        labTestName: updateData.labTestName || originalResult.labTestName,
        labTestCode: updateData.labTestCode || originalResult.labTestCode,
        sampleCollectionDate: updateData.sampleCollectionDate
          ? new Date(updateData.sampleCollectionDate)
          : originalResult.sampleCollectionDate,
        resultReceivedDate: updateData.resultReceivedDate
          ? new Date(updateData.resultReceivedDate)
          : originalResult.resultReceivedDate,
        results: updateData.results || originalResult.results,
        interpretation: updateData.interpretation || originalResult.interpretation,
        facilityId: originalResult.facilityId,
        providerId: requestingUser._id,
        labProviderId: updateData.labProviderId || originalResult.labProviderId,
        verificationStatus: 'amended',
        createdBy: requestingUser._id,
        amendmentHistory: [
          {
            originalResultId: originalResult._id,
            amendedAt: new Date(),
            amendedBy: requestingUser._id,
            reason: updateData.reason || 'Result corrected',
            previousData: {
              results: originalResult.results,
              interpretation: originalResult.interpretation,
            },
          },
        ],
      });

      // Check if any results are abnormal
      if (amendedResult.results.some(r => r.isAbnormal)) {
        amendedResult.isCritical = true;
      }

      await amendedResult.save();

      // Audit event
      await AuditService.logEvent({
        action: 'laboratory_result_amended',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: amendedResult._id,
        resourceType: 'laboratory_result',
        patient: originalResult.patientId,
        hospital: originalResult.facilityId,
        status: 'success',
        details: {
          originalRecordId: originalResult._id,
          reason: updateData.reason,
          isCritical: amendedResult.isCritical,
        },
      });

      return amendedResult;
    } catch (error) {
      throw new Error(`Failed to update laboratory result: ${error.message}`);
    }
  }

  /**
   * Flag laboratory result as critical
   * @param {String} labResultId
   * @param {Object} flagData - {findings, flaggedBy}
   * @param {Object} requestingUser
   * @returns {Object} Updated laboratory result
   */
  static async flagAsCritical(labResultId, flagData, requestingUser) {
    try {
      if (!['DOCTOR', 'HOSPITAL_ADMIN'].includes(requestingUser.role)) {
        throw new Error('Only doctors and admins can flag results as critical');
      }

      const labResult = await LaboratoryResult.findByIdAndUpdate(
        labResultId,
        {
          isCritical: true,
          criticalFlag: {
            flaggedAt: new Date(),
            flaggedBy: requestingUser._id,
            reason: flagData.reason,
          },
        },
        { new: true }
      );

      if (!labResult) {
        throw new Error(`Laboratory result not found: ${labResultId}`);
      }

      // Audit event
      await AuditService.logEvent({
        action: 'laboratory_result_flagged_critical',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: labResult._id,
        resourceType: 'laboratory_result',
        patient: labResult.patientId,
        hospital: labResult.facilityId,
        status: 'success',
        details: { reason: flagData.reason },
        sensitivityLevel: 'high',
      });

      return labResult;
    } catch (error) {
      throw new Error(`Failed to flag laboratory result as critical: ${error.message}`);
    }
  }
}

export default LaboratoryService;
