/**
 * Facility Service
 * Handles hospital/facility registration, verification, and status management
 */

import Hospital from '../models/Hospital.js';
import HospitalVerification from '../models/HospitalVerification.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

class FacilityService {
  /**
   * Register a new facility
   */
  static async registerFacility(facilityData, createdBy = null) {
    try {
      // Create facility
      const facility = new Hospital({
        name: facilityData.name,
        facilityType: facilityData.facilityType || 'general_hospital',
        address: facilityData.address,
        contactInfo: facilityData.contactInfo,
        registration: facilityData.registration,
        departments: facilityData.departments || [],
        administrators: facilityData.administrators || [],
        createdBy,
      });

      await facility.save();

      // Create verification record
      const verification = new HospitalVerification({
        hospitalId: facility._id,
        status: 'pending',
        submittedInformation: {
          registrationNumber: facilityData.registration?.registrationNumber,
          registrationType: facilityData.registration?.registrationType,
          issuingAuthority: facilityData.registration?.issuingAuthority,
          issueDate: facilityData.registration?.issueDate,
          expiryDate: facilityData.registration?.expiryDate,
          licenseNumber: facilityData.registration?.licenseNumber,
          submittedAt: new Date(),
          submittedBy: createdBy,
        },
        auditTrail: [
          {
            action: 'facility_registration_submitted',
            timestamp: new Date(),
            actor: createdBy,
            details: {
              facilityName: facility.name,
              facilityType: facility.facilityType,
            },
          },
        ],
      });

      await verification.save();

      // Link verification to facility
      facility.verification = verification._id;
      await facility.save();

      // Log audit event
      await AuditService.logEvent({
        actor: createdBy,
        actorRole: 'SYSTEM',
        action: 'hospital_registration_submitted',
        resource: facility._id.toString(),
        resourceType: 'hospital',
        details: {
          facilityId: facility.facilityId,
          facilityName: facility.name,
        },
      });

      logger.info(`Facility registered: ${facility.facilityId} (${facility.name})`);
      return facility;
    } catch (error) {
      logger.error(`Failed to register facility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get facility by ID
   */
  static async getFacilityById(facilityId) {
    try {
      const facility = await Hospital.findById(facilityId)
        .populate('administrators', 'email profile')
        .populate('verification')
        .exec();

      if (!facility) {
        throw new Error('Facility not found');
      }

      return facility;
    } catch (error) {
      logger.error(`Failed to get facility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get facility by JeevaCare Facility ID
   */
  static async getFacilityByFacilityId(facilityId) {
    try {
      const facility = await Hospital.findOne({ facilityId })
        .populate('administrators', 'email profile')
        .populate('verification')
        .exec();

      if (!facility) {
        throw new Error(`Facility not found with ID: ${facilityId}`);
      }

      return facility;
    } catch (error) {
      logger.error(`Failed to get facility by facility ID: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify a facility
   * Called by JeevaCare admin
   */
  static async verifyFacility(hospitalId, verificationData, verifiedBy = null) {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      const verification = await HospitalVerification.findOne({ hospitalId });
      if (!verification) {
        throw new Error('Verification record not found');
      }

      // Update facility status
      facility.verificationStatus = 'verified';
      facility.status = 'active';

      // Update verification
      verification.status = 'verified';
      verification.verificationReview = {
        reviewedAt: new Date(),
        reviewedBy: verifiedBy,
        verificationMethod: verificationData.verificationMethod || 'jeevacare_admin',
        findings: verificationData.findings,
      };
      verification.approvalDecision = {
        status: 'approved',
        decidedAt: new Date(),
        decidedBy: verifiedBy,
        reason: verificationData.reason || 'Verified by JeevaCare admin',
      };
      verification.verificationExpiryDate = verificationData.expiryDate || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      verification.auditTrail.push({
        action: 'facility_verified',
        timestamp: new Date(),
        actor: verifiedBy,
        details: verificationData,
      });

      await facility.save();
      await verification.save();

      // Log audit event
      await AuditService.logEvent({
        actor: verifiedBy,
        actorRole: 'SYSTEM_ADMIN',
        action: 'hospital_verified',
        resource: hospitalId,
        resourceType: 'hospital',
        details: {
          facilityId: facility.facilityId,
          facilityName: facility.name,
          verificationMethod: verificationData.verificationMethod,
        },
      });

      logger.info(`Facility verified: ${facility.facilityId}`);
      return facility;
    } catch (error) {
      logger.error(`Failed to verify facility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject a facility verification
   */
  static async rejectFacility(hospitalId, rejectionData, rejectedBy = null) {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      const verification = await HospitalVerification.findOne({ hospitalId });
      if (!verification) {
        throw new Error('Verification record not found');
      }

      // Update facility status
      facility.verificationStatus = 'rejected';
      facility.status = 'rejected';
      facility.rejectionDetails = {
        reason: rejectionData.reason,
        rejectedAt: new Date(),
        rejectedBy,
      };

      // Update verification
      verification.status = 'rejected';
      verification.rejectionReason = rejectionData.reason;
      verification.rejectedAt = new Date();
      verification.rejectedBy = rejectedBy;
      verification.appealable = rejectionData.appealable !== false;
      verification.auditTrail.push({
        action: 'facility_verification_rejected',
        timestamp: new Date(),
        actor: rejectedBy,
        details: rejectionData,
      });

      await facility.save();
      await verification.save();

      // Log audit event
      await AuditService.logEvent({
        actor: rejectedBy,
        actorRole: 'SYSTEM_ADMIN',
        action: 'hospital_verification_rejected',
        resource: hospitalId,
        resourceType: 'hospital',
        status: 'denied',
        details: {
          facilityId: facility.facilityId,
          reason: rejectionData.reason,
        },
      });

      logger.info(`Facility verification rejected: ${facility.facilityId}`);
      return facility;
    } catch (error) {
      logger.error(`Failed to reject facility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspend a facility
   * Prevents clinical record creation
   */
  static async suspendFacility(hospitalId, suspensionData, suspendedBy = null) {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      facility.verificationStatus = 'suspended';
      facility.status = 'suspended';
      facility.suspensionDetails = {
        reason: suspensionData.reason,
        suspendedAt: new Date(),
        suspendedBy,
        resumeDate: suspensionData.resumeDate,
      };

      await facility.save();

      // Log audit event
      await AuditService.logEvent({
        actor: suspendedBy,
        actorRole: 'SYSTEM_ADMIN',
        action: 'hospital_suspended',
        resource: hospitalId,
        resourceType: 'hospital',
        details: {
          facilityId: facility.facilityId,
          reason: suspensionData.reason,
        },
      });

      logger.info(`Facility suspended: ${facility.facilityId}`);
      return facility;
    } catch (error) {
      logger.error(`Failed to suspend facility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reactivate a suspended facility
   */
  static async reactivateFacility(hospitalId, reactivatedBy = null) {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      if (facility.verificationStatus !== 'suspended') {
        throw new Error('Facility is not suspended');
      }

      facility.verificationStatus = 'verified';
      facility.status = 'active';
      facility.suspensionDetails = null;

      await facility.save();

      // Log audit event
      await AuditService.logEvent({
        actor: reactivatedBy,
        actorRole: 'SYSTEM_ADMIN',
        action: 'hospital_reactivated',
        resource: hospitalId,
        resourceType: 'hospital',
        details: {
          facilityId: facility.facilityId,
        },
      });

      logger.info(`Facility reactivated: ${facility.facilityId}`);
      return facility;
    } catch (error) {
      logger.error(`Failed to reactivate facility: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if facility can perform clinical operations
   */
  static async canPerformClinicalOperations(hospitalId) {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      // Cannot perform operations if:
      // - Status is not 'verified'
      // - Facility is suspended
      // - Facility is rejected
      if (facility.verificationStatus !== 'verified' || facility.status !== 'active') {
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to check clinical operations permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Add administrator to facility
   */
  static async addAdministrator(hospitalId, adminUserId, addedBy = null) {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      const user = await User.findById(adminUserId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!facility.administrators.includes(adminUserId)) {
        facility.administrators.push(adminUserId);
        await facility.save();
      }

      // Log audit event
      await AuditService.logEvent({
        actor: addedBy,
        actorRole: 'SYSTEM_ADMIN',
        action: 'hospital_admin_added',
        resource: hospitalId,
        resourceType: 'hospital',
        details: {
          facilityId: facility.facilityId,
          adminId: adminUserId,
        },
      });

      logger.info(`Administrator added to facility: ${facility.facilityId}`);
      return facility;
    } catch (error) {
      logger.error(`Failed to add administrator: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all pending verification facilities
   */
  static async getPendingVerifications() {
    try {
      const facilities = await Hospital.find({ verificationStatus: 'pending' })
        .populate('verification')
        .sort({ createdAt: -1 })
        .exec();

      return facilities;
    } catch (error) {
      logger.error(`Failed to get pending verifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Enforce facility status on operations
   * Should be called in authorization middleware
   */
  static async enforceFacilityStatus(hospitalId, requiredStatus = 'verified') {
    try {
      const facility = await Hospital.findById(hospitalId);
      if (!facility) {
        throw new Error('Facility not found');
      }

      if (facility.verificationStatus !== requiredStatus || facility.status !== 'active') {
        throw new Error(
          `Facility ${facility.facilityId} cannot perform this operation. Status: ${facility.verificationStatus}`
        );
      }

      return true;
    } catch (error) {
      logger.error(`Facility status enforcement failed: ${error.message}`);
      throw error;
    }
  }
}

export default FacilityService;
