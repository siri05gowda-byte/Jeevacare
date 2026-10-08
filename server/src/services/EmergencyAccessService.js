import EmergencyAccess from '../models/EmergencyAccess.js';
import EmergencyProfile from '../models/EmergencyProfile.js';
import EmergencyIncident from '../models/EmergencyIncident.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import AuditService from './AuditService.js';
import EmergencyProfileService from './EmergencyProfileService.js';
import logger from '../utils/logger.js';

class EmergencyAccessService {
  /**
   * Request emergency access to patient records
   * Does not automatically grant access - requires authorization
   */
  static async requestEmergencyAccess(accessData) {
    try {
      const {
        patientId,
        patientIdentifier, // JeevaId or identifier used to find patient
        professionalId,
        professionalRole,
        facilityId,
        accessReason,
        reasonDescription,
        accessLevel,
        incidentId,
        encounterId,
      } = accessData;

      // Verify professional exists and has appropriate role
      const professional = await User.findById(professionalId).exec();
      if (!professional) {
        throw new Error('Healthcare professional not found');
      }

      // Must be a healthcare professional
      if (!['DOCTOR', 'NURSE', 'PARAMEDIC', 'EMERGENCY', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN'].includes(professional.role)) {
        throw new Error('Only healthcare professionals can request emergency access');
      }

      // Verify access reason
      const validReasons = [
        'unconscious_patient',
        'accident',
        'acute_medical_emergency',
        'unable_to_provide_history',
        'critical_condition',
        'emergency_surgery_required',
        'severe_trauma',
        'drug_reaction',
        'other_emergency',
      ];

      if (!validReasons.includes(accessReason)) {
        throw new Error('Invalid emergency access reason');
      }

      // Try to identify patient
      let patient = null;
      if (patientId) {
        patient = await Patient.findById(patientId).exec();
      }

      // If patient not identified, try by JeevaId
      if (!patient && patientIdentifier) {
        patient = await Patient.findOne({ jeevaId: patientIdentifier }).exec();
      }

      // Create access request (initially in 'requested' status)
      const accessRequest = new EmergencyAccess({
        patientId: patient ? patient._id : null,
        professionalId,
        professionalRole: professional.role,
        facilityId,
        accessReason,
        reasonDescription,
        accessLevel: accessLevel || 'emergency_profile',
        encounterId,
        emergencyIncidentId: incidentId,
        authorizationStatus: 'requested',
        requestDateTime: new Date(),
        accessSource: 'emergency_dashboard',
        auditTrail: [
          {
            action: 'request_submitted',
            timestamp: new Date(),
            actor: professionalId,
            details: {
              reason: accessReason,
              accessLevel,
            },
          },
        ],
      });

      await accessRequest.save();

      // Log audit event
      await AuditService.logEvent({
        actor: professionalId,
        actorRole: professional.role,
        action: 'emergency_access_requested',
        resource: accessRequest._id.toString(),
        resourceType: 'emergency_profile',
        patient: patient ? patient._id : null,
        hospital: facilityId,
        details: {
          accessId: accessRequest.accessId,
          accessReason,
          patientIdentifier: patientIdentifier || 'unknown',
          identified: !!patient,
        },
        emergencyAccessReason: accessReason,
        sensitivityLevel: 'high',
      });

      logger.info(`Emergency access requested: ${accessRequest.accessId} by ${professional.email}`);
      return accessRequest;
    } catch (error) {
      logger.error(`Failed to request emergency access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Authorize emergency access
   * Called by emergency coordinator or authorized system
   */
  static async authorizeEmergencyAccess(accessId, authorizedBy = null, durationMinutes = 60) {
    try {
      const access = await EmergencyAccess.findOne({ accessId }).exec();
      if (!access) {
        throw new Error('Emergency access request not found');
      }

      // Can only authorize 'requested' status
      if (access.authorizationStatus !== 'requested') {
        throw new Error(`Cannot authorize access with status: ${access.authorizationStatus}`);
      }

      // Verify authorizer exists and has authority
      const authorizer = await User.findById(authorizedBy).exec();
      if (!authorizer) {
        throw new Error('Authorizer not found');
      }

      // Only certain roles can authorize emergency access
      if (!['HOSPITAL_ADMIN', 'EMERGENCY', 'SYSTEM_ADMIN', 'DOCTOR'].includes(authorizer.role)) {
        throw new Error('Not authorized to approve emergency access');
      }

      // Update access record
      access.authorizationStatus = 'authorized';
      access.authorizedBy = authorizedBy;
      access.authorizationDateTime = new Date();
      access.accessGrantedDateTime = new Date();
      access.accessDurationMinutes = durationMinutes;
      access.accessExpirationDateTime = new Date(Date.now() + durationMinutes * 60 * 1000);

      access.auditTrail.push({
        action: 'authorized',
        timestamp: new Date(),
        actor: authorizedBy,
        details: {
          durationMinutes,
          expirationTime: access.accessExpirationDateTime,
        },
      });

      await access.save();

      // Log audit event
      await AuditService.logEvent({
        actor: authorizedBy,
        actorRole: authorizer.role,
        action: 'emergency_access_granted',
        resource: access._id.toString(),
        resourceType: 'emergency_profile',
        patient: access.patientId,
        hospital: access.facilityId,
        details: {
          accessId: access.accessId,
          professionalId: access.professionalId,
          durationMinutes,
          expirationTime: access.accessExpirationDateTime,
        },
        emergencyAccessReason: access.accessReason,
        emergencyAccessApprovalCode: access.accessId,
        sensitivityLevel: 'high',
      });

      logger.info(`Emergency access authorized: ${accessId}`);
      return access;
    } catch (error) {
      logger.error(`Failed to authorize emergency access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Deny emergency access
   */
  static async denyEmergencyAccess(accessId, deniedBy = null, reason = null) {
    try {
      const access = await EmergencyAccess.findOne({ accessId }).exec();
      if (!access) {
        throw new Error('Emergency access request not found');
      }

      access.authorizationStatus = 'denied';
      access.auditTrail.push({
        action: 'denied',
        timestamp: new Date(),
        actor: deniedBy,
        details: {
          reason,
        },
      });

      await access.save();

      // Log audit event
      await AuditService.logEvent({
        actor: deniedBy,
        actorRole: 'HOSPITAL_ADMIN',
        action: 'emergency_access_denied',
        resource: access._id.toString(),
        resourceType: 'emergency_profile',
        patient: access.patientId,
        status: 'denied',
        details: {
          accessId,
          reason,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Emergency access denied: ${accessId}`);
      return access;
    } catch (error) {
      logger.error(`Failed to deny emergency access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency access by ID (for authorized professionals only)
   */
  static async getEmergencyAccess(accessId, requestorId = null) {
    try {
      const access = await EmergencyAccess.findOne({ accessId })
        .populate('professionalId', 'email profile')
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('facilityId', 'name')
        .exec();

      if (!access) {
        throw new Error('Emergency access not found');
      }

      // Check authorization - must be the requesting professional or admin
      if (access.professionalId._id.toString() !== requestorId.toString()) {
        const requestor = await User.findById(requestorId).select('role').exec();
        if (!requestor || !['HOSPITAL_ADMIN', 'SYSTEM_ADMIN', 'EMERGENCY'].includes(requestor.role)) {
          throw new Error('Not authorized to view this emergency access');
        }
      }

      // Check if access has expired
      if (access.accessExpirationDateTime && access.accessExpirationDateTime < new Date()) {
        if (access.authorizationStatus === 'authorized') {
          access.authorizationStatus = 'expired';
          access.closedAt = new Date();
          access.closureReason = 'expired';
          await access.save();
        }
      }

      return access;
    } catch (error) {
      logger.error(`Failed to get emergency access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency summary for authorized access
   * Returns curated emergency information
   */
  static async getEmergencySummary(patientId, accessId, requestorId = null) {
    try {
      // Verify access authorization
      const access = await EmergencyAccess.findOne({ accessId }).exec();
      if (!access) {
        throw new Error('Emergency access not found');
      }

      if (access.patientId.toString() !== patientId) {
        throw new Error('Access ID does not match patient ID');
      }

      // Check if access has expired
      if (access.accessExpirationDateTime && access.accessExpirationDateTime < new Date()) {
        throw new Error('Emergency access has expired');
      }

      if (access.authorizationStatus !== 'authorized') {
        throw new Error('Emergency access not authorized');
      }

      // Get emergency profile summary
      const summary = await EmergencyProfileService.getEmergencySummary(patientId, requestorId);

      // Log access event
      access.accessEvents.push({
        accessDateTime: new Date(),
        dataAccessed: 'emergency_summary',
        ipAddress: 'context-dependent', // This would come from request context
        userAgent: 'context-dependent',
      });

      await access.save();

      // Log audit event
      await AuditService.logEvent({
        actor: requestorId,
        actorRole: access.professionalRole,
        action: 'patient_record_accessed',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        hospital: access.facilityId,
        details: {
          accessType: 'emergency_access',
          accessId: accessId,
          dataAccessed: 'emergency_summary',
        },
        emergencyAccessReason: access.accessReason,
        emergencyAccessApprovalCode: accessId,
        sensitivityLevel: 'high',
      });

      logger.info(`Emergency summary accessed for patient ${patientId} via access ${accessId}`);
      return summary;
    } catch (error) {
      logger.error(`Failed to get emergency summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Revoke emergency access
   */
  static async revokeEmergencyAccess(accessId, revokedBy = null, reason = null) {
    try {
      const access = await EmergencyAccess.findOne({ accessId }).exec();
      if (!access) {
        throw new Error('Emergency access not found');
      }

      access.authorizationStatus = 'revoked';
      access.closedAt = new Date();
      access.closureReason = reason || 'manually_revoked';
      access.status = 'inactive';

      access.auditTrail.push({
        action: 'revoked',
        timestamp: new Date(),
        actor: revokedBy,
        details: {
          reason,
        },
      });

      await access.save();

      // Log audit event
      await AuditService.logEvent({
        actor: revokedBy,
        actorRole: 'HOSPITAL_ADMIN',
        action: 'emergency_access_revoked',
        resource: access._id.toString(),
        resourceType: 'emergency_profile',
        patient: access.patientId,
        details: {
          accessId,
          reason,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Emergency access revoked: ${accessId}`);
      return access;
    } catch (error) {
      logger.error(`Failed to revoke emergency access: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get access history for a patient (for audit purposes)
   * Patient and authorized providers only
   */
  static async getAccessHistory(patientId, requestorId = null) {
    try {
      // Check authorization
      const requestor = await User.findById(requestorId).select('role').exec();
      if (!requestor) {
        throw new Error('Requestor not found');
      }

      const patient = await Patient.findById(patientId).exec();
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Only patient or authorized providers
      if (patient.userId.toString() !== requestorId.toString() && 
          !['DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'SYSTEM_ADMIN'].includes(requestor.role)) {
        throw new Error('Not authorized to view access history');
      }

      // Get all authorized emergency accesses for this patient
      const accessHistory = await EmergencyAccess.find({
        patientId,
        authorizationStatus: 'authorized',
      })
        .populate('professionalId', 'email profile')
        .populate('facilityId', 'name')
        .select(
          'accessId professionalId professionalRole facilityId accessReason accessLevel ' +
          'requestDateTime accessGrantedDateTime accessExpirationDateTime authorizationStatus closedAt'
        )
        .sort({ requestDateTime: -1 })
        .exec();

      return accessHistory;
    } catch (error) {
      logger.error(`Failed to get access history: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if emergency access has expired
   * Called periodically to clean up expired accesses
   */
  static async checkAndExpireAccess(accessId) {
    try {
      const access = await EmergencyAccess.findOne({ accessId }).exec();
      if (!access) {
        throw new Error('Emergency access not found');
      }

      if (
        access.accessExpirationDateTime &&
        access.accessExpirationDateTime < new Date() &&
        access.authorizationStatus === 'authorized'
      ) {
        access.authorizationStatus = 'expired';
        access.status = 'inactive';
        access.closedAt = new Date();
        access.closureReason = 'expired';

        access.auditTrail.push({
          action: 'expired',
          timestamp: new Date(),
          details: {
            expirationTime: access.accessExpirationDateTime,
          },
        });

        await access.save();

        logger.info(`Emergency access expired: ${accessId}`);
        return true;
      }

      return false;
    } catch (error) {
      logger.error(`Failed to check access expiration: ${error.message}`);
      throw error;
    }
  }

  /**
   * Batch expire all past-due emergency accesses
   */
  static async expireAllPastDueAccess() {
    try {
      const now = new Date();

      const result = await EmergencyAccess.updateMany(
        {
          authorizationStatus: 'authorized',
          accessExpirationDateTime: { $lt: now },
        },
        {
          $set: {
            authorizationStatus: 'expired',
            status: 'inactive',
            closedAt: now,
            closureReason: 'expired',
          },
        }
      );

      logger.info(`Expired ${result.modifiedCount} emergency accesses`);
      return result;
    } catch (error) {
      logger.error(`Failed to expire past-due accesses: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get access statistics for auditing
   */
  static async getAccessStatistics(facilityId = null, startDate = null, endDate = null) {
    try {
      const filter = {};

      if (facilityId) {
        filter.facilityId = facilityId;
      }

      if (startDate || endDate) {
        filter.requestDateTime = {};
        if (startDate) {
          filter.requestDateTime.$gte = startDate;
        }
        if (endDate) {
          filter.requestDateTime.$lte = endDate;
        }
      }

      const stats = await EmergencyAccess.aggregate([
        { $match: filter },
        {
          $group: {
            _id: '$authorizationStatus',
            count: { $sum: 1 },
          },
        },
      ]);

      return {
        total: stats.reduce((sum, s) => sum + s.count, 0),
        byStatus: stats,
      };
    } catch (error) {
      logger.error(`Failed to get access statistics: ${error.message}`);
      throw error;
    }
  }
}

export default EmergencyAccessService;
