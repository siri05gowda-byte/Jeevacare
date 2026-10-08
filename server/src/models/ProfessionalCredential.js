/**
 * Professional Credential Model
 * Tracks credentials, licenses, and certifications for healthcare professionals
 */

import mongoose from 'mongoose';

const professionalCredentialSchema = new mongoose.Schema(
  {
    // Link to Professional
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareProfessional',
      required: true,
      index: true,
    },

    // Credential Information
    credentialType: {
      type: String,
      enum: [
        'medical_license',
        'nursing_license',
        'pharmacy_license',
        'lab_technician_certification',
        'radiology_certification',
        'paramedic_certification',
        'specialty_certification',
        'degree',
        'diploma',
        'other_certification',
      ],
      required: true,
    },

    credentialName: {
      type: String,
      required: true,
    },

    // Credential Reference/Number
    credentialNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Issuing Authority
    issuingAuthority: {
      type: String,
      required: true,
    },

    // Dates
    issueDate: Date,
    expiryDate: Date,

    // Status
    status: {
      type: String,
      enum: ['pending', 'verified', 'rejected', 'expired', 'suspended'],
      default: 'pending',
      index: true,
    },

    // Verification
    verification: {
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verificationMethod: String, // 'document_verification', 'government_verification', 'manual'
      verificationSource: String,
    },

    // Supporting Documents
    documents: [
      {
        documentUrl: String,
        documentType: String, // 'certificate', 'license', 'diploma', 'registration_proof'
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Rejection/Suspension Information
    rejectionDetails: {
      reason: String,
      rejectedAt: Date,
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    suspensionDetails: {
      reason: String,
      suspendedAt: Date,
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      suspensionExpiryDate: Date,
    },

    // Scope/Specialization
    scope: [String], // For credentials with limited scope (e.g., specific surgical procedures)

    // Notes
    internalNotes: String,
  },
  {
    timestamps: true,
    indexes: [
      { professionalId: 1 },
      { status: 1 },
      { expiryDate: 1 },
      { credentialNumber: 1 },
      { verificationMethod: 1 },
    ],
  }
);

// Auto-update status if credential is expired
professionalCredentialSchema.pre('save', function (next) {
  if (this.expiryDate && new Date() > this.expiryDate && this.status !== 'expired') {
    this.status = 'expired';
  }
  next();
});

const ProfessionalCredential = mongoose.model('ProfessionalCredential', professionalCredentialSchema);
export default ProfessionalCredential;
