/**
 * GuardianService
 * Manages guardian relationships, permissions, and minor-to-adult transitions
 */

import GuardianRelationship from '../models/GuardianRelationship.js';
import ParentRelationship from '../models/ParentRelationship.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

class GuardianService {
  /**
   * Create a new guardian relationship for a minor patient
   */
  static async createGuardianRelationship({
    childPatientId,
    guardianUserId,
    relationship,
    permissions = {},
    verificationDocument = null,
    createdBy = null,
  }) {
    try {
      // Verify patient exists
      const patient = await Patient.findById(childPatientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Verify guardian user exists
      const guardian = await User.findById(guardianUserId);
      if (!guardian) {
        throw new Error('Guardian user not found');
      }

      // Check if relationship already exists and is active
      const existingRelationship = await GuardianRelationship.findOne({
        patientId: childPatientId,
        guardianUserId,
        status: 'active',
      });

      if (existingRelationship) {
        throw new Error('Active guardian relationship already exists');
      }

      // Create new guardian relationship
      const guardianRelationship = new GuardianRelationship({
        patientId: childPatientId,
        guardianUserId,
        relationship,
        permissions: {
          viewMedicalRecords: permissions.viewMedicalRecords !== false,
          manageMedicalRecords: permissions.manageMedicalRecords === true,
          manageAppointments: permissions.manageAppointments !== false,
          manageEmergencyProfile: permissions.manageEmergencyProfile !== false,
          manageGuardians: permissions.manageGuardians === true,
          viewAccessHistory: permissions.viewAccessHistory !== false,
        },
        verificationDocument,
        createdBy,
        status: 'active',
      });

      await guardianRelationship.save();

      // Add relationship to patient's guardianRelationships array
      patient.guardianRelationships.push(guardianRelationship._id);
      await patient.save();

      // Log audit event
      await AuditService.logEvent({
        actor: createdBy,
        actorRole: 'SYSTEM',
        action: 'guardian_relationship_created',
        resource: guardianRelationship._id.toString(),
        resourceType: 'guardian_relationship',
        patient: childPatientId,
        details: {
          guardianId: guardianUserId,
          relationship,
          permissions,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Guardian relationship created for patient ${childPatientId}`);
      return guardianRelationship;
    } catch (error) {
      logger.error(`Failed to create guardian relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify a guardian relationship
   */
  static async verifyGuardianRelationship(relationshipId, verificationData, verifiedBy = null) {
    try {
      if (!['verified', 'rejected'].includes(verificationData.status)) {
        throw new Error('Invalid verification status');
      }

      const relationship = await GuardianRelationship.findById(relationshipId);
      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      relationship.verificationStatus = verificationData.status;
      relationship.verifiedBy = verifiedBy;
      relationship.verifiedAt = new Date();

      await relationship.save();

      // Log audit event
      await AuditService.logEvent({
        actor: verifiedBy,
        actorRole: 'SYSTEM',
        action: 'guardian_relationship_verified',
        resource: relationshipId,
        resourceType: 'guardian_relationship',
        patient: relationship.patientId,
        details: {
          status: verificationData.status,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Guardian relationship verified: ${relationshipId} -> ${verificationData.status}`);
      return relationship;
    } catch (error) {
      logger.error(`Failed to verify guardian relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update guardian permissions
   */
  static async updateGuardianPermissions(relationshipId, newPermissions, updatedBy = null) {
    try {
      const relationship = await GuardianRelationship.findById(relationshipId);
      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      // Update permissions
      relationship.permissions = {
        viewMedicalRecords: newPermissions.viewMedicalRecords !== false,
        manageMedicalRecords: newPermissions.manageMedicalRecords === true,
        manageAppointments: newPermissions.manageAppointments !== false,
        manageEmergencyProfile: newPermissions.manageEmergencyProfile !== false,
        manageGuardians: newPermissions.manageGuardians === true,
        viewAccessHistory: newPermissions.viewAccessHistory !== false,
      };

      await relationship.save();

      // Log audit event
      await AuditService.logEvent({
        actor: updatedBy,
        actorRole: 'SYSTEM',
        action: 'guardian_permissions_updated',
        resource: relationshipId,
        resourceType: 'guardian_relationship',
        patient: relationship.patientId,
        details: {
          permissions: newPermissions,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Guardian permissions updated: ${relationshipId}`);
      return relationship;
    } catch (error) {
      logger.error(`Failed to update guardian permissions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Terminate a guardian relationship
   */
  static async terminateGuardianRelationship(relationshipId, reason = null, terminatedBy = null) {
    try {
      const relationship = await GuardianRelationship.findById(relationshipId);
      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      relationship.status = 'terminated';
      relationship.terminatedReason = reason;
      relationship.terminatedAt = new Date();
      relationship.terminatedBy = terminatedBy;

      await relationship.save();

      // Log audit event
      await AuditService.logEvent({
        actor: terminatedBy,
        actorRole: 'SYSTEM',
        action: 'guardian_relationship_terminated',
        resource: relationshipId,
        resourceType: 'guardian_relationship',
        patient: relationship.patientId,
        details: {
          reason,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Guardian relationship terminated: ${relationshipId}`);
      return relationship;
    } catch (error) {
      logger.error(`Failed to terminate guardian relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Suspend a guardian relationship (temporary)
   */
  static async suspendGuardianRelationship(relationshipId, reason = null, suspendedBy = null) {
    try {
      const relationship = await GuardianRelationship.findById(relationshipId);
      if (!relationship) {
        throw new Error('Guardian relationship not found');
      }

      relationship.status = 'suspended';

      await relationship.save();

      // Log audit event
      await AuditService.logEvent({
        actor: suspendedBy,
        actorRole: 'SYSTEM',
        action: 'guardian_relationship_suspended',
        resource: relationshipId,
        resourceType: 'guardian_relationship',
        patient: relationship.patientId,
        details: {
          reason,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Guardian relationship suspended: ${relationshipId}`);
      return relationship;
    } catch (error) {
      logger.error(`Failed to suspend guardian relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get guardian relationships for a patient
   */
  static async getPatientGuardians(patientId) {
    try {
      const guardians = await GuardianRelationship.find({ patientId })
        .populate('guardianUserId', 'email profile phone')
        .populate('verificationDocument')
        .exec();

      return guardians;
    } catch (error) {
      logger.error(`Failed to get patient guardians: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if user is authorized guardian for a patient
   */
  static async isAuthorizedGuardian(userId, patientId, requiredPermission = 'viewMedicalRecords') {
    try {
      const relationship = await GuardianRelationship.findOne({
        guardianUserId: userId,
        patientId,
        status: 'active',
        verificationStatus: 'verified',
      });

      if (!relationship) {
        return false;
      }

      // Check if guardian has required permission
      if (requiredPermission && !relationship.permissions[requiredPermission]) {
        return false;
      }

      return true;
    } catch (error) {
      logger.error(`Failed to check if authorized guardian: ${error.message}`);
      return false;
    }
  }

  /**
   * Initiate minor-to-adult transition
   */
  static async initiateMinorToAdultTransition(patientId, initiatedBy = null) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Get all guardian relationships
      const guardians = await GuardianRelationship.find({
        patientId,
        status: 'active',
      });

      // Mark all guardianships as transitioning
      for (const guardian of guardians) {
        guardian.independenceTransition.transitionedAt = new Date();
        guardian.independenceTransition.transitionedBy = initiatedBy;
        await guardian.save();
      }

      // Log audit event
      await AuditService.logEvent({
        actor: initiatedBy,
        actorRole: 'SYSTEM',
        action: 'minor_to_adult_transition_initiated',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        details: {
          guardianCount: guardians.length,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Minor-to-adult transition initiated for patient ${patientId}`);
      return {
        patient,
        transitionedGuardians: guardians.length,
      };
    } catch (error) {
      logger.error(`Failed to initiate minor-to-adult transition: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create parent relationship
   */
  static async createParentRelationship({
    childPatientId,
    parentPatientId = null,
    parentName = null,
    relationship,
    verificationDocument = null,
    createdBy = null,
  }) {
    try {
      // Verify child patient exists
      const childPatient = await Patient.findById(childPatientId);
      if (!childPatient) {
        throw new Error('Child patient not found');
      }

      // If parent is also a patient, verify it exists
      if (parentPatientId) {
        const parentPatient = await Patient.findById(parentPatientId);
        if (!parentPatient) {
          throw new Error('Parent patient not found');
        }
      }

      // Create parent relationship
      const parentRelationship = new ParentRelationship({
        childPatientId,
        parentPatientId,
        parentName,
        relationship,
        verificationDocument,
        createdBy,
        status: 'active',
      });

      await parentRelationship.save();

      // Log audit event
      await AuditService.logEvent({
        actor: createdBy,
        actorRole: 'SYSTEM',
        action: 'parent_relationship_created',
        resource: parentRelationship._id.toString(),
        resourceType: 'parent_relationship',
        patient: childPatientId,
        details: {
          parentPatientId,
          relationship,
        },
        sensitivityLevel: 'medium',
      });

      logger.info(`Parent relationship created for patient ${childPatientId}`);
      return parentRelationship;
    } catch (error) {
      logger.error(`Failed to create parent relationship: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get parent relationships for a patient
   */
  static async getPatientParents(patientId) {
    try {
      const parents = await ParentRelationship.find({ childPatientId: patientId })
        .populate('parentPatientId', 'jeevaId personalIdentity')
        .exec();

      return parents;
    } catch (error) {
      logger.error(`Failed to get patient parents: ${error.message}`);
      throw error;
    }
  }

  /**
   * Verify parent relationship
   */
  static async verifyParentRelationship(relationshipId, verificationStatus, verifiedBy = null) {
    try {
      if (!['verified', 'rejected'].includes(verificationStatus)) {
        throw new Error('Invalid verification status');
      }

      const relationship = await ParentRelationship.findById(relationshipId);
      if (!relationship) {
        throw new Error('Parent relationship not found');
      }

      relationship.verificationStatus = verificationStatus;
      relationship.verifiedBy = verifiedBy;
      relationship.verifiedAt = new Date();

      await relationship.save();

      // Log audit event
      await AuditService.logEvent({
        actor: verifiedBy,
        actorRole: 'SYSTEM',
        action: 'parent_relationship_verified',
        resource: relationshipId,
        resourceType: 'parent_relationship',
        patient: relationship.childPatientId,
        details: {
          status: verificationStatus,
        },
        sensitivityLevel: 'medium',
      });

      logger.info(`Parent relationship verified: ${relationshipId} -> ${verificationStatus}`);
      return relationship;
    } catch (error) {
      logger.error(`Failed to verify parent relationship: ${error.message}`);
      throw error;
    }
  }
}

export default GuardianService;
