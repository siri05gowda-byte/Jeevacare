/**
 * Staff Service
 * Manages healthcare facility staff:
 * - Multi-facility associations
 * - Permissions management
 * - Employment status
 * - Active staff lookup
 * - Staff-level authorization
 */

import HospitalStaff from '../models/HospitalStaff.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import Hospital from '../models/Hospital.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';

class StaffService {
  /**
   * Associate professional with facility
   * Create staff record
   */
  static async associateProfessionalWithFacility(
    userId,
    professionalId,
    hospitalId,
    staffData,
    associatedBy = null
  ) {
    try {
      // Validate facility exists and is verified
      const hospital = await Hospital.findById(hospitalId);

      if (!hospital) {
        throw new Error(`Facility not found: ${hospitalId}`);
      }

      // Check if association already exists
      const existingAssociation = await HospitalStaff.findOne({
        userId: userId,
        hospitalId: hospitalId,
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      if (existingAssociation) {
        throw new Error(
          `Professional is already associated with this facility`
        );
      }

      // Create staff record
      const staff = new HospitalStaff({
        userId: userId,
        professionalId: professionalId,
        hospitalId: hospitalId,
        role: staffData.role,
        department: staffData.department,
        employmentStatus: staffData.employmentStatus || 'active',
        startDate: staffData.startDate || new Date(),
        endDate: staffData.endDate,
        permissions: staffData.permissions || {},
        associationStatus: 'pending',
        facilityVerificationStatusAtAssociation: hospital.verificationStatus,
        facilityContactEmail: staffData.facilityContactEmail,
        facilityContactPhone: staffData.facilityContactPhone,
        notes: staffData.notes,
        specialization: staffData.specialization || [],
        createdBy: associatedBy,
      });

      const savedStaff = await staff.save();

      // Add to professional's facility associations
      if (professionalId) {
        const professional = await HealthcareProfessional.findById(
          professionalId
        );

        if (professional) {
          professional.facilityAssociations.push(savedStaff._id);
          await professional.save();
        }
      }

      // Log audit event
      if (associatedBy) {
        await AuditService.logEvent({
          action: 'staff_added',
          actor: associatedBy,
          resource: 'HospitalStaff',
          resourceId: savedStaff._id,
          details: {
            userId: userId,
            hospitalId: hospitalId,
            role: staffData.role,
            facilityName: hospital.name,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(
        `Failed to associate professional with facility: ${error.message}`
      );
    }
  }

  /**
   * Approve staff association
   */
  static async approveStaffAssociation(
    staffId,
    approvalData,
    approvedBy = null
  ) {
    try {
      const staff = await HospitalStaff.findById(staffId);

      if (!staff) {
        throw new Error(`Staff record not found: ${staffId}`);
      }

      if (staff.associationStatus === 'active') {
        throw new Error(`Staff association is already approved`);
      }

      // Update association status
      staff.associationStatus = 'active';
      staff.approvalInformation = {
        approvedAt: new Date(),
        approvedBy: approvedBy,
        approvalMethod: approvalData.approvalMethod || 'facility_admin',
      };

      // Auto-approve professional verification if facility is verified
      const hospital = await Hospital.findById(staff.hospitalId);

      if (hospital && hospital.verificationStatus === 'verified') {
        staff.professionalVerificationStatus = 'verified';
      }

      const savedStaff = await staff.save();

      // Log audit event
      if (approvedBy) {
        await AuditService.logEvent({
          action: 'permission_changed',
          actor: approvedBy,
          resource: 'HospitalStaff',
          resourceId: staffId,
          details: {
            hospitalId: staff.hospitalId,
            role: staff.role,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(`Failed to approve staff association: ${error.message}`);
    }
  }

  /**
   * Reject staff association
   */
  static async rejectStaffAssociation(
    staffId,
    rejectionData,
    rejectedBy = null
  ) {
    try {
      const staff = await HospitalStaff.findById(staffId);

      if (!staff) {
        throw new Error(`Staff record not found: ${staffId}`);
      }

      // Update association status
      staff.associationStatus = 'revoked';
      staff.revocation = {
        revokedAt: new Date(),
        revokedBy: rejectedBy,
        revocationReason: rejectionData.reason,
      };

      const savedStaff = await staff.save();

      // Log audit event
      if (rejectedBy) {
        await AuditService.logEvent({
          action: 'STAFF_ASSOCIATION_REJECTED',
          actor: rejectedBy,
          resource: 'HospitalStaff',
          resourceId: staffId,
          details: {
            hospitalId: staff.hospitalId,
            reason: rejectionData.reason,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(`Failed to reject staff association: ${error.message}`);
    }
  }

  /**
   * Suspend staff association
   */
  static async suspendStaffAssociation(
    staffId,
    suspensionData,
    suspendedBy = null
  ) {
    try {
      const staff = await HospitalStaff.findById(staffId);

      if (!staff) {
        throw new Error(`Staff record not found: ${staffId}`);
      }

      if (staff.associationStatus === 'suspended') {
        throw new Error(`Staff association is already suspended`);
      }

      // Update association status
      staff.associationStatus = 'suspended';
      staff.suspension = {
        suspendedAt: new Date(),
        suspendedBy: suspendedBy,
        suspensionReason: suspensionData.reason,
        suspensionExpiryDate: suspensionData.expiryDate,
      };

      const savedStaff = await staff.save();

      // Log audit event
      if (suspendedBy) {
        await AuditService.logEvent({
          action: 'STAFF_SUSPENDED',
          actor: suspendedBy,
          resource: 'HospitalStaff',
          resourceId: staffId,
          details: {
            hospitalId: staff.hospitalId,
            role: staff.role,
            reason: suspensionData.reason,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(`Failed to suspend staff association: ${error.message}`);
    }
  }

  /**
   * Reactivate suspended staff association
   */
  static async reactivateStaffAssociation(staffId, reactivatedBy = null) {
    try {
      const staff = await HospitalStaff.findById(staffId);

      if (!staff) {
        throw new Error(`Staff record not found: ${staffId}`);
      }

      if (staff.associationStatus !== 'suspended') {
        throw new Error(`Staff association is not suspended`);
      }

      // Clear suspension and reactivate
      staff.associationStatus = 'active';
      staff.suspension = undefined;

      const savedStaff = await staff.save();

      // Log audit event
      if (reactivatedBy) {
        await AuditService.logEvent({
          action: 'STAFF_REACTIVATED',
          actor: reactivatedBy,
          resource: 'HospitalStaff',
          resourceId: staffId,
          details: {
            hospitalId: staff.hospitalId,
            role: staff.role,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(
        `Failed to reactivate staff association: ${error.message}`
      );
    }
  }

  /**
   * Update staff permissions
   */
  static async updateStaffPermissions(staffId, permissions, updatedBy = null) {
    try {
      const staff = await HospitalStaff.findById(staffId);

      if (!staff) {
        throw new Error(`Staff record not found: ${staffId}`);
      }

      // Merge new permissions with existing
      staff.permissions = {
        ...staff.permissions,
        ...permissions,
      };

      staff.lastModifiedBy = updatedBy;
      const savedStaff = await staff.save();

      // Log audit event
      if (updatedBy) {
        await AuditService.logEvent({
          action: 'permission_changed',
          actor: updatedBy,
          resource: 'HospitalStaff',
          resourceId: staffId,
          details: {
            hospitalId: staff.hospitalId,
            permissions: permissions,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(`Failed to update staff permissions: ${error.message}`);
    }
  }

  /**
   * Get staff record
   */
  static async getStaffRecord(staffId) {
    try {
      const staff = await HospitalStaff.findById(staffId)
        .populate('userId', 'email name phone accountStatus')
        .populate('professionalId', 'professionalId verificationStatus')
        .populate('hospitalId', 'facilityId name city verificationStatus');

      return staff;
    } catch (error) {
      throw new Error(`Failed to fetch staff record: ${error.message}`);
    }
  }

  /**
   * Get all active staff at facility
   */
  static async getActiveFacilityStaff(hospitalId) {
    try {
      const staff = await HospitalStaff.find({
        hospitalId: hospitalId,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      })
        .populate('userId', 'email name phone')
        .populate('professionalId', 'professionalId verificationStatus')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(
        `Failed to fetch active facility staff: ${error.message}`
      );
    }
  }

  /**
   * Get staff by role at facility
   */
  static async getStaffByRole(hospitalId, role) {
    try {
      const staff = await HospitalStaff.find({
        hospitalId: hospitalId,
        role: role,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      })
        .populate('userId', 'email name phone')
        .populate('professionalId', 'professionalId verificationStatus')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(`Failed to fetch staff by role: ${error.message}`);
    }
  }

  /**
   * Get user's staff records (multi-facility)
   */
  static async getUserStaffRecords(userId) {
    try {
      const staff = await HospitalStaff.find({ userId: userId })
        .populate('hospitalId', 'facilityId name city verificationStatus status')
        .populate('professionalId', 'professionalId verificationStatus')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(`Failed to fetch user staff records: ${error.message}`);
    }
  }

  /**
   * Get user's active staff records (multi-facility, current only)
   */
  static async getUserActiveStaffRecords(userId) {
    try {
      const staff = await HospitalStaff.find({
        userId: userId,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      })
        .populate('hospitalId', 'facilityId name city verificationStatus status')
        .populate('professionalId', 'professionalId verificationStatus')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(
        `Failed to fetch user active staff records: ${error.message}`
      );
    }
  }

  /**
   * Check if user has permission at specific facility
   */
  static async hasPermissionAtFacility(
    userId,
    hospitalId,
    permissionKey
  ) {
    try {
      const staff = await HospitalStaff.findOne({
        userId: userId,
        hospitalId: hospitalId,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      if (!staff) {
        return false;
      }

      // Check if permission is true
      return staff.permissions[permissionKey] === true;
    } catch (error) {
      console.error(`Error checking permission: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if user has role at specific facility
   */
  static async hasRoleAtFacility(userId, hospitalId, role) {
    try {
      const staff = await HospitalStaff.findOne({
        userId: userId,
        hospitalId: hospitalId,
        role: role,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      return !!staff;
    } catch (error) {
      console.error(`Error checking role: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all staff with specific permission at facility
   */
  static async getStaffWithPermission(hospitalId, permissionKey) {
    try {
      const staff = await HospitalStaff.find({
        hospitalId: hospitalId,
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
        [`permissions.${permissionKey}`]: true,
      })
        .populate('userId', 'email name phone')
        .populate('professionalId', 'professionalId verificationStatus')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(
        `Failed to fetch staff with permission: ${error.message}`
      );
    }
  }

  /**
   * Get pending staff associations
   */
  static async getPendingAssociations() {
    try {
      const staff = await HospitalStaff.find({
        associationStatus: 'pending',
      })
        .populate('userId', 'email name phone')
        .populate('hospitalId', 'facilityId name city')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(
        `Failed to fetch pending associations: ${error.message}`
      );
    }
  }

  /**
   * Get pending associations for a facility
   */
  static async getPendingAssociationsForFacility(hospitalId) {
    try {
      const staff = await HospitalStaff.find({
        hospitalId: hospitalId,
        associationStatus: 'pending',
      })
        .populate('userId', 'email name phone')
        .populate('professionalId', 'professionalId verificationStatus')
        .sort({ createdAt: -1 });

      return staff;
    } catch (error) {
      throw new Error(
        `Failed to fetch pending facility associations: ${error.message}`
      );
    }
  }

  /**
   * End staff employment (set endDate)
   */
  static async endStaffEmployment(staffId, reason, endedBy = null) {
    try {
      const staff = await HospitalStaff.findById(staffId);

      if (!staff) {
        throw new Error(`Staff record not found: ${staffId}`);
      }

      if (staff.endDate) {
        throw new Error(`Staff employment already ended`);
      }

      // Set end date
      staff.endDate = new Date();
      staff.notes = `${staff.notes || ''}\n\nEmployment ended: ${reason}`;
      staff.lastModifiedBy = endedBy;

      const savedStaff = await staff.save();

      // Log audit event
      if (endedBy) {
        await AuditService.logEvent({
          action: 'STAFF_EMPLOYMENT_ENDED',
          actor: endedBy,
          resource: 'HospitalStaff',
          resourceId: staffId,
          details: {
            hospitalId: staff.hospitalId,
            role: staff.role,
            reason: reason,
          },
        });
      }

      return savedStaff;
    } catch (error) {
      throw new Error(`Failed to end staff employment: ${error.message}`);
    }
  }
}

export default StaffService;

