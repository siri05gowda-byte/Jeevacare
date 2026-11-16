import mongoose from 'mongoose';

/**
 * CorrectionRequest Model
 * Manages patient requests to correct/amend official clinical records
 * 
 * Workflow: PENDING → ACCEPTED/REJECTED/CLARIFIED → AMENDMENT_CREATED (if accepted)
 */
const correctionRequestSchema = new mongoose.Schema(
  {
    // Clinical record being corrected
    clinicalRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalRecord',
      required: true,
      index: true,
    },

    // Patient making the request
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Record details for reference
    recordType: String, // diagnosis, medication, etc.
    recordDate: Date,
    facilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    },
    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Correction request details
    reason: {
      type: String,
      enum: [
        'inaccurate_information',
        'missing_information',
        'wrong_patient',
        'duplicate_record',
        'outdated_information',
        'formatting_issue',
        'other',
      ],
      required: true,
    },

    requestReason: String, // Detailed explanation from patient

    // What the patient is requesting
    suggestedCorrection: String, // Suggested corrected information
    supportingDocuments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],

    // Request status
    status: {
      type: String,
      enum: ['pending', 'under_review', 'accepted', 'rejected', 'clarification_requested', 'amendment_created'],
      default: 'pending',
      index: true,
    },

    // Review information
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reviewedAt: Date,
    reviewNotes: String,

    // Response/clarification workflow
    clarificationRequested: {
      requestedAt: Date,
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      clarificationQuestion: String,
      patientResponse: String,
      patientRespondedAt: Date,
    },

    // Amendment created from this request
    amendmentRecordId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ClinicalRecord',
      sparse: true,
    },

    // Rejection details
    rejectionReason: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Audit trail
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Timeline
    requestedAt: {
      type: Date,
      default: Date.now,
    },

    resolutionDeadline: Date,

    // Escalation if needed
    escalatedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      sparse: true,
    },
    escalationReason: String,
  },
  {
    timestamps: true,
    indexes: [
      { clinicalRecordId: 1 },
      { patientId: 1, status: 1 },
      { status: 1 },
      { facilityId: 1, status: 1 },
      { createdAt: -1 },
      { resolutionDeadline: 1 },
    ],
  }
);

const CorrectionRequest = mongoose.models.CorrectionRequest || mongoose.model('CorrectionRequest', correctionRequestSchema);
export default CorrectionRequest;

