/**
 * PatientService
 * Handles all patient-related business logic including:
 * - Patient creation and profile management
 * - Duplicate detection
 * - Safe patient matching
 * - Identity verification
 */

import Patient from '../models/Patient.js';
import User from '../models/User.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

class PatientService {
  /**
   * Create a new patient profile
   * Called after user registration with PATIENT role
   */
  static async createPatient({
    userId,
    personalIdentity,
    birthInformation = null,
    parentInformation = null,
    createdBy = null,
  }) {
    try {
      // Verify user exists
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Check if patient already exists for this user
      const existingPatient = await Patient.findOne({ userId });
      if (existingPatient) {
        throw new Error('Patient profile already exists for this user');
      }

      // Validate required personal identity fields
      if (!personalIdentity.firstName || !personalIdentity.lastName || !personalIdentity.dateOfBirth || !personalIdentity.sex) {
        throw new Error('Missing required identity fields: firstName, lastName, dateOfBirth, sex');
      }

      // Create new patient
      const patient = new Patient({
        userId,
        personalIdentity,
        birthInformation,
        parents: parentInformation,
        createdBy,
        status: 'active',
      });

      // Save - this will trigger the pre-save hook to generate jeevaId
      await patient.save();

      // Log audit event
      await AuditService.logEvent({
        actor: createdBy,
        actorRole: 'SYSTEM',
        action: 'patient_registration',
        resource: patient._id.toString(),
        resourceType: 'patient',
        patient: patient._id,
        details: {
          personalIdentity: {
            name: `${personalIdentity.firstName} ${personalIdentity.lastName}`,
            dateOfBirth: personalIdentity.dateOfBirth,
            sex: personalIdentity.sex,
          },
        },
      });

      logger.info(`Patient created: ${patient.jeevaId} for user ${userId}`);
      return patient;
    } catch (error) {
      logger.error(`Failed to create patient: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get patient profile by ID
   */
  static async getPatientById(patientId) {
    try {
      const patient = await Patient.findById(patientId)
        .populate('userId', 'email profile phone verificationStatus')
        .populate('guardianRelationships')
        .populate('createdBy', 'email profile.firstName profile.lastName')
        .exec();

      if (!patient) {
        throw new Error('Patient not found');
      }

      return patient;
    } catch (error) {
      logger.error(`Failed to get patient: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get patient profile by JeevaId
   * Used for emergency access, patient lookup, etc.
   */
  static async getPatientByJeevaId(jeevaId) {
    try {
      const patient = await Patient.findOne({ jeevaId })
        .populate('userId', 'email profile phone')
        .populate('guardianRelationships')
        .exec();

      if (!patient) {
        throw new Error(`Patient not found with JeevaId: ${jeevaId}`);
      }

      return patient;
    } catch (error) {
      logger.error(`Failed to get patient by JeevaId: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get patient profile by userId
   */
  static async getPatientByUserId(userId) {
    try {
      const patient = await Patient.findOne({ userId })
        .populate('userId', 'email profile phone')
        .populate('guardianRelationships')
        .exec();

      if (!patient) {
        throw new Error('Patient profile not found for user');
      }

      return patient;
    } catch (error) {
      logger.error(`Failed to get patient by userId: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update patient profile (careful - should not overwrite permanent identity)
   */
  static async updatePatientProfile(patientId, updateData, updatedBy = null) {
    try {
      // Only allow updating specific fields
      const allowedUpdates = {
        'personalIdentity.phone': true,
        'personalIdentity.email': true,
        'preferences': true,
        'emergencyProfileId': true,
      };

      // Validate that only allowed fields are being updated
      for (const key of Object.keys(updateData)) {
        if (!allowedUpdates[key] && !key.startsWith('preferences.')) {
          throw new Error(`Cannot update field: ${key}`);
        }
      }

      // Cannot update DOB, sex, firstName, lastName (permanent identity)
      if (updateData.personalIdentity?.dateOfBirth ||
          updateData.personalIdentity?.sex ||
          updateData.personalIdentity?.firstName ||
          updateData.personalIdentity?.lastName) {
        throw new Error('Cannot update permanent identity fields (DOB, sex, name)');
      }

      const patient = await Patient.findByIdAndUpdate(
        patientId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!patient) {
        throw new Error('Patient not found');
      }

      // Log audit event
      await AuditService.logEvent({
        actor: updatedBy,
        actorRole: 'PATIENT',
        action: 'patient_profile_updated',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        details: {
          updatedFields: Object.keys(updateData),
        },
      });

      logger.info(`Patient profile updated: ${patient.jeevaId}`);
      return patient;
    } catch (error) {
      logger.error(`Failed to update patient profile: ${error.message}`);
      throw error;
    }
  }

  /**
   * Detect potential duplicate patients
   * Uses: name similarity, DOB matching, phone number matching
   */
  static async detectDuplicates(firstName, lastName, dateOfBirth, phone = null) {
    try {
      const candidates = [];

      // Exact date of birth + first name match
      const exactDOBMatches = await Patient.find({
        'personalIdentity.dateOfBirth': new Date(dateOfBirth),
        'personalIdentity.firstName': new RegExp(`^${firstName}`, 'i'),
      });

      candidates.push(...exactDOBMatches.map((p, idx) => ({
        patientId: p._id,
        matchScore: 95,
        matchType: 'exact_dob_firstname',
        patient: p,
        index: idx,
      })));

      // Exact name + phone match
      if (phone) {
        const phoneMatches = await Patient.find({
          'personalIdentity.phone': phone,
          'personalIdentity.firstName': firstName,
          'personalIdentity.lastName': lastName,
        });

        candidates.push(...phoneMatches.map((p, idx) => ({
          patientId: p._id,
          matchScore: 90,
          matchType: 'exact_name_phone',
          patient: p,
          index: idx,
        })));
      }

      // Fuzzy name + DOB match
      const nameDOBMatches = await Patient.find({
        'personalIdentity.dateOfBirth': new Date(dateOfBirth),
      });

      const fuzzyMatches = nameDOBMatches
        .filter(p => this._calculateNameSimilarity(
          `${p.personalIdentity.firstName} ${p.personalIdentity.lastName}`,
          `${firstName} ${lastName}`
        ) > 0.7)
        .map((p, idx) => ({
          patientId: p._id,
          matchScore: this._calculateNameSimilarity(
            `${p.personalIdentity.firstName} ${p.personalIdentity.lastName}`,
            `${firstName} ${lastName}`
          ) * 100,
          matchType: 'fuzzy_name_dob',
          patient: p,
          index: idx,
        }));

      candidates.push(...fuzzyMatches);

      // Remove duplicates (same patient matched multiple ways) and sort by score
      const uniqueCandidates = Array.from(
        new Map(candidates.map(c => [c.patientId.toString(), c])).values()
      ).sort((a, b) => b.matchScore - a.matchScore);

      return uniqueCandidates;
    } catch (error) {
      logger.error(`Failed to detect duplicates: ${error.message}`);
      return [];
    }
  }

  /**
   * Calculate string similarity using Levenshtein distance
   * Returns a score between 0 and 1
   */
  static _calculateNameSimilarity(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;

    if (longer.length === 0) return 1.0;

    const editDistance = this._levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Calculate Levenshtein distance between two strings
   */
  static _levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  /**
   * Flag potential duplicates for review
   * Does NOT automatically merge
   */
  static async flagDuplicates(patientId, duplicateCandidates, flaggedBy = null) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Only flag if not already flagged
      if (patient.duplicateFlagged) {
        return patient;
      }

      // Update with duplicate matches
      const matches = duplicateCandidates.map(dup => ({
        matchedPatientId: dup.patientId,
        matchScore: Math.round(dup.matchScore),
        flaggedAt: new Date(),
        flaggedBy,
        status: 'pending',
      }));

      patient.duplicateFlagged = true;
      patient.duplicatePotentialMatches = matches;
      await patient.save();

      // Log audit event
      await AuditService.logEvent({
        actor: flaggedBy,
        actorRole: 'SYSTEM',
        action: 'patient_duplicate_flagged',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        details: {
          matchCount: matches.length,
          topMatch: matches.length > 0 ? matches[0].matchScore : 0,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Patient ${patientId} flagged as potential duplicate with ${matches.length} candidates`);
      return patient;
    } catch (error) {
      logger.error(`Failed to flag duplicates: ${error.message}`);
      throw error;
    }
  }

  /**
   * Resolve duplicate flag (confirmed duplicate or false positive)
   */
  static async resolveDuplicate(patientId, resolution, resolvedBy = null) {
    try {
      // resolution should be: { type: 'confirmed_duplicate' | 'false_positive', linkedPatientId?: id }

      if (!['confirmed_duplicate', 'false_positive'].includes(resolution.type)) {
        throw new Error('Invalid resolution type');
      }

      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Update all potential matches with the resolution
      patient.duplicatePotentialMatches.forEach(match => {
        if (!resolution.linkedPatientId || match.matchedPatientId.equals(resolution.linkedPatientId)) {
          match.status = resolution.type;
        }
      });

      patient.duplicateFlagged = false;
      await patient.save();

      // Log audit event
      await AuditService.logEvent({
        actor: resolvedBy,
        actorRole: 'SYSTEM',
        action: 'patient_duplicate_resolved',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        details: {
          resolution: resolution.type,
          linkedPatient: resolution.linkedPatientId,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Patient duplicate resolved: ${patientId} (${resolution.type})`);
      return patient;
    } catch (error) {
      logger.error(`Failed to resolve duplicate: ${error.message}`);
      throw error;
    }
  }

  /**
   * Search patients (by name, JeevaId, email, phone)
   * Used by hospital staff to find patients
   */
  static async searchPatients(query, options = {}) {
    try {
      const page = options.page || 1;
      const limit = options.limit || 10;
      const skip = (page - 1) * limit;

      let filter = {};

      // Search by JeevaId
      if (query.match(/^JJ\d{2}-[A-Z0-9]{5}$/i)) {
        filter.jeevaId = query.toUpperCase();
      }
      // Search by name
      else if (query.length > 0) {
        filter.$or = [
          { 'personalIdentity.firstName': new RegExp(query, 'i') },
          { 'personalIdentity.lastName': new RegExp(query, 'i') },
          { 'personalIdentity.phone': new RegExp(query) },
        ];
      }

      // Only return active patients
      filter.status = 'active';

      const patients = await Patient.find(filter)
        .select('jeevaId personalIdentity identityVerification status createdAt')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 })
        .exec();

      const total = await Patient.countDocuments(filter);

      return {
        patients,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      };
    } catch (error) {
      logger.error(`Failed to search patients: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update identity verification status
   */
  static async updateIdentityVerification(patientId, verificationData, verifiedBy = null) {
    try {
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      if (!['unverified', 'pending', 'verified', 'rejected'].includes(verificationData.status)) {
        throw new Error('Invalid verification status');
      }

      patient.identityVerification = {
        ...patient.identityVerification,
        ...verificationData,
        verifiedBy,
        verifiedAt: verificationData.status === 'verified' ? new Date() : patient.identityVerification.verifiedAt,
      };

      await patient.save();

      // Log audit event
      await AuditService.logEvent({
        actor: verifiedBy,
        actorRole: 'SYSTEM',
        action: 'patient_identity_verified',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        details: {
          status: verificationData.status,
          method: verificationData.method,
        },
        sensitivityLevel: 'high',
      });

      logger.info(`Patient identity verification updated: ${patient.jeevaId} -> ${verificationData.status}`);
      return patient;
    } catch (error) {
      logger.error(`Failed to update identity verification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Check if patient exists
   */
  static async patientExists(identifier) {
    try {
      let patient;

      if (identifier.match(/^JJ\d{2}-[A-Z0-9]{5}$/i)) {
        patient = await Patient.findOne({ jeevaId: identifier.toUpperCase() });
      } else if (identifier.includes('@')) {
        const user = await User.findOne({ email: identifier });
        if (user) {
          patient = await Patient.findOne({ userId: user._id });
        }
      } else {
        patient = await Patient.findById(identifier);
      }

      return !!patient;
    } catch (error) {
      logger.error(`Failed to check if patient exists: ${error.message}`);
      return false;
    }
  }
}

export default PatientService;
