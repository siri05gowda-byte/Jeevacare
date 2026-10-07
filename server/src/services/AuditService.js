import AuditEvent from '../models/AuditEvent.js';
import logger from '../utils/logger.js';

class AuditService {
  /**
   * Log an audit event
   */
  static async logEvent({
    actor,
    actorRole,
    action,
    resource,
    resourceType,
    patient,
    hospital,
    status = 'success',
    statusMessage = null,
    details = {},
    sensitivityLevel = 'medium',
    ipAddress = null,
    userAgent = null,
  }) {
    try {
      const auditEvent = new AuditEvent({
        actor,
        actorRole,
        action,
        resource,
        resourceType,
        patient,
        hospital,
        status,
        statusMessage,
        details,
        sensitivityLevel,
        ipAddress,
        userAgent,
        timestamp: new Date(),
      });

      await auditEvent.save();

      logger.info(`Audit event logged: ${action} by ${actorRole}`);
      return auditEvent;
    } catch (error) {
      logger.error(`Failed to log audit event: ${error.message}`);
      // Don't throw - audit logging failure should not break the main operation
      return null;
    }
  }

  /**
   * Log authentication event
   */
  static async logAuthenticationEvent({
    actor,
    action,
    status,
    ipAddress,
    userAgent,
    statusMessage = null,
  }) {
    return this.logEvent({
      actor,
      actorRole: 'SYSTEM',
      action,
      status,
      statusMessage,
      ipAddress,
      userAgent,
      sensitivityLevel: 'high',
    });
  }

  /**
   * Log patient record access
   */
  static async logPatientAccess({
    actor,
    actorRole,
    patient,
    action,
    ipAddress,
    userAgent,
  }) {
    return this.logEvent({
      actor,
      actorRole,
      action,
      resource: patient._id.toString(),
      resourceType: 'patient',
      patient,
      ipAddress,
      userAgent,
      sensitivityLevel: 'high',
    });
  }

  /**
   * Log clinical record creation/modification
   */
  static async logClinicalRecordEvent({
    actor,
    actorRole,
    action,
    clinicalRecord,
    patient,
    hospital,
    details = {},
  }) {
    return this.logEvent({
      actor,
      actorRole,
      action,
      resource: clinicalRecord._id.toString(),
      resourceType: 'clinical_record',
      patient,
      hospital,
      details,
      sensitivityLevel: 'high',
    });
  }

  /**
   * Log emergency access
   */
  static async logEmergencyAccess({
    actor,
    patient,
    hospital,
    emergencyAccessReason,
    status,
    ipAddress,
    userAgent,
  }) {
    return this.logEvent({
      actor,
      actorRole: 'EMERGENCY',
      action: 'emergency_access_granted',
      resource: patient._id.toString(),
      resourceType: 'patient',
      patient,
      hospital,
      status,
      ipAddress,
      userAgent,
      sensitivityLevel: 'high',
      details: {
        emergencyAccessReason,
      },
    });
  }

  /**
   * Retrieve audit events for a patient (with authorization checks)
   */
  static async getPatientAuditLog(patientId, options = {}) {
    try {
      const query = { patient: patientId };

      if (options.action) {
        query.action = options.action;
      }

      if (options.startDate && options.endDate) {
        query.timestamp = {
          $gte: options.startDate,
          $lte: options.endDate,
        };
      }

      const page = options.page || 1;
      const limit = options.limit || 50;
      const skip = (page - 1) * limit;

      const events = await AuditEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'email profile.firstName profile.lastName')
        .exec();

      const total = await AuditEvent.countDocuments(query);

      return {
        events,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to retrieve audit log: ${error.message}`);
      throw error;
    }
  }

  /**
   * Retrieve audit events for a hospital
   */
  static async getHospitalAuditLog(hospitalId, options = {}) {
    try {
      const query = { hospital: hospitalId };

      if (options.actor) {
        query.actor = options.actor;
      }

      if (options.action) {
        query.action = options.action;
      }

      if (options.startDate && options.endDate) {
        query.timestamp = {
          $gte: options.startDate,
          $lte: options.endDate,
        };
      }

      const page = options.page || 1;
      const limit = options.limit || 100;
      const skip = (page - 1) * limit;

      const events = await AuditEvent.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'email profile.firstName profile.lastName')
        .exec();

      const total = await AuditEvent.countDocuments(query);

      return {
        events,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to retrieve hospital audit log: ${error.message}`);
      throw error;
    }
  }
}

export default AuditService;
