import mongoose from 'mongoose';

const vaccinationSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
      sparse: true,
    },

    clinicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalRecord',
      sparse: true,
    },

    // Vaccination details
    vaccineName: {
      type: String,
      required: true,
      index: true,
    },

    dose: {
      type: String,
      required: true,
    },

    administrationDate: {
      type: Date,
      required: true,
      index: true,
    },

    batchNumber: String,

    provider: {
      type: String,
      required: true,
    },

    nextScheduledDate: Date,

    site: String, // e.g., 'left_arm', 'right_arm'

    route: {
      type: String,
      enum: ['intramuscular', 'oral', 'subcutaneous', 'intradermal', 'intravenous'],
      default: 'intramuscular',
    },

    // Facility and provider tracking
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Verification and provenance
    verificationStatus: {
      type: String,
      enum: ['provider_verified', 'patient_uploaded', 'pending_review', 'amended', 'restricted'],
      default: 'pending_review',
      index: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    verifiedAt: Date,

    verificationNotes: String,

    // Adverse effects tracking
    adverseEffects: [
      {
        effectType: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe'],
        },
        dateOnset: Date,
        description: String,
        resolved: Boolean,
      },
    ],

    // Supporting document
    linkedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    // Amendment history
    amendmentHistory: [
      {
        originalVaccinationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Vaccination',
        },
        amendedAt: Date,
        amendedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        previousData: mongoose.Schema.Types.Mixed,
      },
    ],

    // Access control
    accessRestrictions: [
      {
        restrictedFrom: String,
        reason: String,
      },
    ],

    flaggedAsSensitive: {
      type: Boolean,
      default: false,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    deletedAt: Date,
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    indexes: [
      { patientId: 1, administrationDate: -1 },
      { vaccineName: 1 },
      { verificationStatus: 1 },
      { facilityId: 1 },
      { providerId: 1 },
      { createdAt: -1 },
      { deletedAt: 1 },
    ],
  }
);

// Prevent direct modification of provider-verified records
vaccinationSchema.pre('save', function (next) {
  if (!this.isNew) {
    if (this.verificationStatus === 'provider_verified') {
      const modifiedPaths = this.modifiedPaths();
      const nonAmendmentChanges = modifiedPaths.filter(path => 
        !path.startsWith('amendmentHistory') && 
        !path.startsWith('verificationNotes') &&
        path !== '__v' && 
        path !== 'updatedAt'
      );
      
      if (nonAmendmentChanges.length > 0) {
        return next(new Error('Provider-verified vaccination records are immutable. Use amendment workflow instead.'));
      }
    }
  }
  next();
});

const Vaccination = mongoose.models.Vaccination || mongoose.model('Vaccination', vaccinationSchema);
export default Vaccination;
