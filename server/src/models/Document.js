import mongoose from 'mongoose';
import crypto from 'crypto';

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

    // ============================================
    // IMMUTABLE ORIGINAL - Data Provenance
    // ============================================
    originalContent: {
      // SHA-256 hash of original file bytes
      contentHash: {
        type: String,
        index: true,
      },
      // Algorithm used (e.g., 'sha256')
      hashAlgorithm: {
        type: String,
        default: 'sha256',
      },
      // When the hash was computed
      hashedAt: Date,
      // Original file size in bytes
      originalFileSize: Number,
      // Integrity metadata
      integrityVerified: {
        type: Boolean,
        default: true,
      },
    },

    // Processing pipeline version and metadata
    processingPipeline: {
      // Version of the processing system used
      version: {
        type: String,
        default: 'phase-8.2',
      },
      // Provider used (e.g., 'tesseract-5.1.1')
      ocrProvider: String,
      // Quality assessment provider
      qualityProvider: String,
      // Timestamp when processing started
      processedAt: Date,
      // Processing duration in milliseconds
      processingDuration: Number,
    },

    // Correction history - track all modifications
    correctionHistory: [
      {
        // Version number of this correction
        version: Number,
        // Type of correction (e.g., 'ocr_text_manual_fix', 'metadata_correction')
        correctionType: String,
        // Who performed the correction
        correctedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        // When the correction was made
        correctedAt: Date,
        // What was changed (store previous and new values)
        changes: {
          field: String,
          previousValue: mongoose.Schema.Types.Mixed,
          newValue: mongoose.Schema.Types.Mixed,
        },
        // Reason/notes for the correction
        reason: String,
        // Link to audit event for this correction
        auditEventId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'AuditEvent',
        },
      },
    ],

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
      enum: ['not_extracted', 'queued', 'processing', 'extracted', 'failed', 'retryable_failure'],
      default: 'not_extracted',
    },

    ocrData: {
      // Extracted text from OCR
      extractedText: String,
      // OCR provider's confidence score (0-1)
      confidence: Number,
      // Detected/requested languages
      languages: [String],
      // Extraction method used
      extraction_method: String,
      // When OCR was performed
      extractedAt: Date,
      // Processing duration in ms
      processingDuration: Number,
      // Was this extracted by real OCR or mock?
      isDemo: {
        type: Boolean,
        default: false,
      },
      // OCR provider version
      providerVersion: String,
      // Flag: This is unverified OCR output, not clinical fact
      unverified: {
        type: Boolean,
        default: true,
      },
    },

    // Quality assessment results
    qualityAssessment: {
      score: {
        type: Number,
        min: 0,
        max: 100,
      },
      status: {
        type: String,
        enum: ['good', 'fair', 'poor', 'not_assessed'],
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
            'low_resolution',
          ],
        },
      ],
      assessedAt: Date,
      feedback: String,
      // Per-check findings with details
      checks: mongoose.Schema.Types.Mixed,
      // Was this a real assessment or mock?
      isDemo: {
        type: Boolean,
        default: false,
      },
    },

    // Metadata extraction (human-verified or auto-extracted)
    metadata: {
      documentDate: Date,
      documentTitle: String,
      issuingFacility: String,
      issuingProvider: String,
      expiryDate: Date,
      referenceNumber: String,
      // Flag: metadata was auto-extracted via OCR
      autoExtracted: Boolean,
      // Flag: metadata was manually reviewed/corrected
      verified: Boolean,
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
      { 'originalContent.contentHash': 1 },
      { 'ocrStatus': 1 },
      { createdAt: -1 },
      { deletedAt: 1 },
    ],
  }
);

/**
 * Instance method: Calculate and set content hash for immutability verification
 */
documentSchema.methods.setContentHash = function (fileBuffer) {
  if (!fileBuffer) return;
  
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  
  this.originalContent = this.originalContent || {};
  this.originalContent.contentHash = hash.digest('hex');
  this.originalContent.hashAlgorithm = 'sha256';
  this.originalContent.hashedAt = new Date();
  this.originalContent.originalFileSize = fileBuffer.length;
};

/**
 * Instance method: Verify content integrity
 */
documentSchema.methods.verifyContentIntegrity = function (fileBuffer) {
  if (!this.originalContent?.contentHash || !fileBuffer) {
    return false;
  }
  
  const hash = crypto.createHash('sha256');
  hash.update(fileBuffer);
  const currentHash = hash.digest('hex');
  
  return currentHash === this.originalContent.contentHash;
};

/**
 * Instance method: Add correction to history
 */
documentSchema.methods.addCorrection = function (correctionData) {
  if (!this.correctionHistory) {
    this.correctionHistory = [];
  }
  
  const correction = {
    version: this.correctionHistory.length + 1,
    correctionType: correctionData.correctionType,
    correctedBy: correctionData.correctedBy,
    correctedAt: new Date(),
    changes: correctionData.changes,
    reason: correctionData.reason,
    auditEventId: correctionData.auditEventId,
  };
  
  this.correctionHistory.push(correction);
  return correction;
};

/**
 * Instance method: Mark OCR data as unverified (cannot auto-become clinical fact)
 */
documentSchema.methods.markOCRAsUnverified = function () {
  if (this.ocrData) {
    this.ocrData.unverified = true;
  }
};

const Document = mongoose.model('Document', documentSchema);
export default Document;
