import mongoose from 'mongoose';

const rescuerSchema = new mongoose.Schema(
  {
    // Type of rescuer
    rescuerType: {
      type: String,
      enum: ['registered_jeevacare', 'unknown', 'anonymous'],
      required: true,
      index: true,
    },

    // If registered JeevaCare rescuer
    registeredUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },

    registeredPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      sparse: true,
    },

    // If unknown rescuer
    unknownRescuerInfo: {
      name: String,
      description: String, // e.g., "pedestrian at accident site"
      contactInfo: String, // phone number if available
      verified: {
        type: Boolean,
        default: false,
      },
    },

    // If anonymous rescuer
    anonymousIndicator: String, // e.g., "bystander", "police officer", "ambulance crew"

    // Profession/Role (if known)
    profession: {
      type: String,
      enum: [
        'doctor',
        'nurse',
        'paramedic',
        'ambulance_driver',
        'firefighter',
        'police',
        'citizen',
        'security',
        'other',
      ],
      sparse: true,
    },

    // Facility/Organization (if known)
    organization: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      sparse: true,
    },

    organizationName: String, // For unknown rescuers

    // Actions taken
    actionsPerformed: [
      {
        action: String, // e.g., "first aid provided", "called ambulance"
        timestamp: Date,
        notes: String,
      },
    ],

    // Witness information
    isWitness: {
      type: Boolean,
      default: false,
    },

    witnessStatement: String,

    witnessStatementRecordedAt: Date,

    witnessStatementRecordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Audit Information
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'archived'],
      default: 'active',
    },

    // Notes
    notes: String,
  },
  {
    timestamps: false,
    indexes: [
      { rescuerType: 1 },
      { registeredUserId: 1 },
      { createdAt: -1 },
      { status: 1 },
    ],
  }
);

// Validate that at least one rescuer type has data
rescuerSchema.pre('save', function (next) {
  const isRegistered = this.registeredUserId;
  const isUnknown = this.unknownRescuerInfo && Object.keys(this.unknownRescuerInfo).length > 0;
  const isAnonymous = this.anonymousIndicator;

  if (!isRegistered && !isUnknown && !isAnonymous) {
    return next(new Error('At least one rescuer identifier must be provided'));
  }

  next();
});

const Rescuer = mongoose.model('Rescuer', rescuerSchema);
export default Rescuer;
