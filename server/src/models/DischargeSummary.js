import mongoose from 'mongoose';

const dischargeSummarySchema = new mongoose.Schema(
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

    // Hospitalization details
    admissionDate: {
      type: Date,
      required: true,
      index: true,
    },

    dischargeDate: {
      type: Date,
      required: true,
      index: true,
    },

    lengthOfStay: Number, // Days (calculated from admission/discharge)

    // Clinical information
    primaryDiagnosis: {
      type: String,
      required: true,
    },

    primaryDiagnosisCode: String, // ICD-10 or similar

    secondaryDiagnoses: [String],

    secondaryDiagnosisCodes: [String],

    // Treatments during hospitalization
    procedures: [String],

    surgeriesPerformed: [String],

    complications: [String],

    // Discharge medications
    medications: [
      {
        medicationName: String,
        dosage: String,
        frequency: String,
        duration: String,
        indication: String,
      },
    ],

    // Discharge instructions
    dischargeInstructions: String,

    dietaryRecommendations: String,

    activityRestrictions: String,

    // Follow-up
    followUpRequired: Boolean,

    followUpSpecialty: String,

    followUpSchedule: String,

    referralToSpecialist: {
      specialtyName: String,
      referralDate: Date,
      referralProviderName: String,
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

    dischargeProviderId: {
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

    // Supporting document (PDF discharge summary)
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

    // Vital stats at discharge
    dischargeVitals: {
      temperature: Number,
      bloodPressure: String,
      heartRate: Number,
      respiratoryRate: Number,
    },

    // Discharge disposition
    dischargeDisposition: {
      type: String,
      enum: ['home', 'against_medical_advice', 'hospital_transfer', 'extended_care', 'hospice', 'expired'],
      default: 'home',
    },

    // Amendment history
    amendmentHistory: [
      {
        originalDischargeSummaryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'DischargeSummary',
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
      { patientId: 1, dischargeDate: -1 },
      { admissionDate: 1 },
      { verificationStatus: 1 },
      { facilityId: 1 },
      { providerId: 1 },
      { dischargeDisposition: 1 },
      { createdAt: -1 },
      { deletedAt: 1 },
    ],
  }
);

// Prevent direct modification of provider-verified records
dischargeSummarySchema.pre('save', function (next) {
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
        return next(new Error('Provider-verified discharge summaries are immutable. Use amendment workflow instead.'));
      }
    }
  }
  next();
});

const DischargeSummary = mongoose.models.DischargeSummary || mongoose.model('DischargeSummary', dischargeSummarySchema);
export default DischargeSummary;
