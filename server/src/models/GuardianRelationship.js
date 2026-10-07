import mongoose from 'mongoose';

const guardianRelationshipSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },

    guardianUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    relationship: {
      type: String,
      enum: ['mother', 'father', 'legal_guardian', 'grandparent', 'uncle', 'aunt', 'sibling', 'other'],
      required: true,
    },

    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending',
    },

    verificationDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    verifiedAt: Date,

    // Temporal Relationship (when guardianship begins/ends)
    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: Date,

    // Permissions granted to guardian
    permissions: {
      viewMedicalRecords: {
        type: Boolean,
        default: true,
      },
      manageMedicalRecords: {
        type: Boolean,
        default: false,
      },
      manageAppointments: {
        type: Boolean,
        default: true,
      },
      manageEmergencyProfile: {
        type: Boolean,
        default: true,
      },
      manageGuardians: {
        type: Boolean,
        default: false,
      },
      viewAccessHistory: {
        type: Boolean,
        default: true,
      },
    },

    // Transition toward independent access
    independenceTransition: {
      transitionAge: {
        type: Number,
        default: 18,
      },
      transitionedAt: Date,
      transitionedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    status: {
      type: String,
      enum: ['active', 'suspended', 'terminated'],
      default: 'active',
    },

    terminatedReason: String,
    terminatedAt: Date,
    terminatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Audit information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: String,
  },
  {
    timestamps: true,
    indexes: [
      { patientId: 1 },
      { guardianUserId: 1 },
      { relationship: 1 },
      { verificationStatus: 1 },
      { status: 1 },
      { createdAt: -1 },
    ],
  }
);

const GuardianRelationship = mongoose.model('GuardianRelationship', guardianRelationshipSchema);
export default GuardianRelationship;
