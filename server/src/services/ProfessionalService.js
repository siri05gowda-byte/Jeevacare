/**
 * Professional Service
 * Manages healthcare professional lifecycle:
 * - Registration and verification
 * - Credential management
 * - Multi-facility support
 * - Expiry handling
 * - Status enforcement
 */

import HealthcareProfessional from '../models/HealthcareProfessional.js';
import ProfessionalCredential from '../models/ProfessionalCredential.js';
import HospitalStaff from '../models/HospitalStaff.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';

class ProfessionalService {
  /**
   * Register a healthcare professional
   * Links professional profile to user account
   */
  static async registerProfessional(userData, professionalData, createdBy = null) {
    try {
      // Check if professional already exists
      const existingProfessional = await HealthcareProfessional.findOne({
        userId: userData._id,
      });

      if (existingProfessional) {
        throw new Error(
          `Professional profile already exists for user ${userData._id}`
        );
      }

      // Create professional profile
      const professional = new HealthcareProfessional({
        userId: userData._id,
        firstName: professionalData.firstName,
        lastName: professionalData.lastName,
        email: professionalData.email || userData.email,
        phone: professionalData.phone,
        professionalType: professionalData.professionalType,
        specialization: professionalData.specialization || [],
        qualifications: professionalData.qualifications || [],
        licenseNumber: professionalData.licenseNumber,
        registrationNumber: professionalData.registrationNumber,
        yearsOfExperience: professionalData.yearsOfExperience,
        biography: professionalData.biography,
        createdBy: createdBy || userData._id,
      });

      const savedProfessional = await professional.save();

      // Log audit event
      if (createdBy) {
        await AuditService.logEvent({
          action: 'professional_verified',
          actor: createdBy,
          resource: 'HealthcareProfessional',
          resourceId: savedProfessional._id,
          details: {
            professionalId: savedProfessional.professionalId,
            professionalType: professionalData.professionalType,
          },
        });
      }

      return savedProfessional;
    } catch (error) {
      throw new Error(`Failed to register professional: ${error.message}`);
    }
  }

  /**
   * Get professional by ID
   */
  static async getProfessionalById(professionalId) {
    try {
      const professional = await HealthcareProfessional.findById(professionalId)
        .populate('userId', 'email name phone accountStatus')
        .populate('credentials')
        .populate('facilityAssociations');

      return professional;
    } catch (error) {
      throw new Error(`Failed to fetch professional: ${error.message}`);
    }
  }

  /**
   * Get professional by Professional ID
   */
  static async getProfessionalByProfessionalId(professionalIdString) {
    try {
      const professional = await HealthcareProfessional.findOne({
        professionalId: professionalIdString,
      })
        .populate('userId', 'email name phone accountStatus')
        .populate('credentials')
        .populate('facilityAssociations');

      return professional;
    } catch (error) {
      throw new Error(
        `Failed to fetch professional by ID: ${error.message}`
      );
    }
  }

  /**
   * Get professional by User ID
   */
  static async getProfessionalByUserId(userId) {
    try {
      const professional = await HealthcareProfessional.findOne({ userId })
        .populate('userId', 'email name phone accountStatus')
        .populate('credentials')
        .populate('facilityAssociations');

      return professional;
    } catch (error) {
      throw new Error(`Failed to fetch professional by user: ${error.message}`);
    }
  }

  /**
   * Add credential to professional
   */
  static async addCredential(professionalId, credentialData, addedBy = null) {
    try {
      const professional = await HealthcareProfessional.findById(professionalId);

      if (!professional) {
        throw new Error(`Professional not found: ${professionalId}`);
      }

      // Create credential
      const credential = new ProfessionalCredential({
        professionalId: professionalId,
        credentialType: credentialData.credentialType,
        credentialName: credentialData.credentialName,
        credentialNumber: credentialData.credentialNumber,
        issuingAuthority: credentialData.issuingAuthority,
        issueDate: credentialData.issueDate,
        expiryDate: credentialData.expiryDate,
        scope: credentialData.scope || [],
        documents: credentialData.documents || [],
      });

      const savedCredential = await credential.save();

      // Add credential reference to professional
      professional.credentials.push(savedCredential._id);
      await professional.save();

      // Log audit event
      if (addedBy) {
        await AuditService.logEvent({
          action: 'professional_verified',
          actor: addedBy,
          resource: 'ProfessionalCredential',
          resourceId: savedCredential._id,
          details: {
            professionalId: professional.professionalId,
            credentialType: credentialData.credentialType,
            credentialNumber: credentialData.credentialNumber,
          },
        });
      }

      return savedCredential;
    } catch (error) {
      throw new Error(`Failed to add credential: ${error.message}`);
    }
  }

  /**
   * Verify credential
   */
  static async verifyCredential(credentialId, verificationData, verifiedBy = null) {
    try {
      const credential = await ProfessionalCredential.findById(credentialId);

      if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
      }

      // Update credential status
      credential.status = 'verified';
      credential.verification = {
        verifiedAt: new Date(),
        verifiedBy: verifiedBy,
        verificationMethod: verificationData.verificationMethod || 'manual',
        verificationSource: verificationData.verificationSource,
      };

      const savedCredential = await credential.save();

      // Log audit event
      if (verifiedBy) {
        await AuditService.logEvent({
          action: 'professional_verified',
          actor: verifiedBy,
          resource: 'ProfessionalCredential',
          resourceId: credentialId,
          details: {
            professionalId: credential.professionalId,
            credentialType: credential.credentialType,
          },
        });
      }

      return savedCredential;
    } catch (error) {
      throw new Error(`Failed to verify credential: ${error.message}`);
    }
  }

  /**
   * Reject credential
   */
  static async rejectCredential(credentialId, rejectionData, rejectedBy = null) {
    try {
      const credential = await ProfessionalCredential.findById(credentialId);

      if (!credential) {
        throw new Error(`Credential not found: ${credentialId}`);
      }

      // Update credential status
      credential.status = 'rejected';
      credential.rejectionDetails = {
        reason: rejectionData.reason,
        rejectedAt: new Date(),
        rejectedBy: rejectedBy,
      };

      const savedCredential = await credential.save();

      // Log audit event
      if (rejectedBy) {
        await AuditService.logEvent({
          action: 'CREDENTIAL_REJECTED',
          actor: rejectedBy,
          resource: 'ProfessionalCredential',
          resourceId: credentialId,
          details: {
            professionalId: credential.professionalId,
            credentialType: credential.credentialType,
            reason: rejectionData.reason,
          },
        });
      }

      return savedCredential;
    } catch (error) {
      throw new Error(`Failed to reject credential: ${error.message}`);
    }
  }

  /**
   * Verify professional overall
   */
  static async verifyProfessional(professionalId, verificationData, verifiedBy = null) {
    try {
      const professional = await HealthcareProfessional.findById(professionalId);

      if (!professional) {
        throw new Error(`Professional not found: ${professionalId}`);
      }

      // Update verification status
      professional.verificationStatus = 'verified';
      professional.verification = {
        verifiedAt: new Date(),
        verifiedBy: verifiedBy,
        verificationMethod: verificationData.verificationMethod || 'manual',
        verificationExpiry: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000
        ), // 365 days
      };

      const savedProfessional = await professional.save();

      // Log audit event
      if (verifiedBy) {
        await AuditService.logEvent({
          action: 'professional_verified',
          actor: verifiedBy,
          resource: 'HealthcareProfessional',
          resourceId: professionalId,
          details: {
            professionalId: professional.professionalId,
            verificationMethod: verificationData.verificationMethod || 'manual',
          },
        });
      }

      return savedProfessional;
    } catch (error) {
      throw new Error(`Failed to verify professional: ${error.message}`);
    }
  }

  /**
   * Suspend professional
   */
  static async suspendProfessional(
    professionalId,
    suspensionData,
    suspendedBy = null
  ) {
    try {
      const professional = await HealthcareProfessional.findById(professionalId);

      if (!professional) {
        throw new Error(`Professional not found: ${professionalId}`);
      }

      // Update account status
      professional.accountStatus = 'suspended';
      professional.suspension = {
        suspendedAt: new Date(),
        suspendedBy: suspendedBy,
        suspensionReason: suspensionData.reason,
        suspensionExpiryDate: suspensionData.expiryDate,
      };

      const savedProfessional = await professional.save();

      // Suspend all HospitalStaff associations
      await HospitalStaff.updateMany(
        { professionalId: professionalId, associationStatus: 'active' },
        {
          associationStatus: 'suspended',
          'suspension.suspendedAt': new Date(),
          'suspension.suspendedBy': suspendedBy,
          'suspension.suspensionReason': `Professional account suspended: ${suspensionData.reason}`,
        }
      );

      // Log audit event
      if (suspendedBy) {
        await AuditService.logEvent({
          action: 'professional_rejected',
          actor: suspendedBy,
          resource: 'HealthcareProfessional',
          resourceId: professionalId,
          details: {
            professionalId: professional.professionalId,
            reason: suspensionData.reason,
            expiryDate: suspensionData.expiryDate,
          },
        });
      }

      return savedProfessional;
    } catch (error) {
      throw new Error(`Failed to suspend professional: ${error.message}`);
    }
  }

  /**
   * Reactivate suspended professional
   */
  static async reactivateProfessional(professionalId, reactivatedBy = null) {
    try {
      const professional = await HealthcareProfessional.findById(professionalId);

      if (!professional) {
        throw new Error(`Professional not found: ${professionalId}`);
      }

      if (professional.accountStatus !== 'suspended') {
        throw new Error(
          `Professional is not suspended: ${professional.professionalId}`
        );
      }

      // Clear suspension info and reactivate
      professional.accountStatus = 'active';
      professional.suspension = undefined;

      const savedProfessional = await professional.save();

      // Log audit event
      if (reactivatedBy) {
        await AuditService.logEvent({
          action: 'professional_verified',
          actor: reactivatedBy,
          resource: 'HealthcareProfessional',
          resourceId: professionalId,
          details: {
            professionalId: professional.professionalId,
          },
        });
      }

      return savedProfessional;
    } catch (error) {
      throw new Error(`Failed to reactivate professional: ${error.message}`);
    }
  }

  /**
   * Check if professional is eligible for clinical operations
   * Requires: verified status, active account, valid credentials
   */
  static async canPerformClinicalOperations(professionalId) {
    try {
      const professional = await HealthcareProfessional.findById(professionalId);

      if (!professional) {
        return false;
      }

      // Check overall verification and account status
      if (
        professional.verificationStatus !== 'verified' ||
        professional.accountStatus !== 'active'
      ) {
        return false;
      }

      // Check if verification has not expired
      if (
        professional.verification?.verificationExpiry &&
        new Date() > professional.verification.verificationExpiry
      ) {
        return false;
      }

      // Check for active credentials (at least one verified, non-expired)
      const activeCredentials = await ProfessionalCredential.findOne({
        professionalId: professionalId,
        status: 'verified',
        $or: [
          { expiryDate: { $exists: false } },
          { expiryDate: { $gt: new Date() } },
        ],
      });

      return !!activeCredentials;
    } catch (error) {
      console.error(`Error checking clinical operations eligibility: ${error.message}`);
      return false;
    }
  }

  /**
   * Get facility associations for professional
   */
  static async getFacilityAssociations(professionalId) {
    try {
      const associations = await HospitalStaff.find({
        professionalId: professionalId,
      })
        .populate('hospitalId', 'facilityId name city verificationStatus status')
        .populate('userId', 'email name phone')
        .sort({ startDate: -1 });

      return associations;
    } catch (error) {
      throw new Error(`Failed to fetch facility associations: ${error.message}`);
    }
  }

  /**
   * Get active facility associations
   */
  static async getActiveFacilityAssociations(professionalId) {
    try {
      const associations = await HospitalStaff.find({
        professionalId: professionalId,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      })
        .populate('hospitalId', 'facilityId name city verificationStatus status')
        .populate('userId', 'email name phone')
        .sort({ startDate: -1 });

      return associations;
    } catch (error) {
      throw new Error(
        `Failed to fetch active facility associations: ${error.message}`
      );
    }
  }

  /**
   * Check if professional is active at a specific facility
   */
  static async isActivatAtFacility(professionalId, hospitalId) {
    try {
      const association = await HospitalStaff.findOne({
        professionalId: professionalId,
        hospitalId: hospitalId,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      return !!association;
    } catch (error) {
      console.error(`Error checking facility association: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all pending verification professionals
   */
  static async getPendingVerifications() {
    try {
      const professionals = await HealthcareProfessional.find({
        verificationStatus: 'pending',
      })
        .populate('userId', 'email name phone')
        .populate('credentials')
        .sort({ createdAt: -1 });

      return professionals;
    } catch (error) {
      throw new Error(
        `Failed to fetch pending verifications: ${error.message}`
      );
    }
  }

  /**
   * Check credential expiry and update status
   * Should be run periodically
   */
  static async checkCredentialExpiry() {
    try {
      const expiredCredentials = await ProfessionalCredential.find({
        status: { $ne: 'expired' },
        expiryDate: { $lt: new Date() },
      });

      for (const credential of expiredCredentials) {
        credential.status = 'expired';
        await credential.save();

        await AuditService.logEvent({
          action: 'CREDENTIAL_EXPIRED',
          resource: 'ProfessionalCredential',
          resourceId: credential._id,
          details: {
            professionalId: credential.professionalId,
            credentialType: credential.credentialType,
            expiryDate: credential.expiryDate,
          },
        });
      }

      return expiredCredentials.length;
    } catch (error) {
      throw new Error(`Failed to check credential expiry: ${error.message}`);
    }
  }
}

export default ProfessionalService;

