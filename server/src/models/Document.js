import mongoose from 'mongoose';

const documentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    documentType: {
      type: String,
      enum: [
        'prescription',
        'lab_report',
        'radiology_report',
        'discharge_summary',
        'medical_certificate',
        'vaccination_certificate',
        'pathology_report',
        'clinical_notes',
        'other_medical_document',
        'identity_document',
        'insurance_document',
      ],
      required: true,
    },

    category: String,

    fileName: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    // Cloudinary reference
    fileReference: {
      cloudinaryPublicId: String,
      cloudinaryUrl: String,
      fileSize: Number,
      uploadedAt: {
        type: Date,
        default: Date.now,
      },
    },

    // Verification and provenance
    verificationStatus: {
      type: String,
      enum: ['patient_uploaded', 'provider_verified', 'pending_review', 'rejected'],
      default: 'patient_uploaded',
      index: true,
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    verifiedAt: Date,

    verificationNotes: String,

    // OCR and text extraction
    ocrStatus: {
      type: String,
      enum: ['not_extracted', 'extracted', 'extraction_failed'],
      default: 'not_extracted',
    },

    ocrData: {
      extractedText: String,
      confidence: Number,
      languages: [String],
      extraction_method: String,
      extractedAt: Date,
    },

    // Quality assessment
    qualityAssessment: {
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      issues: [
        {
          type: String,
          enum: [
            'blur',
            'glare',
            'cropping',
            'poor_visibility',
            'incorrect_orientation',
            'low_contrast',
            'watermark',
            'illegible_text',
          ],
        },
      ],
      assessedAt: Date,
      feedback: String,
    },

    // Metadata extraction
    metadata: {
      documentDate: Date,
      documentTitle: String,
      issuingFacility: String,
      issuingProvider: String,
      expiryDate: Date,
      referenceNumber: String,
    },

    // Linked clinical records
    linkedClinicalRecords: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ClinicalRecord',
      },
    ],

    // Linked encounter
    linkedEncounter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
    },

    // Access control
    accessRestrictions: [
      {
        restrictedFrom: String, // Role or user type
        reason: String,
      },
    ],

    isPublic: {
      type: Boolean,
      default: false,
    },

    // Audit information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Sensitive document flag
    flaggedAsSensitive: {
      type: Boolean,
      default: false,
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
      { patientId: 1 },
      { uploadedBy: 1 },
      { documentType: 1 },
      { verificationStatus: 1 },
      { 'fileReference.uploadedAt': -1 },
      { createdAt: -1 },
      { deletedAt: 1 },
    ],
  }
);

const Document = mongoose.model('Document', documentSchema);
export default Document;
