import mongoose from 'mongoose';

const laboratoryResultSchema = new mongoose.Schema(
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

    // Laboratory details
    labName: {
      type: String,
      required: true,
    },

    labTestName: {
      type: String,
      required: true,
      index: true,
    },

    labTestCode: String,

    sampleCollectionDate: {
      type: Date,
      required: true,
      index: true,
    },

    resultReceivedDate: {
      type: Date,
      required: true,
    },

    // Test results array
    results: [
      {
        testName: String,
        value: String,
        unit: String,
        referenceRange: String,
        normalRange: String,
        isAbnormal: Boolean,
        flag: {
          type: String,
          enum: ['H', 'L', 'N'], // High, Low, Normal
        },
      },
    ],

    // Overall result interpretation
    interpretation: String,

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

    labProviderId: String, // Lab identifier if external

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

    // Supporting document (PDF, image of report)
    linkedDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    // OCR data if extracted from document
    ocrStatus: {
      type: String,
      enum: ['not_extracted', 'extracted', 'extraction_failed'],
      default: 'not_extracted',
    },

    ocrData: {
      extractedText: String,
      confidence: Number,
      extractedAt: Date,
    },

    // Amendment history
    amendmentHistory: [
      {
        originalResultId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'LaboratoryResult',
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

    // Critical flag for abnormal results requiring immediate attention
    isCritical: {
      type: Boolean,
      default: false,
    },

    criticalFlag: {
      flaggedAt: Date,
      flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
    },

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
      { patientId: 1, sampleCollectionDate: -1 },
      { labTestName: 1 },
      { verificationStatus: 1 },
      { facilityId: 1 },
      { providerId: 1 },
      { isCritical: 1 },
      { createdAt: -1 },
      { deletedAt: 1 },
    ],
  }
);

// Prevent direct modification of provider-verified records
laboratoryResultSchema.pre('save', function (next) {
  if (!this.isNew) {
    if (this.verificationStatus === 'provider_verified') {
      const modifiedPaths = this.modifiedPaths();
      const nonAmendmentChanges = modifiedPaths.filter(path => 
        !path.startsWith('amendmentHistory') && 
        !path.startsWith('verificationNotes') &&
        !path.startsWith('criticalFlag') &&
        path !== '__v' && 
        path !== 'updatedAt'
      );
      
      if (nonAmendmentChanges.length > 0) {
        return next(new Error('Provider-verified laboratory results are immutable. Use amendment workflow instead.'));
      }
    }
  }
  next();
});

const LaboratoryResult = mongoose.models.LaboratoryResult || mongoose.model('LaboratoryResult', laboratoryResultSchema);
export default LaboratoryResult;
