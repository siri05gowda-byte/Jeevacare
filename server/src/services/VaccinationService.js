import Vaccination from '../models/Vaccination.js';
import Patient from '../models/Patient.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import AuditService from './AuditService.js';

class VaccinationService {
  /**
   * Create a vaccination record
   * @param {Object} vaccinationData
   * @param {Object} requestingUser
   * @returns {Object} Vaccination record
   */
  static async createVaccination(vaccinationData, requestingUser) {
    try {
      // Only healthcare professionals can create official records
      if (!['DOCTOR', 'NURSE', 'PHARMACIST'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can create vaccination records');
      }

      // Get patient
      const patient = await Patient.findById(vaccinationData.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${vaccinationData.patientId}`);
      }

      // Verify authorization
      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        vaccinationData.hospitalId,
        patient._id
      );

      if (!authorized) {
        throw new Error('Not authorized to create vaccination records at this facility');
      }

      // Create vaccination record
      const vaccination = new Vaccination({
        patientId: patient._id,
        encounterId: vaccinationData.encounterId,
        vaccineName: vaccinationData.vaccineName,
        dose: vaccinationData.dose,
        administrationDate: new Date(vaccinationData.administrationDate),
        batchNumber: vaccinationData.batchNumber,
        provider: vaccinationData.provider,
        nextScheduledDate: vaccinationData.nextScheduledDate ? new Date(vaccinationData.nextScheduledDate) : null,
        site: vaccinationData.site,
        route: vaccinationData.route || 'intramuscular',
        facilityId: vaccinationData.hospitalId,
        providerId: requestingUser._id,
        verificationStatus: 'provider_verified',
        createdBy: requestingUser._id,
      });

      await vaccination.save();

      // Audit event
      await AuditService.logEvent({
        action: 'vaccination_record_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: vaccination._id,
        resourceType: 'vaccination',
        patient: patient._id,
        hospital: vaccinationData.hospitalId,
        status: 'success',
        details: {
          vaccineName: vaccinationData.vaccineName,
          verificationStatus: 'provider_verified',
        },
      });

      return vaccination;
    } catch (error) {
      throw new Error(`Failed to create vaccination record: ${error.message}`);
    }
  }

  /**
   * Get a vaccination record
   * @param {String} vaccinationId
   * @param {Object} requestingUser
   * @returns {Object} Vaccination record
   */
  static async getVaccination(vaccinationId, requestingUser) {
    try {
      const vaccination = await Vaccination.findById(vaccinationId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId');

      if (!vaccination) {
        throw new Error(`Vaccination record not found: ${vaccinationId}`);
      }

      const patient = await Patient.findById(vaccination.patientId);

      // Authorization: patient can view their own, professional can view if authorized
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own vaccination records');
        }
      } else if (requestingUser.role !== 'SYSTEM_ADMIN' && requestingUser.role !== 'HOSPITAL_ADMIN') {
        const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          vaccination.facilityId,
          patient._id
        );
        if (!authorized) {
          throw new Error('Not authorized to view this vaccination record');
        }
      }

      // Log access
      await AuditService.logEvent({
        action: 'vaccination_record_accessed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: vaccination._id,
        resourceType: 'vaccination',
        patient: patient._id,
        hospital: vaccination.facilityId,
        status: 'success',
      });

      return vaccination;
    } catch (error) {
      throw new Error(`Failed to get vaccination record: ${error.message}`);
    }
  }

  /**
   * Get patient vaccinations
   * @param {String} patientId
   * @param {Object} requestingUser
   * @returns {Array} Vaccination records
   */
  static async getPatientVaccinations(patientId, requestingUser) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Authorization
      if (requestingUser.role === 'PATIENT' && requestingUser._id.toString() !== patient.userId.toString()) {
        throw new Error('Patients can only view their own vaccination records');
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
            throw new Error('Not authorized to view patient vaccination records');
          }
        }
      }

      const vaccinations = await Vaccination.find({ patientId })
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .sort({ administrationDate: -1 });

      return vaccinations;
    } catch (error) {
      throw new Error(`Failed to get patient vaccinations: ${error.message}`);
    }
  }

  /**
   * Update vaccination record (amendment workflow)
   * @param {String} vaccinationId
   * @param {Object} updateData
   * @param {Object} requestingUser
   * @returns {Object} New amended vaccination record
   */
  static async updateVaccination(vaccinationId, updateData, requestingUser) {
    try {
      const originalVaccination = await Vaccination.findById(vaccinationId);
      if (!originalVaccination) {
        throw new Error(`Vaccination record not found: ${vaccinationId}`);
      }

      // Authorization: only healthcare professionals at authorized facility
      if (!['DOCTOR', 'NURSE', 'PHARMACIST'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can update vaccination records');
      }

      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        originalVaccination.facilityId,
        originalVaccination.patientId
      );

      if (!authorized) {
        throw new Error('Not authorized to update vaccination records at this facility');
      }

      // Create amendment record
      const amendedVaccination = new Vaccination({
        patientId: originalVaccination.patientId,
        encounterId: originalVaccination.encounterId,
        vaccineName: updateData.vaccineName || originalVaccination.vaccineName,
        dose: updateData.dose || originalVaccination.dose,
        administrationDate: updateData.administrationDate
          ? new Date(updateData.administrationDate)
          : originalVaccination.administrationDate,
        batchNumber: updateData.batchNumber || originalVaccination.batchNumber,
        provider: updateData.provider || originalVaccination.provider,
        nextScheduledDate: updateData.nextScheduledDate ? new Date(updateData.nextScheduledDate) : null,
        site: updateData.site || originalVaccination.site,
        route: updateData.route || originalVaccination.route,
        facilityId: originalVaccination.facilityId,
        providerId: requestingUser._id,
        verificationStatus: 'amended',
        createdBy: requestingUser._id,
        amendmentHistory: [
          {
            originalVaccinationId: originalVaccination._id,
            amendedAt: new Date(),
            amendedBy: requestingUser._id,
            reason: updateData.reason || 'Record corrected',
            previousData: {
              vaccineName: originalVaccination.vaccineName,
              dose: originalVaccination.dose,
              administrationDate: originalVaccination.administrationDate,
              batchNumber: originalVaccination.batchNumber,
            },
          },
        ],
      });

      await amendedVaccination.save();

      // Audit event
      await AuditService.logEvent({
        action: 'vaccination_record_amended',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: amendedVaccination._id,
        resourceType: 'vaccination',
        patient: originalVaccination.patientId,
        hospital: originalVaccination.facilityId,
        status: 'success',
        details: {
          originalRecordId: originalVaccination._id,
          reason: updateData.reason,
        },
      });

      return amendedVaccination;
    } catch (error) {
      throw new Error(`Failed to update vaccination record: ${error.message}`);
    }
  }

  /**
   * Mark vaccination record as sensitive
   * @param {String} vaccinationId
   * @param {Boolean} isSensitive
   * @param {Object} requestingUser
   * @returns {Object} Updated vaccination record
   */
  static async setSensitiveFlag(vaccinationId, isSensitive, requestingUser) {
    try {
      if (!['SYSTEM_ADMIN', 'HOSPITAL_ADMIN'].includes(requestingUser.role)) {
        throw new Error('Only administrators can set sensitive flags');
      }

      const vaccination = await Vaccination.findByIdAndUpdate(
        vaccinationId,
        { flaggedAsSensitive: isSensitive },
        { new: true }
      );

      if (!vaccination) {
        throw new Error(`Vaccination record not found: ${vaccinationId}`);
      }

      // Audit event
      await AuditService.logEvent({
        action: 'vaccination_record_flagged',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: vaccination._id,
        resourceType: 'vaccination',
        patient: vaccination.patientId,
        hospital: vaccination.facilityId,
        status: 'success',
        details: { flaggedAsSensitive: isSensitive },
      });

      return vaccination;
    } catch (error) {
      throw new Error(`Failed to set sensitive flag: ${error.message}`);
    }
  }
}

export default VaccinationService;
