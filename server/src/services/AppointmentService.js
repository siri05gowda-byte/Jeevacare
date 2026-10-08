import Appointment from '../models/Appointment.js';
import DoctorSchedule from '../models/DoctorSchedule.js';
import Patient from '../models/Patient.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';

/**
 * AppointmentService
 * Manages appointment lifecycle with full authorization integration
 * 
 * Key requirements:
 * - Patient can only book/manage their own appointments
 * - Doctor must be authorized at the facility
 * - Facility must be verified
 * - Cross-facility access must be denied
 * - Authorization checked server-side, not client-side
 */
class AppointmentService {
  /**
   * Book an appointment
   * @param {Object} appointmentData - {patientId, providerId, hospitalId, appointmentDate, appointmentType, reasonForVisit}
   * @param {Object} requestingUser - User making the request
   * @returns {Object} Created appointment
   */
  static async bookAppointment(appointmentData, requestingUser) {
    try {
      // 1. Verify patient exists and requesting user is the patient
      const patient = await Patient.findById(appointmentData.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${appointmentData.patientId}`);
      }

      // Patient can only book for themselves
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patient can only book appointments for themselves');
      }

      // 2. Verify facility exists and is verified BEFORE checking provider
      // This ensures facility-level authorization is enforced first
      const facility = await Hospital.findById(appointmentData.hospitalId);
      if (!facility) {
        throw new Error(`Facility not found: ${appointmentData.hospitalId}`);
      }

      if (facility.verificationStatus !== 'verified') {
        throw new Error(
          `Facility is not verified. Status: ${facility.verificationStatus}`
        );
      }

      // 3. Verify provider exists
      const provider = await User.findById(appointmentData.providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${appointmentData.providerId}`);
      }

      const professional = await HealthcareProfessional.findOne({ userId: provider._id });
      if (!professional) {
        throw new Error(`Professional profile not found for provider: ${provider._id}`);
      }

      // 4. Verify provider is authorized at this facility
      const { authorized: providerAuthorized } =
        await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          provider._id,
          facility._id,
          patient._id
        );

      if (!providerAuthorized) {
        throw new Error(
          `Provider is not authorized to see patients at this facility`
        );
      }

      // 5. Create appointment
      const appointment = new Appointment({
        patientId: patient._id,
        providerId: provider._id,
        hospitalId: facility._id,
        appointmentDate: new Date(appointmentData.appointmentDate),
        appointmentType: appointmentData.appointmentType || 'consultation',
        reasonForVisit: appointmentData.reasonForVisit,
        notes: appointmentData.notes,
        status: 'scheduled',
      });

      await appointment.save();

      // 6. Audit event
      await AuditService.logEvent({
        action: 'appointment_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: appointment._id,
        resourceType: 'appointment',
        patient: patient._id,
        hospital: facility._id,
        status: 'success',
        details: {
          patientId: patient._id,
          providerId: provider._id,
          facilityId: facility._id,
          appointmentDate: appointment.appointmentDate,
          appointmentType: appointment.appointmentType,
        },
      });

      return appointment;
    } catch (error) {
      throw new Error(`Failed to book appointment: ${error.message}`);
    }
  }

  /**
   * Get appointments for a patient
   * @param {String} patientId
   * @param {Object} requestingUser
   * @param {Object} filters - {status, dateFrom, dateTo}
   * @returns {Array} Appointments
   */
  static async getPatientAppointments(patientId, requestingUser, filters = {}) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // Patient can only view their own appointments
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patient can only view their own appointments');
      }

      const query = { patientId };

      if (filters.status) {
        query.status = filters.status;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.appointmentDate = {};
        if (filters.dateFrom) {
          query.appointmentDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.appointmentDate.$lte = new Date(filters.dateTo);
        }
      }

      const appointments = await Appointment.find(query)
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('hospitalId', 'name facilityId')
        .sort({ appointmentDate: -1 });

      return appointments;
    } catch (error) {
      throw new Error(`Failed to get patient appointments: ${error.message}`);
    }
  }

  /**
   * Get appointments for a doctor on a specific date
   * @param {String} providerId
   * @param {String} hospitalId
   * @param {Date} appointmentDate
   * @param {Object} requestingUser
   * @returns {Array} Appointments
   */
  static async getDoctorAppointments(
    providerId,
    hospitalId,
    appointmentDate,
    requestingUser
  ) {
    try {
      // Only doctor or hospital staff can view doctor's appointments
      if (requestingUser.role === 'PATIENT') {
        throw new Error('Patients cannot view doctor appointment lists');
      }

      const provider = await User.findById(providerId);
      if (!provider) {
        throw new Error(`Provider not found: ${providerId}`);
      }

      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error(`Facility not found: ${hospitalId}`);
      }

      // Verify requesting user has access to this facility
      if (requestingUser.role === 'DOCTOR') {
        const { authorized } =
          await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
            requestingUser._id,
            facility._id,
            null
          );
        if (!authorized) {
          throw new Error('Not authorized to access this facility');
        }
      }

      const startOfDay = new Date(appointmentDate);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(appointmentDate);
      endOfDay.setHours(23, 59, 59, 999);

      const appointments = await Appointment.find({
        providerId,
        hospitalId,
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
      })
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .sort({ appointmentDate: 1 });

      return appointments;
    } catch (error) {
      throw new Error(`Failed to get doctor appointments: ${error.message}`);
    }
  }

  /**
   * Cancel appointment
   * @param {String} appointmentId
   * @param {String} cancellationReason
   * @param {Object} requestingUser
   * @returns {Object} Updated appointment
   */
  static async cancelAppointment(
    appointmentId,
    cancellationReason,
    requestingUser
  ) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      const patient = await Patient.findById(appointment.patientId);
      const provider = await User.findById(appointment.providerId);

      // Patient can only cancel their own appointments
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patient can only cancel their own appointments');
      }

      // Check if appointment can be cancelled
      if (['completed', 'cancelled'].includes(appointment.status)) {
        throw new Error(
          `Cannot cancel appointment with status: ${appointment.status}`
        );
      }

      appointment.status = 'cancelled';
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = requestingUser._id;
      appointment.cancellationReason = cancellationReason;

      await appointment.save();

      // Audit event
      await AuditService.logEvent({
        action: 'appointment_cancelled',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: appointment._id,
        resourceType: 'appointment',
        patient: patient._id,
        hospital: appointment.hospitalId,
        status: 'success',
        details: {
          cancellationReason,
          previousStatus: appointment.status,
        },
      });

      return appointment;
    } catch (error) {
      throw new Error(`Failed to cancel appointment: ${error.message}`);
    }
  }

  /**
   * Reschedule appointment
   * @param {String} appointmentId
   * @param {Date} newAppointmentDate
   * @param {String} reschedulingReason
   * @param {Object} requestingUser
   * @returns {Object} New appointment
   */
  static async rescheduleAppointment(
    appointmentId,
    newAppointmentDate,
    reschedulingReason,
    requestingUser
  ) {
    try {
      const appointment = await Appointment.findById(appointmentId);
      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      const patient = await Patient.findById(appointment.patientId);

      // Patient can only reschedule their own appointments
      if (
        requestingUser.role === 'PATIENT' &&
        requestingUser._id.toString() !== patient.userId.toString()
      ) {
        throw new Error('Patient can only reschedule their own appointments');
      }

      if (appointment.status !== 'scheduled') {
        throw new Error(
          `Can only reschedule appointments with status 'scheduled'. Current status: ${appointment.status}`
        );
      }

      // Create new appointment with rescheduling info
      const newAppointment = new Appointment({
        patientId: appointment.patientId,
        providerId: appointment.providerId,
        hospitalId: appointment.hospitalId,
        appointmentDate: new Date(newAppointmentDate),
        appointmentType: appointment.appointmentType,
        reasonForVisit: appointment.reasonForVisit,
        notes: appointment.notes,
        status: 'scheduled',
      });

      await newAppointment.save();

      // Cancel original appointment
      appointment.status = 'rescheduled';
      appointment.cancelledAt = new Date();
      appointment.cancelledBy = requestingUser._id;
      appointment.cancellationReason = reschedulingReason;

      await appointment.save();

      // Audit events
      await AuditService.logEvent({
        action: 'appointment_rescheduled',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: newAppointment._id,
        resourceType: 'appointment',
        patient: patient._id,
        hospital: appointment.hospitalId,
        status: 'success',
        details: {
          originalAppointmentId: appointmentId,
          newAppointmentDate: newAppointmentDate,
          reschedulingReason,
        },
      });

      return newAppointment;
    } catch (error) {
      throw new Error(`Failed to reschedule appointment: ${error.message}`);
    }
  }

  /**
   * Get appointment details
   * @param {String} appointmentId
   * @param {Object} requestingUser
   * @returns {Object} Appointment with full details
   */
  static async getAppointmentDetails(appointmentId, requestingUser) {
    try {
      const appointment = await Appointment.findById(appointmentId)
        .populate('patientId')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('hospitalId', 'name facilityId');

      if (!appointment) {
        throw new Error(`Appointment not found: ${appointmentId}`);
      }

      const patient = await Patient.findById(appointment.patientId);

      // Authorization: patient can view their own, doctor can view if authorized
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own appointments');
        }
      } else if (requestingUser.role === 'DOCTOR') {
        const { authorized } =
          await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
            requestingUser._id,
            appointment.hospitalId,
            patient._id
          );
        if (!authorized) {
          throw new Error('Not authorized to view this appointment');
        }
      }

      return appointment;
    } catch (error) {
      throw new Error(
        `Failed to get appointment details: ${error.message}`
      );
    }
  }
}

export default AppointmentService;
