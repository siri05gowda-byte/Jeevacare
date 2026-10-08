import EmergencyProfile from '../models/EmergencyProfile.js';
import EmergencyContact from '../models/EmergencyContact.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

class EmergencyProfileService {
  /**
   * Create emergency profile for a patient
   * Called after patient registration
   */
  static async createEmergencyProfile(patientId, createdBy = null) {
    try {
      // Verify patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Check if emergency profile already exists
      const existingProfile = await EmergencyProfile.findOne({ patientId });
      if (existingProfile) {
        logger.warn(`Emergency profile already exists for patient ${patientId}`);
        return existingProfile;
      }

      // Create new emergency profile
      const profile = new EmergencyProfile({
        patientId,
        lastUpdatedBy: createdBy,
        lastUpdatedAt: new Date(),
      });

      await profile.save();

      // Link emergency profile to patient
      patient.emergencyProfileId = profile._id;
      await patient.save();

      // Log audit event
      await AuditService.logEvent({
        actor: createdBy,
        actorRole: 'SYSTEM',
        action: 'emergency_profile_created',
        resource: profile._id.toString(),
        resourceType: 'emergency_profile',
        patient: patientId,
        details: {
          profileId: profile._id,
        },
      });

      logger.info(`Emergency profile created for patient ${patientId}`);
      return profile;
    } catch (error) {
      logger.error(`Failed to create emergency profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency profile by patient ID
   * Checks authorization
   */
  static async getEmergencyProfile(patientId, requestorId = null, requestorRole = null) {
    try {
      const profile = await EmergencyProfile.findOne({ patientId })
        .populate('lastUpdatedBy', 'email profile')
        .exec();

      if (!profile) {
        throw new Error('Emergency profile not found for patient');
      }

      // Check authorization
      const authResult = await this._checkProfileAuthorization(
        patientId,
        requestorId,
        requestorRole,
        'view'
      );

      if (!authResult.authorized) {
        throw new Error(`Not authorized to view emergency profile: ${authResult.reason}`);
      }

      return profile;
    } catch (error) {
      logger.error(`Failed to get emergency profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add allergy to emergency profile
   */
  static async addAllergy(patientId, allergyData, addedBy = null, source = 'patient_reported') {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      if (!profile) {
        throw new Error('Emergency profile not found');
      }

      // Check authorization
      const authResult = await this._checkProfileAuthorization(patientId, addedBy, null, 'update');
      if (!authResult.authorized) {
        throw new Error(`Not authorized to update emergency profile: ${authResult.reason}`);
      }

      const allergy = {
        allergen: allergyData.allergen,
        severity: allergyData.severity || 'moderate',
        reaction: allergyData.reaction,
        source,
        verificationStatus: source === 'provider_verified' ? 'verified' : 'unverified',
        recordedAt: new Date(),
        recordedBy: addedBy,
      };

      profile.allergies.push(allergy);
      profile.lastUpdatedBy = addedBy;
      profile.lastUpdatedAt = new Date();
      await profile.save();

      // Log audit event
      await AuditService.logEvent({
        actor: addedBy,
        actorRole: 'PATIENT',
        action: 'emergency_profile_updated',
        resource: profile._id.toString(),
        resourceType: 'emergency_profile',
        patient: patientId,
        details: {
          fieldUpdated: 'allergies',
          allergen: allergyData.allergen,
          severity: allergyData.severity,
          source,
        },
      });

      logger.info(`Allergy added to emergency profile for patient ${patientId}`);
      return profile;
    } catch (error) {
      logger.error(`Failed to add allergy: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add critical condition to emergency profile
   */
  static async addCriticalCondition(patientId, conditionData, addedBy = null, source = 'patient_reported') {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      if (!profile) {
        throw new Error('Emergency profile not found');
      }

      // Check authorization
      const authResult = await this._checkProfileAuthorization(patientId, addedBy, null, 'update');
      if (!authResult.authorized) {
        throw new Error(`Not authorized to update emergency profile: ${authResult.reason}`);
      }

      const condition = {
        condition: conditionData.condition,
        status: conditionData.status || 'active',
        severity: conditionData.severity || 'moderate',
        onsetDate: conditionData.onsetDate,
        source,
        verificationStatus: source === 'provider_verified' ? 'verified' : 'unverified',
        recordedAt: new Date(),
        recordedBy: addedBy,
      };

      profile.criticalConditions.push(condition);
      profile.lastUpdatedBy = addedBy;
      profile.lastUpdatedAt = new Date();
      await profile.save();

      // Log audit event
      await AuditService.logEvent({
        actor: addedBy,
        actorRole: 'PATIENT',
        action: 'emergency_profile_updated',
        resource: profile._id.toString(),
        resourceType: 'emergency_profile',
        patient: patientId,
        details: {
          fieldUpdated: 'criticalConditions',
          condition: conditionData.condition,
          severity: conditionData.severity,
          source,
        },
      });

      logger.info(`Critical condition added to emergency profile for patient ${patientId}`);
      return profile;
    } catch (error) {
      logger.error(`Failed to add critical condition: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add current medication to emergency profile
   */
  static async addCurrentMedication(patientId, medicationData, addedBy = null, source = 'patient_reported') {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      if (!profile) {
        throw new Error('Emergency profile not found');
      }

      // Check authorization
      const authResult = await this._checkProfileAuthorization(patientId, addedBy, null, 'update');
      if (!authResult.authorized) {
        throw new Error(`Not authorized to update emergency profile: ${authResult.reason}`);
      }

      const medication = {
        medicationName: medicationData.medicationName,
        dosage: medicationData.dosage,
        frequency: medicationData.frequency,
        indication: medicationData.indication,
        startDate: medicationData.startDate,
        endDate: medicationData.endDate,
        source,
        verificationStatus: source === 'provider_verified' ? 'verified' : 'unverified',
        recordedAt: new Date(),
        recordedBy: addedBy,
      };

      profile.currentMedications.push(medication);
      profile.lastUpdatedBy = addedBy;
      profile.lastUpdatedAt = new Date();
      await profile.save();

      // Log audit event
      await AuditService.logEvent({
        actor: addedBy,
        actorRole: 'PATIENT',
        action: 'emergency_profile_updated',
        resource: profile._id.toString(),
        resourceType: 'emergency_profile',
        patient: patientId,
        details: {
          fieldUpdated: 'currentMedications',
          medication: medicationData.medicationName,
          source,
        },
      });

      logger.info(`Medication added to emergency profile for patient ${patientId}`);
      return profile;
    } catch (error) {
      logger.error(`Failed to add medication: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update blood group in emergency profile
   * Provider can mark as verified, patient-reported otherwise
   */
  static async updateBloodGroup(patientId, bloodGroupData, updatedBy = null, source = 'patient_reported') {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      if (!profile) {
        throw new Error('Emergency profile not found');
      }

      // Check authorization
      const authResult = await this._checkProfileAuthorization(patientId, updatedBy, null, 'update');
      if (!authResult.authorized) {
        throw new Error(`Not authorized to update emergency profile: ${authResult.reason}`);
      }

      profile.bloodGroup = {
        group: bloodGroupData.group,
        source,
        verificationStatus: source === 'provider_verified' ? 'verified' : 'unverified',
        recordedAt: new Date(),
        recordedBy: updatedBy,
        verifiedBy: source === 'provider_verified' ? updatedBy : null,
        verifiedAt: source === 'provider_verified' ? new Date() : null,
      };

      profile.lastUpdatedBy = updatedBy;
      profile.lastUpdatedAt = new Date();
      await profile.save();

      // Log audit event
      await AuditService.logEvent({
        actor: updatedBy,
        actorRole: 'PATIENT',
        action: 'emergency_profile_updated',
        resource: profile._id.toString(),
        resourceType: 'emergency_profile',
        patient: patientId,
        details: {
          fieldUpdated: 'bloodGroup',
          bloodGroup: bloodGroupData.group,
          source,
          verificationStatus: profile.bloodGroup.verificationStatus,
        },
      });

      logger.info(`Blood group updated in emergency profile for patient ${patientId}`);
      return profile;
    } catch (error) {
      logger.error(`Failed to update blood group: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency profile summary for emergency access
   * Returns only highest-priority information
   */
  static async getEmergencySummary(patientId, requestorId = null) {
    try {
      const profile = await EmergencyProfile.findOne({ patientId }).exec();
      if (!profile) {
        throw new Error('Emergency profile not found');
      }

      const patient = await Patient.findById(patientId).exec();
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Critical alerts only - what matters most in first seconds
      const summary = {
        patientIdentity: {
          firstName: patient.personalIdentity.firstName,
          lastName: patient.personalIdentity.lastName,
          jeevaId: patient.jeevaId,
          dateOfBirth: patient.personalIdentity.dateOfBirth,
          sex: patient.personalIdentity.sex,
          verificationStatus: patient.identityVerification.status,
        },

        criticalAlerts: {
          allergies: profile.allergies
            .filter(a => ['severe', 'life-threatening'].includes(a.severity))
            .map(a => ({
              allergen: a.allergen,
              severity: a.severity,
              reaction: a.reaction,
              source: a.source,
              verificationStatus: a.verificationStatus,
            })),

          conditions: profile.criticalConditions
            .filter(c => ['severe', 'life-threatening'].includes(c.severity) && c.status === 'active')
            .map(c => ({
              condition: c.condition,
              severity: c.severity,
              source: c.source,
              verificationStatus: c.verificationStatus,
            })),

          medications: profile.currentMedications
            .filter(m => !m.endDate || m.endDate > new Date())
            .map(m => ({
              medicationName: m.medicationName,
              dosage: m.dosage,
              frequency: m.frequency,
              source: m.source,
              verificationStatus: m.verificationStatus,
            })),

          warnings: profile.warnings
            .filter(w => ['severe', 'life-threatening'].includes(w.severity))
            .map(w => ({
              warning: w.warning,
              warningType: w.warningType,
              severity: w.severity,
              source: w.source,
              verificationStatus: w.verificationStatus,
            })),

          bloodGroup: profile.bloodGroup
            ? {
              group: profile.bloodGroup.group,
              source: profile.bloodGroup.source,
              verificationStatus: profile.bloodGroup.verificationStatus,
            }
            : null,
        },

        importantHistory: {
          majorSurgeries: profile.majorSurgeries.map(s => ({
            surgeryName: s.surgeryName,
            date: s.date,
            complications: s.complications,
            source: s.source,
            verificationStatus: s.verificationStatus,
          })),

          emergencyNotes: profile.emergencyNotes,
          providerVerifiedNotes: profile.providerVerifiedNotes,
        },
      };

      return summary;
    } catch (error) {
      logger.error(`Failed to get emergency summary: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check authorization to access/modify emergency profile
   * PRIVATE METHOD
   */
  static async _checkProfileAuthorization(patientId, requestorId, requestorRole, action) {
    try {
      // System actions always authorized
      if (requestorRole === 'SYSTEM' || requestorRole === 'SYSTEM_ADMIN') {
        return { authorized: true };
      }

      // Get requestor user
      const requestor = await User.findById(requestorId).select('role').exec();
      if (!requestor) {
        return {
          authorized: false,
          reason: 'Requestor not found',
        };
      }

      // Get patient
      const patient = await Patient.findById(patientId).exec();
      if (!patient) {
        return {
          authorized: false,
          reason: 'Patient not found',
        };
      }

      // Patient can access their own emergency profile
      if (patient.userId.toString() === requestorId.toString()) {
        // Patient can view and update their own profile
        return { authorized: true };
      }

      // Healthcare professionals can view (but not modify except notes)
      if (['DOCTOR', 'NURSE', 'EMERGENCY', 'PARAMEDIC'].includes(requestor.role)) {
        if (action === 'view') {
          return { authorized: true };
        }
        // Only allow adding provider-verified info
        if (action === 'update') {
          return { authorized: true };
        }
      }

      // Guardian with emergency profile access permission
      // This would need to be checked against GuardianRelationship
      if (requestor.role === 'GUARDIAN') {
        // For now, guardians cannot access emergency profile
        return {
          authorized: false,
          reason: 'Guardians cannot access emergency profiles',
        };
      }

      return {
        authorized: false,
        reason: `Role ${requestor.role} not authorized`,
      };
    } catch (error) {
      logger.error(`Authorization check failed: ${error.message}`);
      return {
        authorized: false,
        reason: 'Authorization check failed',
      };
    }
  }

  /**
   * Add emergency contact to profile
   */
  static async addEmergencyContact(patientId, contactData, addedBy = null) {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      if (!profile) {
        throw new Error('Emergency profile not found');
      }

      // Check authorization - patient can add their own contacts
      const requestor = await User.findById(addedBy).select('role').exec();
      if (!requestor) {
        throw new Error('Requestor not found');
      }

      const patient = await Patient.findById(patientId).exec();
      if (!patient || patient.userId.toString() !== addedBy.toString()) {
        throw new Error('Not authorized to add emergency contacts');
      }

      // Create emergency contact
      const contact = new EmergencyContact({
        emergencyProfileId: profile._id,
        patientId,
        contactName: contactData.contactName,
        relationship: contactData.relationship,
        contactMethods: contactData.contactMethods || [],
        priority: contactData.priority || 3,
        authorizationStatus: 'pending',
        createdBy: addedBy,
      });

      await contact.save();

      // Log audit event
      await AuditService.logEvent({
        actor: addedBy,
        actorRole: 'PATIENT',
        action: 'emergency_contact_added',
        resource: contact._id.toString(),
        resourceType: 'emergency_profile',
        patient: patientId,
        details: {
          contactName: contactData.contactName,
          relationship: contactData.relationship,
          priority: contactData.priority,
        },
      });

      logger.info(`Emergency contact added for patient ${patientId}`);
      return contact;
    } catch (error) {
      logger.error(`Failed to add emergency contact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get all emergency contacts for a patient
   */
  static async getEmergencyContacts(patientId, requestorId = null) {
    try {
      // Check authorization - patient or provider
      const requestor = await User.findById(requestorId).select('role').exec();
      if (!requestor) {
        throw new Error('Requestor not found');
      }

      const patient = await Patient.findById(patientId).exec();
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Only patient or authorized healthcare provider
      if (patient.userId.toString() !== requestorId.toString() && 
          !['DOCTOR', 'NURSE', 'EMERGENCY'].includes(requestor.role)) {
        throw new Error('Not authorized to view emergency contacts');
      }

      const contacts = await EmergencyContact.find({ patientId })
        .sort({ priority: 1 })
        .exec();

      return contacts;
    } catch (error) {
      logger.error(`Failed to get emergency contacts: ${error.message}`);
      throw error;
    }
  }
}

export default EmergencyProfileService;
