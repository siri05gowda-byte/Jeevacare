/**
 * Healthcare Professional Model
 * Represents a verified healthcare professional
 * Independent of facility association
 */

import mongoose from 'mongoose';
import { generateProfessionalId } from '../utils/professionalIdGenerator.js';

const healthcareProfessionalSchema = new mongoose.Schema(
  {
    // Unique JeevaCare Professional ID
    professionalId: {
      type: String,
      unique: true,
      sparse: true,
      required: true,
      index: true,
    },

    // Link to User Account
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      unique: true,
      required: true,
      index: true,
    },

    // Personal Information
    firstName: {
      type: String,
      required: true,
    },

    lastName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      lowercase: true,
      index: true,
    },

    phone: String,

    // Professional Type
    professionalType: {
      type: String,
      enum: [
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'paramedic',
        'other_healthcare_professional',
      ],
      required: true,
      index: true,
    },

    // Specialization (for doctors, nurses, etc.)
    specialization: [String], // e.g., ['cardiology', 'internal_medicine']

    // Qualifications/Degrees
    qualifications: [
      {
        degreeName: String,
        institution: String,
        yearOfCompletion: Number,
        documentUrl: String,
      },
    ],

    // Professional Credentials
    credentials: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'ProfessionalCredential',
      },
    ],

    // Facility Associations (can be multi-facility)
    facilityAssociations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HospitalStaff',
      },
    ],

    // Verification Status (overall)
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected', 'suspended'],
      default: 'unverified',
      index: true,
    },

    // Account Status
    accountStatus: {
      type: String,
      enum: ['active', 'suspended', 'inactive'],
      default: 'active',
      index: true,
    },

    // Verification Information
    verification: {
      verifiedAt: Date,
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verificationMethod: String, // 'jeevacare_admin', 'government_verification', 'manual'
      verificationExpiry: Date,
    },

    // Suspension Information
    suspension: {
      suspendedAt: Date,
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      suspensionReason: String,
      suspensionExpiryDate: Date,
    },

    // Contact Information (where appropriate)
    contactPreferences: {
      preferredPhone: String,
      preferredEmail: String,
      communicationLanguage: String,
    },

    // Additional Information
    licenseNumber: String, // Government license if applicable
    registrationNumber: String, // Professional registration if applicable
    yearsOfExperience: Number,
    biography: String,

    // Audit Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Historical Data (for data integrity)
    previousFacilities: [
      {
        facilityId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Hospital',
        },
        endDate: Date,
        role: String,
      },
    ],
  },
  {
    timestamps: true,
    indexes: [
      { professionalId: 1 },
      { userId: 1 },
      { professionalType: 1 },
      { verificationStatus: 1 },
      { accountStatus: 1 },
      { facilityAssociations: 1 },
      { createdAt: -1 },
    ],
  }
);

// Generate Professional ID before saving
healthcareProfessionalSchema.pre('save', async function (next) {
  if (!this.professionalId) {
    try {
      this.professionalId = await generateProfessionalId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const HealthcareProfessional = mongoose.models.HealthcareProfessional || mongoose.model('HealthcareProfessional', healthcareProfessionalSchema);
export default HealthcareProfessional;

