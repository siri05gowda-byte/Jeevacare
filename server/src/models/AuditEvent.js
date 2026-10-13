import mongoose from 'mongoose';

const auditEventSchema = new mongoose.Schema(
  {
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    actorRole: {
      type: String,
      enum: [
        'PATIENT',
        'GUARDIAN',
        'DOCTOR',
        'NURSE',
        'LAB_TECHNICIAN',
        'RADIOLOGY_TECHNICIAN',
        'PHARMACIST',
        'RECEPTION_STAFF',
        'HOSPITAL_ADMIN',
        'EMERGENCY',
        'SYSTEM_ADMIN',
        'SYSTEM',
      ],
    },

    action: {
      type: String,
      enum: [
        'login',
        'logout',
        'failed_login',
        'registration',
        'password_change',
        'password_reset',
        'patient_profile_created',
        'patient_identity_verification',
        'patient_record_accessed',
        'patient_record_created',
        'patient_record_updated',
        'patient_record_amended',
        'patient_profile_updated',
        'clinical_record_created',
        'clinical_record_verified',
        'clinical_record_amended',
        'clinical_record_accessed',
        'document_uploaded',
        'document_verified',
        'document_accessed',
        'document_downloaded',
        'document_deleted',
        'document_correction',
        'quality_assessment',
        'ocr_processing',
        'ocr_protection_enforcement',
        'duplicate_document_detected',
        'appointment_created',
        'appointment_cancelled',
        'appointment_rescheduled',
        'appointment_checkin',
        'appointment_status_updated',
        'token_assigned',
        'token_moved_to_waiting',
        'token_called_for_consultation',
        'consultation_completed',
        'correction_requested',
        'encounter_created',
        'encounter_updated',
        'emergency_access_requested',
        'emergency_access_granted',
        'emergency_profile_created',
        'emergency_profile_updated',
        'emergency_incident_created',
        'correction_request_created',
        'correction_request_reviewed',
        'ai_summary_generated',
        'ai_summary_accessed',
        'ai_explanation_generated',
        'ai_translation_generated',
        'ai_audio_generated',
        'permission_changed',
        'staff_added',
        'staff_removed',
        'hospital_verification_submitted',
        'hospital_verified',
        'hospital_verification_rejected',
        'hospital_suspended',
        'professional_verification_submitted',
        'professional_verified',
        'professional_rejected',
        'guardian_relationship_created',
        'guardian_relationship_verified',
        'guardian_relationship_terminated',
        'identity_linking_requested',
        'identity_linking_confirmed',
        'api_key_created',
        'api_key_revoked',
        'audit_log_accessed',
        'system_configuration_changed',
        'data_export_requested',
        'data_export_completed',
        // Medical record actions
        'vaccination_record_created',
        'vaccination_record_accessed',
        'vaccination_record_amended',
        'vaccination_record_flagged',
        'laboratory_result_created',
        'laboratory_result_accessed',
        'laboratory_result_amended',
        'laboratory_result_flagged_critical',
        'radiology_record_created',
        'radiology_record_accessed',
        'radiology_record_amended',
        'radiology_record_flagged_critical',
        // Facility RBAC actions
        'FACILITY_ACCESS_BLOCKED_SUSPENDED',
        'FACILITY_ROLE_ACCESS_DENIED',
        'FACILITY_PERMISSION_DENIED',
        'CLINICAL_OPERATION_DENIED_NO_PERMISSION',
        'AUTHORIZATION_REPORT_GENERATED',
        // Guardian and relationship actions
        'guardian_permissions_updated',
        'guardian_relationship_suspended',
        'minor_to_adult_transition_initiated',
        'parent_relationship_created',
        'parent_relationship_verified',
        // Schedule actions
        'schedule_updated',
        'schedule_leave_added',
        // Staff management actions
        'STAFF_ASSOCIATION_REJECTED',
        'STAFF_SUSPENDED',
        'STAFF_REACTIVATED',
        'STAFF_EMPLOYMENT_ENDED',
        // Professional credential actions
        'CREDENTIAL_REJECTED',
        'CREDENTIAL_EXPIRED',
        // Facility registration actions
        'facility_registration_submitted',
        'hospital_registration_submitted',
        'facility_verified',
        'facility_verification_rejected',
        'other',
      ],
      required: true,
      index: true,
    },

    resource: {
      type: String, // ID of what was affected
      index: true,
    },

    resourceType: {
      type: String,
      enum: [
        'patient',
        'user',
        'hospital',
        'encounter',
        'clinical_record',
        'document',
        'appointment',
        'appointment_token',
        'guardian_relationship',
        'emergency_profile',
        'emergency_incident',
        'correction_request',
        'ai_summary',
        'system',
      ],
      index: true,
    },

    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      index: true,
      sparse: true,
    },

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      sparse: true,
    },

    status: {
      type: String,
      enum: ['success', 'failure', 'denied'],
      default: 'success',
    },

    statusMessage: String,

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },

    ipAddress: String,

    userAgent: String,

    // For sensitive operations
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // Sensitivity level determines retention policy
    sensitivityLevel: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },

    // Reference to related audit events
    relatedEvents: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'AuditEvent',
      },
    ],

    // For emergency access tracking
    emergencyAccessReason: String,
    emergencyAccessApprovalCode: String,

    // For policy/compliance
    complianceFlags: [String],
  },
  {
    timestamps: false, // Use custom timestamp field
    indexes: [
      { action: 1, timestamp: -1 },
      { actor: 1, timestamp: -1 },
      { resource: 1, timestamp: -1 },
      { patient: 1, timestamp: -1 },
      { hospital: 1, timestamp: -1 },
      { actorRole: 1 },
      { status: 1 },
      { sensitivityLevel: 1 },
      { timestamp: -1 },
    ],
  }
);

const AuditEvent = mongoose.model('AuditEvent', auditEventSchema);
export default AuditEvent;
