import Encounter from '../models/Encounter.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import AppointmentToken from '../models/AppointmentToken.js';
import AuditService from './AuditService.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';

/**
 * EncounterService
 * Manages clinical encounters with appointment continuity
 * 
 * Ensures:
 * - Appointments link to encounters
 * - Patient/provider/facility continuity
 * - Authorization at each step
 * - Full audit trail
 */
class EncounterService {
  /**
   * Create clinical encounter from appointment
   * @param {Object} encounterData - {appointmentId, encounterType, chiefComplaint, clinicalNotes, vitals}
   * @param {Object} requestingUser
   * @returns {Object} Created encounter
   */
  static async createEncounter(encounterData, requestingUser) {
    try {
      // Only doctors/healthcare professionals can create encounters
      if (!['DOCTOR', 'NURSE'].includes(requestingUser.role)) {
        throw new Error('Only healthcare professionals can create encounters');
      }

      // Get appointment
      const appointment = await Appointment.findById(
        encounterData.appointmentId
      );
      if (!appointment) {
        throw new Error(`Appointment not found: ${encounterData.appointmentId}`);
      }

      const patient = await Patient.findById(appointment.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${appointment.patientId}`);
      }

      // Verify provider authorization
      const { authorized } =
        await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          appointment.hospitalId,
          patient._id
        );

      if (!authorized) {
        throw new Error(
          'Not authorized to create clinical records at this facility'
        );
      }

      // Create encounter
      const encounter = new Encounter({
        patientId: patient._id,
        hospitalId: appointment.hospitalId,
        providerId: requestingUser._id,
        appointmentId: appointment._id,
        encounterDate: new Date(),
        encounterType: encounterData.encounterType || 'consultation',
        reasonForVisit: appointment.reasonForVisit,
        chiefComplaint: encounterData.chiefComplaint,
        clinicalNotes: encounterData.clinicalNotes,
        vitals: encounterData.vitals,
        status: 'in_progress',
      });

      await encounter.save();

      // Link appointment to encounter
      appointment.encounterId = encounter._id;
      appointment.status = 'in_progress';
      await appointment.save();

      // Audit event
      await AuditService.logEvent({
        action: 'encounter_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: encounter._id,
        resourceType: 'encounter',
        patient: patient._id,
        hospital: appointment.hospitalId,
        status: 'success',
        details: {
          appointmentId: appointment._id,
          encounterType: encounterData.encounterType,
        },
      });

      return encounter;
    } catch (error) {
      throw new Error(`Failed to create encounter: ${error.message}`);
    }
  }

  /**
   * Update encounter with clinical findings
   * @param {String} encounterId
   * @param {Object} updateData - {assessments, plan, followUpInstructions, vitals}
   * @param {Object} requestingUser
   * @returns {Object} Updated encounter
   */
  static async updateEncounter(encounterId, updateData, requestingUser) {
    try {
      const encounter = await Encounter.findById(encounterId);
      if (!encounter) {
        throw new Error(`Encounter not found: ${encounterId}`);
      }

      // Only the creating provider can update
      if (encounter.providerId.toString() !== requestingUser._id.toString()) {
        throw new Error('Only the creating provider can update the encounter');
      }

      // Update fields
      if (updateData.assessments) {
        encounter.assessments = updateData.assessments;
      }
      if (updateData.plan) {
        encounter.plan = updateData.plan;
      }
      if (updateData.followUpInstructions) {
        encounter.followUpInstructions = updateData.followUpInstructions;
      }
      if (updateData.vitals) {
        encounter.vitals = { ...encounter.vitals, ...updateData.vitals };
      }
      if (updateData.physicalExamination) {
        encounter.physicalExamination = updateData.physicalExamination;
      }

      await encounter.save();

      // Audit event
      await AuditService.logEvent({
        action: 'encounter_updated',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: encounter._id,
        resourceType: 'encounter',
        patient: encounter.patientId,
        hospital: encounter.hospitalId,
        status: 'success',
      });

      return encounter;
    } catch (error) {
      throw new Error(`Failed to update encounter: ${error.message}`);
    }
  }

  /**
   * Complete encounter (creates discharge summary if needed)
   * @param {String} encounterId
   * @param {Object} completionData - {dischargeInformation, costsAndBilling, notes}
   * @param {Object} requestingUser
   * @returns {Object} Completed encounter
   */
  static async completeEncounter(
    encounterId,
    completionData,
    requestingUser
  ) {
    try {
      const encounter = await Encounter.findById(encounterId);
      if (!encounter) {
        throw new Error(`Encounter not found: ${encounterId}`);
      }

      if (encounter.status !== 'in_progress') {
        throw new Error(
          `Can only complete 'in_progress' encounters. Current status: ${encounter.status}`
        );
      }

      // Add discharge information
      if (completionData.dischargeInformation) {
        encounter.dischargeInformation = completionData.dischargeInformation;
      }

      if (completionData.costsAndBilling) {
        encounter.costsAndBilling = completionData.costsAndBilling;
      }

      encounter.status = 'completed';
      await encounter.save();

      // Update appointment to completed
      if (encounter.appointmentId) {
        const appointment = await Appointment.findById(encounter.appointmentId);
        if (appointment) {
          appointment.status = 'completed';
          appointment.completedAt = new Date();
          await appointment.save();
        }
      }

      // Audit event
      await AuditService.logEvent({
        action: 'encounter_completed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: encounter._id,
        resourceType: 'encounter',
        patient: encounter.patientId,
        hospital: encounter.hospitalId,
        status: 'success',
        details: {
          dischargeInformation: completionData.dischargeInformation
            ? 'provided'
            : 'not_provided',
        },
      });

      return encounter;
    } catch (error) {
      throw new Error(`Failed to complete encounter: ${error.message}`);
    }
  }

  /**
   * Get encounter details
   * @param {String} encounterId
   * @param {Object} requestingUser
   * @returns {Object} Encounter with full details
   */
  static async getEncounterDetails(encounterId, requestingUser) {
    try {
      const encounter = await Encounter.findById(encounterId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('hospitalId', 'name facilityId')
        .populate('appointmentId');

      if (!encounter) {
        throw new Error(`Encounter not found: ${encounterId}`);
      }

      const patient = await Patient.findById(encounter.patientId);

      // Authorization check
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own encounters');
        }
      } else if (requestingUser.role === 'DOCTOR') {
        const { authorized } =
          await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
            requestingUser._id,
            encounter.hospitalId,
            patient._id
          );
        if (!authorized) {
          throw new Error('Not authorized to view this encounter');
        }
      }

      return encounter;
    } catch (error) {
      throw new Error(
        `Failed to get encounter details: ${error.message}`
      );
    }
  }

  /**
   * Get patient encounters (for patient timeline)
   * @param {String} patientId
   * @param {Object} requestingUser
   * @param {Object} filters - {dateFrom, dateTo, hospitalId}
   * @returns {Array} Encounters
   */
  static async getPatientEncounters(patientId, requestingUser, filters = {}) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Patient can only view their own encounters
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patients can only view their own encounters');
      }

      const query = { patientId };

      if (filters.dateFrom || filters.dateTo) {
        query.encounterDate = {};
        if (filters.dateFrom) {
          query.encounterDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.encounterDate.$lte = new Date(filters.dateTo);
        }
      }

      if (filters.hospitalId) {
        query.hospitalId = filters.hospitalId;
      }

      const encounters = await Encounter.find(query)
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('hospitalId', 'name facilityId')
        .sort({ encounterDate: -1 });

      return encounters;
    } catch (error) {
      throw new Error(`Failed to get patient encounters: ${error.message}`);
    }
  }

  /**
   * Get encounter by appointment ID
   * @param {String} appointmentId
   * @returns {Object|null} Encounter or null
   */
  static async getEncounterByAppointment(appointmentId) {
    try {
      const encounter = await Encounter.findOne({ appointmentId })
        .populate('patientId')
        .populate('providerId')
        .populate('hospitalId');

      return encounter;
    } catch (error) {
      throw new Error(
        `Failed to get encounter by appointment: ${error.message}`
      );
    }
  }
}

export default EncounterService;
