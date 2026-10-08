import AppointmentToken from '../models/AppointmentToken.js';
import Appointment from '../models/Appointment.js';
import Patient from '../models/Patient.js';
import AuditService from './AuditService.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';

/**
 * CheckInService
 * Manages patient check-in, token assignment, and queue workflow
 * 
 * State flow: CHECKED_IN → TOKEN_ASSIGNED → WAITING → IN_CONSULTATION → COMPLETED
 */
class CheckInService {
  /**
   * Generate unique token number for the day/facility/doctor
   * @param {String} hospitalId
   * @param {String} professionalId
   * @param {Date} appointmentDate
   * @returns {String} Token number
   */
  static async generateTokenNumber(
    hospitalId,
    professionalId,
    appointmentDate
  ) {
    try {
      // Format: FAC-DOC-DATE-SEQUENCE (e.g., FAC001-DOC001-20261007-005)
      const date = new Date(appointmentDate);
      const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');

      // Get count of tokens for this date/facility/doctor
      const startOfDay = new Date(appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const existingTokenCount = await AppointmentToken.countDocuments({
        hospitalId,
        professionalId,
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: { $ne: 'cancelled' },
      });

      const sequence = String(existingTokenCount + 1).padStart(3, '0');
      const token = `${dateStr}-${sequence}`;

      return token;
    } catch (error) {
      throw new Error(`Failed to generate token number: ${error.message}`);
    }
  }

  /**
   * Check in patient for appointment
   * @param {String} appointmentId
   * @param {Object} requestingUser
   * @returns {Object} AppointmentToken record
   */
  static async checkInPatient(appointmentId, requestingUser) {
    try {
      // Get appointment
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      const patient = await Patient.findById(appointment.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${appointment.patientId}`);
      }

      // Patient can only check in themselves
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patient can only check in themselves');
      }

      // Healthcare staff can only check in at their own facility
      if (requestingUser.role !== 'PATIENT') {
        // Non-patient must have a facilityId
        if (!requestingUser.facilityId) {
          throw new Error('Healthcare staff must have an assigned facility');
        }
        // Facility must match appointment's hospital
        if (requestingUser.facilityId.toString() !== appointment.hospitalId.toString()) {
          throw new Error('Not authorized to check in patients at a different facility');
        }
      }

      // Check if appointment is in correct status for check-in
      if (!['scheduled', 'confirmed'].includes(appointment.status)) {
        throw new Error(
          `Appointment cannot be checked in with status: ${appointment.status}`
        );
      }

      // Check if already checked in
      const existingToken = await AppointmentToken.findOne({
        appointmentId,
        status: { $nin: ['cancelled', 'no_show'] },
      });

      if (existingToken) {
        throw new Error(`Patient is already checked in for this appointment`);
      }

      // Create token record
      const token = new AppointmentToken({
        appointmentId,
        patientId: patient._id,
        hospitalId: appointment.hospitalId,
        professionalId: appointment.providerId,
        appointmentDate: appointment.appointmentDate,
        status: 'checked_in',
        checkedInAt: new Date(),
        checkedInBy: requestingUser._id,
      });

      await token.save();

      // Update appointment status
      appointment.status = 'confirmed';
      appointment.checkedInAt = new Date();
      appointment.checkedInBy = requestingUser._id;
      await appointment.save();

      // Audit event
      await AuditService.logEvent({
        action: 'appointment_checkin',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: token._id,
        resourceType: 'appointment_token',
        patient: patient._id,
        hospital: appointment.hospitalId,
        status: 'success',
        details: {
          appointmentId,
          tokenId: token._id,
        },
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to check in patient: ${error.message}`);
    }
  }

  /**
   * Assign token number to a checked-in patient
   * @param {String} tokenId
   * @param {Object} requestingUser
   * @returns {Object} Updated token
   */
  static async assignToken(tokenId, requestingUser) {
    try {
      const token = await AppointmentToken.findById(tokenId);
      if (!token) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      // Only doctor/facility staff can assign tokens
      if (!['DOCTOR', 'NURSE', 'RECEPTION_STAFF'].includes(requestingUser.role)) {
        throw new Error('Only facility staff can assign tokens');
      }

      if (token.status !== 'checked_in') {
        throw new Error(
          `Token can only be assigned when status is 'checked_in'. Current status: ${token.status}`
        );
      }

      // Generate token number
      const tokenNumber = await this.generateTokenNumber(
        token.hospitalId,
        token.professionalId,
        token.appointmentDate
      );

      token.tokenNumber = tokenNumber;
      token.status = 'token_assigned';
      token.tokenAssignedAt = new Date();
      token.tokenAssignedBy = requestingUser._id;

      // Calculate queue position
      const tokensAhead = await AppointmentToken.countDocuments({
        hospitalId: token.hospitalId,
        professionalId: token.professionalId,
        appointmentDate: token.appointmentDate,
        status: 'waiting',
        tokenAssignedAt: { $lt: new Date() },
      });

      token.queuePosition = tokensAhead + 1;

      await token.save();

      // Audit event
      await AuditService.logEvent({
        action: 'token_assigned',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: token._id,
        resourceType: 'appointment_token',
        patient: token.patientId,
        hospital: token.hospitalId,
        status: 'success',
        details: {
          tokenNumber,
          queuePosition: token.queuePosition,
        },
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to assign token: ${error.message}`);
    }
  }

  /**
   * Move token to waiting status
   * @param {String} tokenId
   * @param {Object} requestingUser
   * @returns {Object} Updated token
   */
  static async moveToWaiting(tokenId, requestingUser) {
    try {
      const token = await AppointmentToken.findById(tokenId);
      if (!token) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      if (token.status !== 'token_assigned') {
        throw new Error(
          `Token must be in 'token_assigned' status. Current status: ${token.status}`
        );
      }

      token.status = 'waiting';
      await token.save();

      // Audit event
      await AuditService.logEvent({
        action: 'token_moved_to_waiting',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: token._id,
        resourceType: 'appointment_token',
        patient: token.patientId,
        hospital: token.hospitalId,
        status: 'success',
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to move token to waiting: ${error.message}`);
    }
  }

  /**
   * Call next patient - move token to in_consultation
   * @param {String} tokenId
   * @param {Object} requestingUser
   * @returns {Object} Updated token
   */
  static async callNextPatient(tokenId, requestingUser) {
    try {
      const token = await AppointmentToken.findById(tokenId);
      if (!token) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      if (!['token_assigned', 'waiting'].includes(token.status)) {
        throw new Error(
          `Token must be in 'waiting' or 'token_assigned' status. Current status: ${token.status}`
        );
      }

      token.status = 'in_consultation';
      token.consultationStartedAt = new Date();
      await token.save();

      // Audit event
      await AuditService.logEvent({
        action: 'token_called_for_consultation',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: token._id,
        resourceType: 'appointment_token',
        patient: token.patientId,
        hospital: token.hospitalId,
        status: 'success',
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to call next patient: ${error.message}`);
    }
  }

  /**
   * Complete consultation
   * @param {String} tokenId
   * @param {Object} requestingUser
   * @returns {Object} Updated token
   */
  static async completeConsultation(tokenId, requestingUser) {
    try {
      const token = await AppointmentToken.findById(tokenId);
      if (!token) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      if (token.status !== 'in_consultation') {
        throw new Error(
          `Can only complete 'in_consultation' tokens. Current status: ${token.status}`
        );
      }

      const now = new Date();
      token.status = 'completed';
      token.consultationEndedAt = now;
      token.completedAt = now;
      token.completedBy = requestingUser._id;

      if (token.consultationStartedAt) {
        token.waitTimeMinutes = Math.round(
          (token.consultationStartedAt - token.checkedInAt) / 60000
        );
        token.consultationDuration = Math.round(
          (now - token.consultationStartedAt) / 60000
        );
      }

      await token.save();

      // Update appointment
      const appointment = await Appointment.findById(token.appointmentId);
      if (appointment) {
        appointment.status = 'completed';
        appointment.completedAt = now;
        await appointment.save();
      }

      // Audit event
      await AuditService.logEvent({
        action: 'consultation_completed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: token._id,
        resourceType: 'appointment_token',
        patient: token.patientId,
        hospital: token.hospitalId,
        status: 'success',
        details: {
          consultationDuration: token.consultationDuration,
          waitTimeMinutes: token.waitTimeMinutes,
        },
      });

      return token;
    } catch (error) {
      throw new Error(`Failed to complete consultation: ${error.message}`);
    }
  }

  /**
   * Get today's queue for a doctor at a facility
   * @param {String} professionalId
   * @param {String} hospitalId
   * @param {Date} appointmentDate
   * @param {Object} requestingUser
   * @returns {Array} Queue tokens
   */
  static async getTodayQueue(
    professionalId,
    hospitalId,
    appointmentDate,
    requestingUser
  ) {
    try {
      // Only authorized staff can view queue
      if (!['DOCTOR', 'NURSE', 'RECEPTION_STAFF'].includes(requestingUser.role)) {
        throw new Error('Only facility staff can view queue');
      }

      const startOfDay = new Date(appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const tokens = await AppointmentToken.find({
        professionalId,
        hospitalId,
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: { $nin: ['cancelled'] },
      })
        .populate('patientId', 'jeevaId personalIdentity')
        .sort({ status: 1, queuePosition: 1 });

      return tokens;
    } catch (error) {
      throw new Error(`Failed to get today's queue: ${error.message}`);
    }
  }

  /**
   * Get token status for patient
   * @param {String} tokenId
   * @param {Object} requestingUser
   * @returns {Object} Token with status
   */
  static async getTokenStatus(tokenId, requestingUser) {
    try {
      const token = await AppointmentToken.findById(tokenId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('hospitalId', 'name facilityId');

      if (!token) {
        throw new Error(`Token not found: ${tokenId}`);
      }

      const patient = await Patient.findById(token.patientId);

      // Patient can only view their own token status
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patient can only view their own token status');
      }

      return token;
    } catch (error) {
      throw new Error(`Failed to get token status: ${error.message}`);
    }
  }
}

export default CheckInService;
