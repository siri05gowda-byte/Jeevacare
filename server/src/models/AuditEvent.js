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
        'clinical_record_created',
        'clinical_record_verified',
        'clinical_record_amended',
        'clinical_record_accessed',
        'document_uploaded',
        'document_verified',
        'document_accessed',
        'document_deleted',
        'appointment_created',
        'appointment_cancelled',
        'appointment_rescheduled',
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
        'ai_explanation_generated',
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
        'guardian_relationship',
        'emergency_profile',
        'emergency_incident',
        'correction_request',
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
