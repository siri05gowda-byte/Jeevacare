import mongoose from 'mongoose';

const emergencyContactSchema = new mongoose.Schema(
  {
    // Link to emergency profile
    emergencyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyProfile',
      required: true,
      index: true,
    },

    // Link to patient
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Contact Information
    contactName: {
      type: String,
      required: true,
    },

    relationship: {
      type: String,
      enum: [
        'spouse',
        'parent',
        'sibling',
        'child',
        'grandparent',
        'friend',
        'colleague',
        'other_family',
        'other',
      ],
      required: true,
    },

    // Contact Method (multiple allowed)
    contactMethods: [
      {
        type: {
          type: String,
          enum: ['phone', 'email', 'whatsapp', 'sms'],
        },
        value: String,
        primary: {
          type: Boolean,
          default: false,
        },
        verified: {
          type: Boolean,
          default: false,
        },
        verifiedAt: Date,
      },
    ],

    // Priority (for emergency responders to know who to contact first)
    priority: {
      type: Number,
      min: 1,
      max: 5,
      default: 3, // 1 = highest priority, 5 = lowest
    },

    // Authorization Status
    authorizationStatus: {
      type: String,
      enum: ['active', 'pending', 'inactive', 'revoked'],
      default: 'pending',
    },

    // Consent/Authorization
    consentGiven: {
      type: Boolean,
      default: false,
    },

    consentGivenAt: Date,

    consentGivenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // What information can this contact access
    informationAccess: {
      emergencyAlerts: {
        type: Boolean,
        default: false,
      },
      basicMedicalInfo: {
        type: Boolean,
        default: false,
      },
      contactNotification: {
        type: Boolean,
        default: true,
      },
    },

    // Note: Emergency contacts do NOT automatically receive clinical access
    // Clinical access requires explicit, separate authorization workflow
    clinicalAccess: {
      type: Boolean,
      default: false,
    },

    clinicalAccessAuthorizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    clinicalAccessAuthorizedAt: Date,

    // JeevaCare ID if the contact is also a patient
    linkedUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },

    linkedPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      sparse: true,
    },

    // Notes about this contact
    notes: String,

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
      index: true,
    },

    // Audit
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedAt: Date,

    // Last time this contact was notified
    lastNotifiedAt: Date,

    // Last time this contact accessed information (if applicable)
    lastAccessAt: Date,
  },
  {
    timestamps: false,
    indexes: [
      { emergencyProfileId: 1, priority: 1 },
      { patientId: 1 },
      { authorizationStatus: 1 },
      { status: 1 },
      { 'contactMethods.value': 1 },
      { lastModifiedAt: -1 },
    ],
  }
);

const EmergencyContact = mongoose.model('EmergencyContact', emergencyContactSchema);
export default EmergencyContact;
