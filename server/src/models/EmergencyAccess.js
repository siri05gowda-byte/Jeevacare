import mongoose from 'mongoose';

const emergencyAccessSchema = new mongoose.Schema(
  {
    // Unique emergency access identifier
    accessId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Patient being accessed
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Healthcare professional requesting access
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    professionalRole: {
      type: String,
      enum: ['DOCTOR', 'NURSE', 'PARAMEDIC', 'EMERGENCY', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN'],
      required: true,
    },

    // Facility context
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      sparse: true,
    },

    facilityName: String,

    // Access Request Details
    accessReason: {
      type: String,
      enum: [
        'unconscious_patient',
        'accident',
        'acute_medical_emergency',
        'unable_to_provide_history',
        'critical_condition',
        'emergency_surgery_required',
        'severe_trauma',
        'drug_reaction',
        'other_emergency',
      ],
      required: true,
    },

    reasonDescription: {
      type: String,
      maxlength: 1000,
    },

    // Access Levels
    accessLevel: {
      type: String,
      enum: ['critical_alerts_only', 'emergency_profile', 'limited_history', 'full_history'],
      default: 'emergency_profile',
    },

    // Specific access permissions granted
    permissions: {
      viewCriticalAlerts: {
        type: Boolean,
        default: true,
      },
      viewAllergies: {
        type: Boolean,
        default: true,
      },
      viewMedications: {
        type: Boolean,
        default: true,
      },
      viewBloodGroup: {
        type: Boolean,
        default: true,
      },
      viewCriticalConditions: {
        type: Boolean,
        default: true,
      },
      viewSurgeryHistory: {
        type: Boolean,
        default: true,
      },
      viewRecentHospitalizations: {
        type: Boolean,
        default: false,
      },
      viewFullMedicalHistory: {
        type: Boolean,
        default: false,
      },
      addEmergencyNotes: {
        type: Boolean,
        default: false,
      },
    },

    // Authorization Status
    authorizationStatus: {
      type: String,
      enum: ['requested', 'authorized', 'denied', 'expired', 'revoked'],
      default: 'requested',
      index: true,
    },

    authorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },

    authorizationReason: String,

    authorizationDateTime: Date,

    // Access Window (time-limited)
    requestDateTime: {
      type: Date,
      default: Date.now,
      index: true,
    },

    accessGrantedDateTime: Date,

    accessExpirationDateTime: Date,

    // Configurable access duration (in minutes)
    accessDurationMinutes: {
      type: Number,
      default: 60, // 1 hour default
    },

    // Actual Access Events
    accessEvents: [
      {
        accessDateTime: Date,
        dataAccessed: String,
        ipAddress: String,
        userAgent: String,
      },
    ],

    // Notes from accessing professional
    emergencyNotes: {
      type: String,
      maxlength: 2000,
    },

    // Related Emergency Incident
    emergencyIncidentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyIncident',
      sparse: true,
    },

    // Related Clinical Encounter
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
      sparse: true,
    },

    // Source of access (which system/device)
    accessSource: {
      type: String,
      enum: ['emergency_dashboard', 'mobile_app', 'api', 'kiosk', 'other'],
      default: 'emergency_dashboard',
    },

    // Network info
    accessIpAddress: String,

    accessUserAgent: String,

    // Patient Notification
    patientNotified: {
      type: Boolean,
      default: false,
    },

    patientNotificationDateTime: Date,

    patientNotificationMethod: String, // "email", "sms", "dashboard_alert"

    // Approval Chain
    requiresApproval: {
      type: Boolean,
      default: true,
    },

    approvalRequired: {
      role: String,
      facility: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
      },
    },

    // Status and Audit
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },

    closedAt: Date,

    closureReason: String, // "expired", "revoked", "access_completed"

    // Comprehensive audit trail
    auditTrail: [
      {
        action: String,
        timestamp: Date,
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Compliance and Sensitivity
    sensitivityFlags: [String],

    complianceNotes: String,
  },
  {
    timestamps: true,
    indexes: [
      { accessId: 1 },
      { patientId: 1, authorizationStatus: 1 },
      { professionalId: 1, requestDateTime: -1 },
      { authorizationStatus: 1 },
      { accessExpirationDateTime: 1 },
      { requestDateTime: -1 },
      { facilityId: 1 },
      { status: 1 },
    ],
  }
);

// Generate access ID before saving
emergencyAccessSchema.pre('save', async function (next) {
  if (!this.accessId) {
    // Format: EA-YYYY-MM-DD-HH-XXXXX
    const now = new Date();
    const timestamp = now.toISOString().replace(/[^0-9]/g, '').substring(0, 12);
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.accessId = `EA-${timestamp}-${random}`;
  }

  // If access is authorized, set expiration time
  if (this.authorizationStatus === 'authorized' && !this.accessExpirationDateTime) {
    const duration = this.accessDurationMinutes || 60;
    this.accessExpirationDateTime = new Date(
      (this.accessGrantedDateTime || Date.now()) + duration * 60 * 1000
    );
  }

  next();
});

const EmergencyAccess = mongoose.model('EmergencyAccess', emergencyAccessSchema);
export default EmergencyAccess;
