import DoctorSchedule from '../models/DoctorSchedule.js';
import Appointment from '../models/Appointment.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';

/**
 * ScheduleService
 * Manages doctor schedules and available appointment slots
 * 
 * Key responsibilities:
 * - Define working hours and capacity
 * - Calculate available slots
 * - Prevent double-booking
 * - Handle leave/unavailable dates
 * - Facility-scoped scheduling
 */
class ScheduleService {
  /**
   * Create or update doctor schedule
   * @param {Object} scheduleData - {professionalId, hospitalId, workingDays, dailySchedule, appointmentDuration, maxAppointmentsPerDay}
   * @param {Object} requestingUser
   * @returns {Object} Created/updated schedule
   */
  static async createOrUpdateSchedule(scheduleData, requestingUser) {
    try {
      // Verify professional exists
      const professional = await HealthcareProfessional.findById(
        scheduleData.professionalId
      );
      if (!professional) {
        throw new Error(
          `Professional not found: ${scheduleData.professionalId}`
        );
      }

      // Verify facility exists
      const facility = await Hospital.findById(scheduleData.hospitalId);
      if (!facility) {
        throw new Error(`Facility not found: ${scheduleData.hospitalId}`);
      }

      // Only hospital admins or system admins can manage schedules
      if (!['HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(requestingUser.role)) {
        throw new Error(
          'Only hospital admins can create/update schedules'
        );
      }

      // Check if schedule already exists
      let schedule = await DoctorSchedule.findOne({
        professionalId: scheduleData.professionalId,
        hospitalId: scheduleData.hospitalId,
      });

      if (schedule) {
        // Update existing schedule
        schedule.workingDays = scheduleData.workingDays || schedule.workingDays;
        schedule.dailySchedule = scheduleData.dailySchedule || schedule.dailySchedule;
        schedule.appointmentDuration =
          scheduleData.appointmentDuration || schedule.appointmentDuration;
        schedule.maxAppointmentsPerDay =
          scheduleData.maxAppointmentsPerDay || schedule.maxAppointmentsPerDay;
        schedule.lastModifiedBy = requestingUser._id;
      } else {
        // Create new schedule
        schedule = new DoctorSchedule({
          professionalId: scheduleData.professionalId,
          hospitalId: scheduleData.hospitalId,
          workingDays: scheduleData.workingDays || [
            'MONDAY',
            'TUESDAY',
            'WEDNESDAY',
            'THURSDAY',
            'FRIDAY',
          ],
          dailySchedule: scheduleData.dailySchedule,
          appointmentDuration: scheduleData.appointmentDuration || 30,
          maxAppointmentsPerDay: scheduleData.maxAppointmentsPerDay || 20,
          createdBy: requestingUser._id,
        });
      }

      await schedule.save();

      // Audit event
      await AuditService.logEvent({
        action: 'schedule_updated',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: schedule._id,
        resourceType: 'schedule',
        hospital: facility._id,
        status: 'success',
        details: {
          professionalId: professional._id,
          hospitalId: facility._id,
        },
      });

      return schedule;
    } catch (error) {
      throw new Error(`Failed to create/update schedule: ${error.message}`);
    }
  }

  /**
   * Get available appointment slots for a doctor on a specific date
   * @param {String} professionalId
   * @param {String} hospitalId
   * @param {Date} appointmentDate
   * @returns {Array} Available time slots
   */
  static async getAvailableSlots(
    professionalId,
    hospitalId,
    appointmentDate
  ) {
    try {
      // Get schedule
      const schedule = await DoctorSchedule.findOne({
        professionalId,
        hospitalId,
        status: 'active',
      });

      if (!schedule) {
        throw new Error(
          `No active schedule found for professional ${professionalId} at facility ${hospitalId}`
        );
      }

      const date = new Date(appointmentDate);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'uppercase' });

      // Check if it's a working day
      if (!schedule.workingDays.includes(dayName)) {
        return []; // No slots on non-working days
      }

      // Check if date is in unavailable dates
      const unavailable = schedule.unavailableDates.some((ud) => {
        const unavailableDate = new Date(ud.date);
        return (
          unavailableDate.toDateString() === date.toDateString() && ud.allDay
        );
      });

      if (unavailable) {
        return []; // No slots if marked as unavailable
      }

      // Get special hours if applicable, otherwise use daily schedule
      const specialHour = schedule.specialHours.find((sh) => {
        const specialDate = new Date(sh.date);
        return specialDate.toDateString() === date.toDateString();
      });

      const hours = specialHour || schedule.dailySchedule;
      const maxAppointments =
        specialHour?.maxAppointments || schedule.maxAppointmentsPerDay;

      // Parse start and end times
      const [startHour, startMin] = hours.startTime.split(':');
      const [endHour, endMin] = hours.endTime.split(':');

      const dayStart = new Date(date);
      dayStart.setHours(parseInt(startHour), parseInt(startMin), 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(parseInt(endHour), parseInt(endMin), 0);

      // Generate slots
      const slots = [];
      let currentTime = new Date(dayStart);

      while (currentTime < dayEnd) {
        slots.push(new Date(currentTime));
        currentTime = new Date(
          currentTime.getTime() + schedule.appointmentDuration * 60000
        );
      }

      // Get existing appointments for this date
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const existingAppointments = await Appointment.find({
        professionalId,
        hospitalId,
        appointmentDate: {
          $gte: startOfDay,
          $lte: endOfDay,
        },
        status: { $in: ['scheduled', 'confirmed', 'in_progress'] },
      });

      // Filter out booked slots
      const availableSlots = slots.filter((slot) => {
        const slotStart = slot;
        const slotEnd = new Date(
          slot.getTime() + schedule.appointmentDuration * 60000
        );

        return !existingAppointments.some((apt) => {
          const aptDate = new Date(apt.appointmentDate);
          return aptDate >= slotStart && aptDate < slotEnd;
        });
      });

      // Limit to max appointments per day
      return availableSlots.slice(0, maxAppointments);
    } catch (error) {
      throw new Error(`Failed to get available slots: ${error.message}`);
    }
  }

  /**
   * Add unavailable date/time
   * @param {String} professionalId
   * @param {String} hospitalId
   * @param {Object} unavailableData - {date, reason, allDay, startTime, endTime}
   * @param {Object} requestingUser
   * @returns {Object} Updated schedule
   */
  static async addUnavailableDate(
    professionalId,
    hospitalId,
    unavailableData,
    requestingUser
  ) {
    try {
      const schedule = await DoctorSchedule.findOne({
        professionalId,
        hospitalId,
      });

      if (!schedule) {
        throw new Error(
          `Schedule not found for professional ${professionalId} at facility ${hospitalId}`
        );
      }

      schedule.unavailableDates.push({
        date: new Date(unavailableData.date),
        reason: unavailableData.reason,
        allDay: unavailableData.allDay !== false,
        startTime: unavailableData.startTime,
        endTime: unavailableData.endTime,
      });

      await schedule.save();

      // Audit event
      await AuditService.logEvent({
        action: 'schedule_leave_added',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: schedule._id,
        resourceType: 'schedule',
        status: 'success',
        details: {
          date: unavailableData.date,
          reason: unavailableData.reason,
        },
      });

      return schedule;
    } catch (error) {
      throw new Error(`Failed to add unavailable date: ${error.message}`);
    }
  }

  /**
   * Get schedule details
   * @param {String} professionalId
   * @param {String} hospitalId
   * @returns {Object} Schedule
   */
  static async getSchedule(professionalId, hospitalId) {
    try {
      const schedule = await DoctorSchedule.findOne({
        professionalId,
        hospitalId,
      })
        .populate('professionalId', 'professionalId firstName lastName')
        .populate('hospitalId', 'name facilityId');

      if (!schedule) {
        throw new Error(
          `Schedule not found for professional ${professionalId} at facility ${hospitalId}`
        );
      }

      return schedule;
    } catch (error) {
      throw new Error(`Failed to get schedule: ${error.message}`);
    }
  }

  /**
   * Check if a specific time slot is available
   * @param {String} professionalId
   * @param {String} hospitalId
   * @param {Date} appointmentDateTime - Full date and time
   * @param {Number} durationMinutes
   * @returns {Boolean}
   */
  static async isTimeSlotAvailable(
    professionalId,
    hospitalId,
    appointmentDateTime,
    durationMinutes = 30
  ) {
    try {
      const availableSlots = await this.getAvailableSlots(
        professionalId,
        hospitalId,
        appointmentDateTime
      );

      const requestedSlot = new Date(appointmentDateTime);
      const requestedEnd = new Date(
        requestedSlot.getTime() + durationMinutes * 60000
      );

      return availableSlots.some((slot) => {
        const slotEnd = new Date(
          slot.getTime() + durationMinutes * 60000
        );
        return slot.getTime() === requestedSlot.getTime();
      });
    } catch (error) {
      throw new Error(`Failed to check time slot availability: ${error.message}`);
    }
  }
}

export default ScheduleService;
