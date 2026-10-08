import mongoose from 'mongoose';

const radiologyRecordSchema = new mongoose.Schema(
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

    // Radiology details
    studyDate: {
      type: Date,
      required: true,
      index: true,
    },

    reportDate: {
      type: Date,
      required: true,
    },

    modalityType: {
      type: String,
      required: true,
      enum: ['x_ray', 'ct_scan', 'mri', 'ultrasound', 'pet_scan', 'dexa_scan', 'other'],
      index: true,
    },

    bodyPart: {
      type: String,
      required: true,
      index: true,
    },

    // Clinical indication
    clinicalIndication: String,

    // Findings and impression
    findings: String,

    impression: String,

    recommendation: String,

    // Radiologist attribution
    radiologistName: String,

    radiologistLicense: String,

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

    // DICOM or image reference
    imageReference: {
      cloudinaryPublicId: String,
      cloudinaryUrl: String,
      fileSize: Number,
      uploadedAt: Date,
      imageCount: Number,
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

    // Supporting documents (PDF report, images)
    linkedDocuments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],

    // OCR data if extracted from report
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

    // Image quality assessment
    qualityAssessment: {
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      issues: [
        {
          type: String,
          enum: ['artifact', 'motion_blur', 'truncation', 'poor_positioning', 'low_contrast'],
        },
      ],
      assessedAt: Date,
      feedback: String,
    },

    // Critical findings flag
    hasCriticalFindings: {
      type: Boolean,
      default: false,
      index: true,
    },

    criticalFlag: {
      flaggedAt: Date,
      flaggedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      findings: String,
    },

    // Amendment history
    amendmentHistory: [
      {
        originalRadiologyId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'RadiologyRecord',
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
      { patientId: 1, studyDate: -1 },
      { modalityType: 1 },
      { bodyPart: 1 },
      { verificationStatus: 1 },
      { facilityId: 1 },
      { providerId: 1 },
      { hasCriticalFindings: 1 },
      { createdAt: -1 },
      { deletedAt: 1 },
    ],
  }
);

// Prevent direct modification of provider-verified records
radiologyRecordSchema.pre('save', function (next) {
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
        return next(new Error('Provider-verified radiology records are immutable. Use amendment workflow instead.'));
      }
    }
  }
  next();
});

const RadiologyRecord = mongoose.models.RadiologyRecord || mongoose.model('RadiologyRecord', radiologyRecordSchema);
export default RadiologyRecord;
