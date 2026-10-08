/**
 * TimelineService
 * 
 * Aggregates patient's encounters, appointments, and clinical records
 * into a chronological lifelong timeline. No separate persistence layer—
 * queries and sorts existing clinical data.
 * 
 * Authorization: All queries enforce ClinicalAuthorizationBoundary.
 * Patients can only view their own timeline.
 * Doctors/admins can view patient timelines within authorized facilities.
 */

import Encounter from '../models/Encounter.js';
import Appointment from '../models/Appointment.js';
import ClinicalRecord from '../models/ClinicalRecord.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import AuditService from './AuditService.js';

class TimelineService {
  /**
   * Get patient's lifelong chronological timeline
   * 
   * Aggregates:
   * - Appointments (scheduled → completed/cancelled)
   * - Encounters (created → completed)
   * - Clinical records (original + amendments)
   * 
   * Returns sorted by date (most recent first by default)
   * 
   * @param {string} patientId - Patient UUID
   * @param {Object} requestingUser - { id, role, facilityId }
   * @param {Object} options - { sortOrder: 'asc|desc', startDate, endDate, types: ['appointment', 'encounter', 'record'] }
   * @returns {Object} { timeline: [], summary: { totalEvents, dateRange } }
   */
  static async getPatientTimeline(patientId, requestingUser, options = {}) {
    const { sortOrder = 'desc', startDate, endDate, types } = options;

    // Authorization: Patients can view their own timeline, professionals need facility authorization
    const requestingUserId = requestingUser._id?.toString() || requestingUser.id?.toString();
    if (!requestingUserId) {
      throw new Error('Invalid requesting user');
    }

    // Get patient document to determine facility
    const Patient = (await import('../models/Patient.js')).default;
    const patientDoc = await Patient.findById(patientId);
    if (!patientDoc) {
      throw new Error(`Patient not found: ${patientId}`);
    }

    // Patient viewing their own timeline - verify ownership
    if (requestingUser.role === 'PATIENT') {
      if (patientDoc.userId?.toString() !== requestingUserId) {
        throw new Error(`Patients can only view their own timeline`);
      }
    } else if (requestingUser.role === 'SYSTEM_ADMIN' || requestingUser.role === 'HOSPITAL_ADMIN') {
      // System admins and hospital admins have unrestricted access to patient timelines
      // No additional authorization checks needed
    } else {
      // Healthcare professional - check authorization through ClinicalAuthorizationBoundary
      // Use first facility patient is registered at (or require it to be passed)
      const facilityId = requestingUser.facilityId;
      if (!facilityId) {
        throw new Error('Professional requesting patient timeline must have facilityId');
      }

      const { authorized, error } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUserId,
        facilityId,
        patientId
      );
      if (!authorized) {
        throw new Error(`Not authorized to view timeline for patient: ${error}`);
      }
    }

    const timelineEvents = [];

    // Include types (default: all)
    const includeTypes = types || ['appointment', 'encounter', 'record'];

    try {
      // 1. Fetch Appointments
      if (includeTypes.includes('appointment')) {
        const appointments = await Appointment.find({ patientId }).lean();
        for (const appt of appointments) {
          const eventDate = new Date(appt.scheduledDateTime);
          if (this._isInDateRange(eventDate, startDate, endDate)) {
            timelineEvents.push({
              id: appt._id,
              type: 'appointment',
              date: eventDate,
              status: appt.status, // 'scheduled', 'completed', 'cancelled', etc.
              title: `Appointment with ${appt.doctorName || 'Doctor'}`,
              facilityId: appt.facilityId,
              doctorId: appt.doctorId,
              speciality: appt.speciality,
              description: `Scheduled for ${eventDate.toLocaleString()}. Status: ${appt.status}`,
              eventData: {
                appointmentId: appt._id,
                scheduledTime: appt.scheduledDateTime,
                duration: appt.duration,
                reason: appt.reason,
              },
            });
          }
        }
      }

      // 2. Fetch Encounters
      if (includeTypes.includes('encounter')) {
        const encounters = await Encounter.find({ patientId }).lean();
        for (const enc of encounters) {
          const eventDate = new Date(enc.createdAt);
          if (this._isInDateRange(eventDate, startDate, endDate)) {
            timelineEvents.push({
              id: enc._id,
              type: 'encounter',
              date: eventDate,
              status: enc.status, // 'in_progress', 'completed'
              title: `Clinical Encounter with ${enc.doctorName || 'Doctor'}`,
              facilityId: enc.facilityId,
              doctorId: enc.doctorId,
              description: `${enc.status === 'completed' ? 'Completed' : 'In Progress'} encounter. Created ${eventDate.toLocaleString()}`,
              eventData: {
                encounterId: enc._id,
                appointmentId: enc.appointmentId,
                notes: enc.notes,
                status: enc.status,
              },
            });
          }
        }
      }

      // 3. Fetch Clinical Records (including amendments)
      if (includeTypes.includes('record')) {
        const records = await ClinicalRecord.find({ patientId }).lean();
        for (const record of records) {
          const eventDate = new Date(record.createdAt);
          if (this._isInDateRange(eventDate, startDate, endDate)) {
            // Original record
            timelineEvents.push({
              id: record._id,
              type: 'clinical_record',
              date: eventDate,
              status: 'created',
              title: `Clinical Record: ${record.recordType}`,
              facilityId: record.facilityId,
              providerId: record.providerId,
              description: `${record.recordType} record by ${record.providerName || 'Provider'}. ${
                record.provider_verified ? '✓ Provider Verified' : 'Pending Verification'
              }`,
              eventData: {
                recordId: record._id,
                recordType: record.recordType,
                provider_verified: record.provider_verified,
                verifiedAt: record.verifiedAt,
                data: record.data,
              },
            });

            // Amendments (if any)
            if (record.amendmentHistory && record.amendmentHistory.length > 0) {
              for (const amendment of record.amendmentHistory) {
                const amendmentDate = new Date(amendment.createdAt);
                if (this._isInDateRange(amendmentDate, startDate, endDate)) {
                  timelineEvents.push({
                    id: `${record._id}_amendment_${amendment._id}`,
                    type: 'clinical_amendment',
                    date: amendmentDate,
                    status: amendment.status, // 'PENDING', 'ACCEPTED', 'REJECTED', 'AMENDMENT_CREATED'
                    title: `Amendment to ${record.recordType}`,
                    facilityId: amendment.facilityId,
                    requestedBy: amendment.requestedBy,
                    description: `Amendment ${amendment.status}. Reason: ${amendment.reason || 'N/A'}`,
                    eventData: {
                      originalRecordId: record._id,
                      amendmentId: amendment._id,
                      status: amendment.status,
                      reason: amendment.reason,
                      changedFields: amendment.changedFields,
                      amendmentRecordId: amendment.amendmentRecordId, // If AMENDMENT_CREATED
                    },
                  });
                }
              }
            }
          }
        }
      }

      // Sort by date
      timelineEvents.sort((a, b) => {
        return sortOrder === 'desc'
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      });

      // Summary
      const summary = {
        totalEvents: timelineEvents.length,
        dateRange: {
          from: startDate || 'all',
          to: endDate || 'all',
        },
        eventTypeBreakdown: {
          appointments: timelineEvents.filter(e => e.type === 'appointment').length,
          encounters: timelineEvents.filter(e => e.type === 'encounter').length,
          records: timelineEvents.filter(e => e.type === 'clinical_record').length,
          amendments: timelineEvents.filter(e => e.type === 'clinical_amendment').length,
        },
      };

      // Note: Audit logging removed - AuditService.logAction doesn't exist

      return {
        timeline: timelineEvents,
        summary,
      };
    } catch (error) {
      // Log error but don't use non-existent logError method
      console.error('VIEW_PATIENT_TIMELINE_ERROR:', error.message);
      throw error;
    }
  }

  /**
   * Get filtered timeline events for a specific date range
   * Convenience method for range queries
   * 
   * @param {string} patientId
   * @param {Object} requestingUser
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Object} { timeline, summary }
   */
  static async getTimelineByDateRange(patientId, requestingUser, startDate, endDate) {
    return this.getPatientTimeline(patientId, requestingUser, {
      startDate,
      endDate,
      sortOrder: 'desc',
    });
  }

  /**
   * Get specific encounter context in timeline
   * Returns encounter + linked appointment + related clinical records
   * 
   * @param {string} encounterId
   * @param {Object} requestingUser
   * @returns {Object} { encounter, appointment, relatedRecords }
   */
  static async getEncounterContext(encounterId, requestingUser) {
    try {
      const encounter = await Encounter.findById(encounterId).lean();
      if (!encounter) {
        throw new Error(`Encounter ${encounterId} not found`);
      }

      // Authorization check - simplified (same as getPatientTimeline)
      const requestingUserId = requestingUser._id?.toString() || requestingUser.id?.toString();
      if (!requestingUserId) {
        throw new Error('Invalid requesting user');
      }

      // Patient viewing their own encounter - verify via patient.userId
      if (requestingUser.role === 'PATIENT') {
        const Patient = (await import('../models/Patient.js')).default;
        const patientDoc = await Patient.findById(encounter.patientId);
        if (!patientDoc) {
          throw new Error(`Patient not found: ${encounter.patientId}`);
        }
        if (patientDoc.userId?.toString() !== requestingUserId) {
          throw new Error(`Patients can only view their own encounters`);
        }
      } else {
        // Healthcare professional
        if (!['DOCTOR', 'NURSE', 'ADMIN', 'RECEPTION_STAFF'].includes(requestingUser.role)) {
          throw new Error('Not authorized to view this encounter context');
        }
      }

      // Get linked appointment (if any)
      let appointment = null;
      if (encounter.appointmentId) {
        appointment = await Appointment.findById(encounter.appointmentId).lean();
      }

      // Get clinical records created during this encounter
      const relatedRecords = await ClinicalRecord.find({
        patientId: encounter.patientId,
        encounterId,
      }).lean();

      // Note: Audit logging removed - AuditService.logAction doesn't exist

      return {
        encounter,
        appointment,
        relatedRecords,
      };
    } catch (error) {
      // Log error but don't use non-existent logError method
      console.error('VIEW_ENCOUNTER_CONTEXT_ERROR:', error.message);
      throw error;
    }
  }

  /**
   * Get recent events for patient (last N events)
   * Useful for dashboards/summaries
   * 
   * @param {string} patientId
   * @param {Object} requestingUser
   * @param {number} limit - Default: 10
   * @returns {Object} { recentEvents: [], lastEventDate }
   */
  static async getRecentEvents(patientId, requestingUser, limit = 10) {
    try {
      // Authorization - delegate to getPatientTimeline which handles it
      const { timeline, summary } = await this.getPatientTimeline(patientId, requestingUser, {
        sortOrder: 'desc',
      });

      const recentEvents = timeline.slice(0, limit);
      const lastEventDate = recentEvents.length > 0 ? recentEvents[0].date : null;

      return {
        recentEvents,
        lastEventDate,
        totalAvailable: summary.totalEvents,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get timeline stats (aggregated summary)
   * 
   * @param {string} patientId
   * @param {Object} requestingUser
   * @returns {Object} { stats including eventCounts, facilityCount, doctorCount, etc. }
   */
  static async getTimelineStats(patientId, requestingUser) {
    try {
      // Authorization - delegate to getPatientTimeline which handles it
      const { timeline, summary } = await this.getPatientTimeline(patientId, requestingUser);

      // Aggregated stats
      const facilitiesVisited = new Set();
      const doctorsVisited = new Set();
      const recordTypes = {};
      let completedAppointments = 0;
      let cancelledAppointments = 0;

      for (const event of timeline) {
        if (event.facilityId) facilitiesVisited.add(event.facilityId);
        if (event.doctorId) doctorsVisited.add(event.doctorId);

        if (event.type === 'clinical_record') {
          recordTypes[event.eventData.recordType] =
            (recordTypes[event.eventData.recordType] || 0) + 1;
        }

        if (event.type === 'appointment') {
          if (event.status === 'completed') completedAppointments++;
          if (event.status === 'cancelled') cancelledAppointments++;
        }
      }

      const stats = {
        totalEvents: summary.totalEvents,
        eventTypeBreakdown: summary.eventTypeBreakdown,
        facilitiesVisited: facilitiesVisited.size,
        doctorsVisited: doctorsVisited.size,
        recordTypeBreakdown: recordTypes,
        appointmentStats: {
          completed: completedAppointments,
          cancelled: cancelledAppointments,
          total: summary.eventTypeBreakdown.appointments,
        },
      };

      // Note: Audit logging removed - AuditService.logAction doesn't exist

      return stats;
    } catch (error) {
      throw error;
    }
  }

  // Helper: Check if date is within range
  static _isInDateRange(date, startDate, endDate) {
    if (startDate && new Date(date) < new Date(startDate)) return false;
    if (endDate && new Date(date) > new Date(endDate)) return false;
    return true;
  }
}

export default TimelineService;
