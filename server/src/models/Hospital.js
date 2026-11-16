/**
 * Hospital/Facility Model
 * Represents a healthcare facility with unique JeevaCare Facility ID
 * Independent of government registration numbers
 */

import mongoose from 'mongoose';
import { generateFacilityId } from '../utils/facilityIdGenerator.js';

const hospitalSchema = new mongoose.Schema(
  {
    // Unique JeevaCare Facility ID (different from gov registration)
    facilityId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Facility Information
    name: {
      type: String,
      required: true,
      index: true,
    },

    facilityType: {
      type: String,
      enum: [
        'general_hospital',
        'specialty_hospital',
        'clinic',
        'diagnostic_center',
        'nursing_home',
        'primary_health_center',
        'community_health_center',
        'other',
      ],
      default: 'general_hospital',
    },

    // Address Information
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    // Contact Information
    contactInfo: {
      phone: String,
      email: String,
      website: String,
      emergencyContact: String,
    },

    // Government Registration / Licensing
    registration: {
      registrationNumber: {
        type: String,
        unique: true,
        sparse: true,
      },
      registrationType: {
        type: String,
        enum: ['state_registration', 'national_registration', 'private_registration', 'other'],
      },
      issuingAuthority: String,
      issueDate: Date,
      expiryDate: Date,
      licenseNumber: String,
      documentUrl: String,
    },

    // Departments/Specialties
    departments: [
      {
        name: String,
        head: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'HealthcareProfessional',
        },
        description: String,
      },
    ],

    // Facility Administrator(s)
    administrators: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    ],

    // Verification Status
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'suspended', 'rejected'],
      default: 'pending',
      index: true,
    },

    // Verification Details
    verification: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HospitalVerification',
    },

    // Facility Status
    status: {
      type: String,
      enum: ['active', 'suspended', 'rejected', 'closed'],
      default: 'active',
      index: true,
    },

    // Suspension/Rejection Details
    suspensionDetails: {
      reason: String,
      suspendedAt: Date,
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      resumeDate: Date,
    },

    rejectionDetails: {
      reason: String,
      rejectedAt: Date,
      rejectedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Operational Information
    operationalHours: {
      monday: { open: String, close: String },
      tuesday: { open: String, close: String },
      wednesday: { open: String, close: String },
      thursday: { open: String, close: String },
      friday: { open: String, close: String },
      saturday: { open: String, close: String },
      sunday: { open: String, close: String },
    },

    // Capacity Information
    capacity: {
      beds: Number,
      operatingTheatres: Number,
      icuBeds: Number,
    },

    // Services Offered
    services: [String], // e.g., emergency, pediatrics, cardiology, etc.

    // Staff Information
    staffCount: {
      doctors: { type: Number, default: 0 },
      nurses: { type: Number, default: 0 },
      paramedicStaff: { type: Number, default: 0 },
      administrativeStaff: { type: Number, default: 0 },
    },

    // Audit Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Additional Metadata
    notes: String,
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { facilityId: 1 },
      { name: 1 },
      { status: 1 },
      { verificationStatus: 1 },
      { 'address.city': 1 },
      { administrators: 1 },
      { createdAt: -1 },
    ],
  }
);

// Generate Facility ID before saving
hospitalSchema.pre('save', async function (next) {
  if (!this.facilityId) {
    try {
      this.facilityId = await generateFacilityId();
    } catch (error) {
      return next(error);
    }
  }
  next();
});

const Hospital = mongoose.models.Hospital || mongoose.model('Hospital', hospitalSchema);
export default Hospital;

