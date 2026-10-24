import RadiologyRecord from '../models/RadiologyRecord.js';
import Patient from '../models/Patient.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import AuditService from './AuditService.js';

class RadiologyService {
  /**
   * Create a radiology record
   * @param {Object} radiologyData
   * @param {Object} requestingUser
   * @returns {Object} Radiology record
   */
  static async createRadiologyRecord(radiologyData, requestingUser, options = {}) {
    try {
      const isPatientUpload = options.isPatientUpload || (options.allowPatientUpload && requestingUser.role === 'PATIENT');

      // Only authorized healthcare professionals can create official records (unless patient upload workflow)
      if (!isPatientUpload && !['DOCTOR', 'RADIOLOGY_TECHNICIAN'].includes(requestingUser.role)) {
        throw new Error('Only doctors and radiology technicians can create radiology records');
      }

      // Get patient
      const patient = await Patient.findById(radiologyData.patientId);
      if (!patient) {
        throw new Error(`Patient not found: ${radiologyData.patientId}`);
      }

      // Verify authorization
      if (isPatientUpload && requestingUser.role === 'PATIENT') {
        if (patient.userId && patient.userId.toString() !== requestingUser._id.toString()) {
          throw new Error('Patients can only upload radiology records for themselves');
        }
      } else if (!isPatientUpload) {
        const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          radiologyData.hospitalId,
          patient._id
        );

        if (!authorized) {
          throw new Error('Not authorized to create radiology records at this facility');
        }
      }

      // Normalize modalityType to lowercase enum
      const rawModality = (radiologyData.modalityType || 'other').toLowerCase();
      const validModalities = ['x_ray', 'ct_scan', 'mri', 'ultrasound', 'pet_scan', 'dexa_scan', 'other'];
      const modalityType = validModalities.includes(rawModality) ? rawModality : 'other';

      const verificationStatus = isPatientUpload ? 'patient_uploaded' : 'provider_verified';

      // Create radiology record
      const radiologyRecord = new RadiologyRecord({
        patientId: patient._id,
        encounterId: radiologyData.encounterId,
        studyDate: new Date(radiologyData.studyDate),
        reportDate: new Date(radiologyData.reportDate),
        modalityType,
        bodyPart: radiologyData.bodyPart,
        clinicalIndication: radiologyData.clinicalIndication,
        findings: radiologyData.findings || '',
        impression: radiologyData.impression || '',
        recommendation: radiologyData.recommendation || '',
        radiologistName: radiologyData.radiologistName,
        radiologistLicense: radiologyData.radiologistLicense,
        facilityId: radiologyData.hospitalId || (patient.facilities && patient.facilities[0]?.facilityId) || undefined,
        providerId: isPatientUpload ? undefined : requestingUser._id,
        imageReference: radiologyData.imageReference,
        verificationStatus,
        createdBy: requestingUser._id,
      });

      // Check if critical findings mentioned
      if (radiologyData.impression && this._hasCriticalIndicators(radiologyData.impression)) {
        radiologyRecord.hasCriticalFindings = true;
      }

      await radiologyRecord.save();

      // Audit event
      await AuditService.logEvent({
        action: 'radiology_record_created',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: radiologyRecord._id,
        resourceType: 'radiology',
        patient: patient._id,
        hospital: radiologyData.hospitalId,
        status: 'success',
        details: {
          modalityType,
          bodyPart: radiologyData.bodyPart,
          hasCriticalFindings: radiologyRecord.hasCriticalFindings,
          verificationStatus,
        },
      });

      return radiologyRecord;
    } catch (error) {
      throw new Error(`Failed to create radiology record: ${error.message}`);
    }
  }

  /**
   * Get a radiology record
   * @param {String} radiologyId
   * @param {Object} requestingUser
   * @returns {Object} Radiology record
   */
  static async getRadiologyRecord(radiologyId, requestingUser) {
    try {
      const radiologyRecord = await RadiologyRecord.findById(radiologyId)
        .populate('patientId', 'jeevaId personalIdentity')
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .populate('linkedDocuments');

      if (!radiologyRecord) {
        throw new Error(`Radiology record not found: ${radiologyId}`);
      }

      const targetPatientId = radiologyRecord.patientId?._id || radiologyRecord.patientId;
      const patient = await Patient.findById(targetPatientId);

      // Authorization: patient can view their own, professional can view if authorized
      if (requestingUser.role === 'PATIENT') {
        if (requestingUser._id.toString() !== patient.userId.toString()) {
          throw new Error('Patients can only view their own radiology records');
        }
      } else if (requestingUser.role !== 'SYSTEM_ADMIN' && requestingUser.role !== 'HOSPITAL_ADMIN') {
        const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
          requestingUser._id,
          radiologyRecord.facilityId,
          patient._id
        );
        if (!authorized) {
          throw new Error('Not authorized to view this radiology record');
        }
      }

      // Log access
      await AuditService.logEvent({
        action: 'radiology_record_accessed',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: radiologyRecord._id,
        resourceType: 'radiology',
        patient: patient._id,
        hospital: radiologyRecord.facilityId,
        status: 'success',
      });

      return radiologyRecord;
    } catch (error) {
      throw new Error(`Failed to get radiology record: ${error.message}`);
    }
  }

  /**
   * Get patient radiology records
   * @param {String} patientId
   * @param {Object} requestingUser
   * @param {Object} filters - optional filters
   * @returns {Array} Radiology records
   */
  static async getPatientRadiologyRecords(patientId, requestingUser, filters = {}) {
    try {
      let patient = await Patient.findById(patientId);
      if (!patient) {
        patient = await Patient.findOne({ userId: patientId });
      }
      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      const resolvedPatientId = patient._id;

      // Authorization
      if (requestingUser.role === 'PATIENT' && requestingUser._id.toString() !== patient.userId.toString()) {
        throw new Error('Patients can only view their own radiology records');
      }

      // For healthcare professionals, check authorization
      if (requestingUser.role !== 'PATIENT' && requestingUser.role !== 'SYSTEM_ADMIN' && requestingUser.role !== 'HOSPITAL_ADMIN') {
        if (requestingUser.facilityId) {
          const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
            requestingUser._id,
            requestingUser.facilityId,
            resolvedPatientId
          );
          if (!authorized) {
            throw new Error('Not authorized to view patient radiology records');
          }
        }
      }

      const query = { patientId: resolvedPatientId };

      if (filters.modalityType) {
        query.modalityType = filters.modalityType;
      }

      if (filters.bodyPart) {
        query.bodyPart = new RegExp(filters.bodyPart, 'i');
      }

      if (filters.hasCriticalFindings !== undefined) {
        query.hasCriticalFindings = filters.hasCriticalFindings;
      }

      if (filters.dateFrom || filters.dateTo) {
        query.studyDate = {};
        if (filters.dateFrom) {
          query.studyDate.$gte = new Date(filters.dateFrom);
        }
        if (filters.dateTo) {
          query.studyDate.$lte = new Date(filters.dateTo);
        }
      }

      const records = await RadiologyRecord.find(query)
        .populate('providerId', 'email profile.firstName profile.lastName')
        .populate('facilityId', 'name facilityId')
        .sort({ studyDate: -1 });

      return records;
    } catch (error) {
      throw new Error(`Failed to get patient radiology records: ${error.message}`);
    }
  }

  /**
   * Update radiology record (amendment workflow)
   * @param {String} radiologyId
   * @param {Object} updateData
   * @param {Object} requestingUser
   * @returns {Object} New amended radiology record
   */
  static async updateRadiologyRecord(radiologyId, updateData, requestingUser) {
    try {
      const originalRecord = await RadiologyRecord.findById(radiologyId);
      if (!originalRecord) {
        throw new Error(`Radiology record not found: ${radiologyId}`);
      }

      // Authorization: only doctors or radiology technicians at authorized facility
      if (!['DOCTOR', 'RADIOLOGY_TECHNICIAN'].includes(requestingUser.role)) {
        throw new Error('Only doctors and radiology technicians can update radiology records');
      }

      const { authorized } = await ClinicalAuthorizationBoundary.canCreateOfficialClinicalRecord(
        requestingUser._id,
        originalRecord.facilityId,
        originalRecord.patientId
      );

      if (!authorized) {
        throw new Error('Not authorized to update radiology records at this facility');
      }

      // Create amendment record
      const amendedRecord = new RadiologyRecord({
        patientId: originalRecord.patientId,
        encounterId: originalRecord.encounterId,
        studyDate: updateData.studyDate ? new Date(updateData.studyDate) : originalRecord.studyDate,
        reportDate: updateData.reportDate ? new Date(updateData.reportDate) : originalRecord.reportDate,
        modalityType: updateData.modalityType || originalRecord.modalityType,
        bodyPart: updateData.bodyPart || originalRecord.bodyPart,
        clinicalIndication: updateData.clinicalIndication || originalRecord.clinicalIndication,
        findings: updateData.findings || originalRecord.findings,
        impression: updateData.impression || originalRecord.impression,
        recommendation: updateData.recommendation || originalRecord.recommendation,
        radiologistName: updateData.radiologistName || originalRecord.radiologistName,
        radiologistLicense: updateData.radiologistLicense || originalRecord.radiologistLicense,
        facilityId: originalRecord.facilityId,
        providerId: requestingUser._id,
        imageReference: originalRecord.imageReference,
        verificationStatus: 'amended',
        createdBy: requestingUser._id,
        amendmentHistory: [
          {
            originalRadiologyId: originalRecord._id,
            amendedAt: new Date(),
            amendedBy: requestingUser._id,
            reason: updateData.reason || 'Record corrected',
            previousData: {
              findings: originalRecord.findings,
              impression: originalRecord.impression,
            },
          },
        ],
      });

      // Check if critical findings
      if (amendedRecord.impression && this._hasCriticalIndicators(amendedRecord.impression)) {
        amendedRecord.hasCriticalFindings = true;
      }

      await amendedRecord.save();

      // Audit event
      await AuditService.logEvent({
        action: 'radiology_record_amended',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: amendedRecord._id,
        resourceType: 'radiology',
        patient: originalRecord.patientId,
        hospital: originalRecord.facilityId,
        status: 'success',
        details: {
          originalRecordId: originalRecord._id,
          reason: updateData.reason,
          hasCriticalFindings: amendedRecord.hasCriticalFindings,
        },
      });

      return amendedRecord;
    } catch (error) {
      throw new Error(`Failed to update radiology record: ${error.message}`);
    }
  }

  /**
   * Flag radiology record as having critical findings
   * @param {String} radiologyId
   * @param {Object} flagData - {findings}
   * @param {Object} requestingUser
   * @returns {Object} Updated radiology record
   */
  static async flagAsCritical(radiologyId, flagData, requestingUser) {
    try {
      if (!['DOCTOR', 'HOSPITAL_ADMIN'].includes(requestingUser.role)) {
        throw new Error('Only doctors and admins can flag radiology records');
      }

      const radiologyRecord = await RadiologyRecord.findByIdAndUpdate(
        radiologyId,
        {
          hasCriticalFindings: true,
          criticalFlag: {
            flaggedAt: new Date(),
            flaggedBy: requestingUser._id,
            findings: flagData.findings,
          },
        },
        { new: true }
      );

      if (!radiologyRecord) {
        throw new Error(`Radiology record not found: ${radiologyId}`);
      }

      // Audit event
      await AuditService.logEvent({
        action: 'radiology_record_flagged_critical',
        actor: requestingUser._id,
        actorRole: requestingUser.role,
        resource: radiologyRecord._id,
        resourceType: 'radiology',
        patient: radiologyRecord.patientId,
        hospital: radiologyRecord.facilityId,
        status: 'success',
        details: { findings: flagData.findings },
        sensitivityLevel: 'high',
      });

      return radiologyRecord;
    } catch (error) {
      throw new Error(`Failed to flag radiology record as critical: ${error.message}`);
    }
  }

  /**
   * Helper: Check if impression text contains critical indicators
   * @private
   */
  static _hasCriticalIndicators(impression) {
    const criticalKeywords = [
      'mass',
      'tumor',
      'fracture',
      'bleeding',
      'hemorrhage',
      'pneumothorax',
      'pulmonary embolism',
      'stroke',
      'urgent',
      'emergent',
      'acute',
    ];

    const lowerImpr = impression.toLowerCase();
    return criticalKeywords.some(keyword => lowerImpr.includes(keyword));
  }
}

export default RadiologyService;
