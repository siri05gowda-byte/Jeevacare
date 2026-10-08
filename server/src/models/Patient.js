import mongoose from 'mongoose';
import { generateJeevaId } from '../utils/jeevaIdGenerator.js';

const patientSchema = new mongoose.Schema(
  {
    // Unique JeevaCare Identity
    jeevaId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Link to User account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      sparse: true,
    },

    // Personal Identity (permanent, not overwritten by clinical observations)
    personalIdentity: {
      firstName: {
        type: String,
        required: true,
      },
      lastName: {
        type: String,
        required: true,
      },
      dateOfBirth: {
        type: Date,
        required: true,
      },
      sex: {
        type: String,
        enum: ['M', 'F', 'O', 'Prefer not to say'],
        required: true,
      },
      phone: String,
      email: String,
    },

    // Birth Information (stored as historical observation, not modified)
    birthInformation: {
      placeOfBirth: String,
      timeOfBirth: String,
      birthWeight: {
        value: Number,
        unit: { type: String, default: 'kg' },
      },
      birthLength: {
        value: Number,
        unit: { type: String, default: 'cm' },
      },
      headCircumference: {
        value: Number,
        unit: { type: String, default: 'cm' },
      },
      recordedAt: Date,
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      facility: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
      },
    },

    // Blood Group - with source tracking and verification status
    bloodGroup: {
      group: {
        type: String,
        enum: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'Unknown'],
      },
      source: {
        type: String,
        enum: ['patient_reported', 'provider_verified', 'birth_record', 'lab_test', 'unknown'],
        default: 'patient_reported',
      },
      verificationStatus: {
        type: String,
        enum: ['unverified', 'pending_review', 'verified', 'conflicting', 'restricted'],
        default: 'unverified',
      },
      recordedAt: Date,
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      notes: String,
    },

    // Identity Verification
    identityVerification: {
      status: {
        type: String,
        enum: ['unverified', 'pending', 'verified', 'rejected'],
        default: 'unverified',
      },
      method: String, // e.g., 'aadhar', 'voter_id', 'passport', 'self_declared', 'demo'
      verificationDocumentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
    },

    // Guardian Relationships
    guardianRelationships: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'GuardianRelationship',
      },
    ],

    // Parent Information
    parents: {
      mother: {
        name: String,
        jeevaId: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
      father: {
        name: String,
        jeevaId: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    },

    // Patient Status
    status: {
      type: String,
      enum: ['active', 'suspended', 'deleted'],
      default: 'active',
    },

    // Current Emergency Profile (reference to separate document)
    emergencyProfileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmergencyProfile',
    },

    // Facilities where patient is registered
    facilities: [
      {
        facilityId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Hospital',
        },
        registeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Audit Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    duplicateFlagged: {
      type: Boolean,
      default: false,
    },

    duplicatePotentialMatches: [
      {
        matchedPatientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Patient',
        },
        matchScore: Number,
        flaggedAt: Date,
        flaggedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        status: {
          type: String,
          enum: ['pending', 'confirmed_duplicate', 'false_positive'],
        },
      },
    ],

    // Patient Preferences
    preferences: {
      language: {
        type: String,
        enum: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
        default: 'en',
      },
      audioEnabled: {
        type: Boolean,
        default: false,
      },
      communicationPreference: {
        type: String,
        enum: ['email', 'sms', 'both', 'none'],
        default: 'both',
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      { jeevaId: 1 },
      { userId: 1 },
      { 'personalIdentity.dateOfBirth': 1 },
      { status: 1 },
      { duplicateFlagged: 1 },
      { createdAt: -1 },
    ],
  }
);

// Generate JeevaId before saving
patientSchema.pre('save', async function (next) {
  if (!this.jeevaId) {
    try {
      this.jeevaId = await generateJeevaId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Patient = mongoose.models.Patient || mongoose.model('Patient', patientSchema);
export default Patient;

