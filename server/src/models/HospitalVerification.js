/**
 * Hospital Verification Model
 * Tracks facility verification workflow and status
 */

import mongoose from 'mongoose';

const hospitalVerificationSchema = new mongoose.Schema(
  {
    // Link to Hospital
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      unique: true,
      index: true,
    },

    // Verification Status
    status: {
      type: String,
      enum: ['pending', 'in_review', 'verified', 'rejected', 'suspended'],
      default: 'pending',
      index: true,
    },

    // Submitted Information
    submittedInformation: {
      registrationNumber: String,
      registrationType: String,
      issuingAuthority: String,
      issueDate: Date,
      expiryDate: Date,
      licenseNumber: String,
      submittedAt: Date,
      submittedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Supporting Documents
    documents: [
      {
        documentType: String, // 'registration_certificate', 'license', 'other'
        documentUrl: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Verification Review
    verificationReview: {
      reviewedAt: Date,
      reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verificationMethod: String, // 'jeevacare_admin', 'government_integration', 'manual_verification'
      findings: String, // Detailed review findings
      recommendedStatus: String,
    },

    // Approval/Rejection
    approvalDecision: {
      status: String, // 'approved', 'rejected', 'approved_with_conditions'
      decidedAt: Date,
      decidedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
      conditions: [String], // If approved with conditions
    },

    // Rejection Details
    rejectionReason: String,
    rejectedAt: Date,
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    appealable: Boolean,

    // Suspension Details
    suspensionReason: String,
    suspendedAt: Date,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    suspensionExpiryDate: Date,

    // Expiry and Renewal
    verificationExpiryDate: Date,
    renewalDue: Boolean,
    renewalDueDate: Date,

    // Audit Trail
    auditTrail: [
      {
        action: String,
        timestamp: Date,
        actor: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        details: mongoose.Schema.Types.Mixed,
      },
    ],

    // Notes
    internalNotes: String,
  },
  {
    timestamps: true,
    indexes: [
      { hospitalId: 1 },
      { status: 1 },
      { 'submittedInformation.submittedAt': -1 },
      { 'approvalDecision.decidedAt': -1 },
      { verificationExpiryDate: 1 },
    ],
  }
);

const HospitalVerification = mongoose.model('HospitalVerification', hospitalVerificationSchema);
export default HospitalVerification;
