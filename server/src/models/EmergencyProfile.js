import mongoose from 'mongoose';

const emergencyProfileSchema = new mongoose.Schema(
  {
    // Link to patient
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      unique: true,
      index: true,
    },

    // Critical Allergies
    allergies: [
      {
        allergen: {
          type: String,
          required: true,
        },
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe', 'life-threatening'],
          default: 'moderate',
        },
        reaction: String,
        source: {
          type: String,
          enum: ['provider_verified', 'patient_reported', 'uploaded_document', 'pending_review', 'amended'],
          default: 'patient_reported',
        },
        verificationStatus: {
          type: String,
          enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
          default: 'unverified',
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        verifiedAt: Date,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Critical Medical Conditions
    criticalConditions: [
      {
        condition: {
          type: String,
          required: true,
        },
        status: {
          type: String,
          enum: ['active', 'resolved', 'unknown'],
          default: 'active',
        },
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe', 'life-threatening'],
          default: 'moderate',
        },
        onsetDate: Date,
        source: {
          type: String,
          enum: ['provider_verified', 'patient_reported', 'uploaded_document', 'pending_review', 'amended'],
          default: 'patient_reported',
        },
        verificationStatus: {
          type: String,
          enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
          default: 'unverified',
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        verifiedAt: Date,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Current Medications
    currentMedications: [
      {
        medicationName: {
          type: String,
          required: true,
        },
        dosage: String,
        frequency: String,
        indication: String,
        startDate: Date,
        endDate: Date, // null = ongoing
        source: {
          type: String,
          enum: ['provider_verified', 'patient_reported', 'uploaded_document', 'pending_review', 'amended'],
          default: 'patient_reported',
        },
        verificationStatus: {
          type: String,
          enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
          default: 'unverified',
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        verifiedAt: Date,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Important Warnings
    warnings: [
      {
        warning: {
          type: String,
          required: true,
        },
        warningType: {
          type: String,
          enum: ['drug_interaction', 'contraindication', 'genetic', 'behavioral', 'environmental', 'other'],
          default: 'other',
        },
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe', 'life-threatening'],
          default: 'moderate',
        },
        source: {
          type: String,
          enum: ['provider_verified', 'patient_reported', 'uploaded_document', 'pending_review', 'amended'],
          default: 'patient_reported',
        },
        verificationStatus: {
          type: String,
          enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
          default: 'unverified',
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        verifiedAt: Date,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Blood Group (emergency reference)
    bloodGroup: {
      group: {
        type: String,
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'],
      },
      source: {
        type: String,
        enum: ['provider_verified', 'patient_reported', 'uploaded_document', 'pending_review', 'amended'],
        default: 'patient_reported',
      },
      verificationStatus: {
        type: String,
        enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
        default: 'unverified',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      recordedAt: {
        type: Date,
        default: Date.now,
      },
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Major Prior Surgeries
    majorSurgeries: [
      {
        surgeryName: {
          type: String,
          required: true,
        },
        date: Date,
        facility: String,
        surgeon: String,
        complications: String,
        notes: String,
        source: {
          type: String,
          enum: ['provider_verified', 'patient_reported', 'uploaded_document', 'pending_review', 'amended'],
          default: 'patient_reported',
        },
        verificationStatus: {
          type: String,
          enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
          default: 'unverified',
        },
        verifiedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        verifiedAt: Date,
        recordedAt: {
          type: Date,
          default: Date.now,
        },
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Emergency Notes
    emergencyNotes: {
      type: String,
      maxlength: 2000,
    },

    // Provider-verified emergency information
    providerVerifiedNotes: {
      type: String,
      maxlength: 2000,
    },

    // Patient-entered emergency information
    patientDeclaredInformation: {
      type: String,
      maxlength: 2000,
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'archived'],
      default: 'active',
      index: true,
    },

    // Last Updated
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastUpdatedAt: {
      type: Date,
      default: Date.now,
    },

    // Profile Visibility Settings
    visibility: {
      allowEmergencyAccess: {
        type: Boolean,
        default: true,
      },
      allowGuardianAccess: {
        type: Boolean,
        default: false,
      },
      restrictedTo: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Hospital',
        },
      ],
    },
  },
  {
    timestamps: true,
    indexes: [
      { patientId: 1 },
      { status: 1 },
      { lastUpdatedAt: -1 },
      { 'allergies.severity': 1 },
      { 'criticalConditions.severity': 1 },
    ],
  }
);

const EmergencyProfile = mongoose.model('EmergencyProfile', emergencyProfileSchema);
export default EmergencyProfile;
