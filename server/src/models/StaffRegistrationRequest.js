/**
 * Staff Registration Request Model
 * Represents a healthcare professional's pending request to be affiliated with a hospital
 * Enables controlled staff onboarding with hospital administrator approval
 */

import mongoose from 'mongoose';

const staffRegistrationRequestSchema = new mongoose.Schema(
  {
    // Requestor Information
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

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
      required: true,
      lowercase: true,
      index: true,
    },

    phone: String,

    // Requested Role(s)
    requestedRole: {
      type: String,
      enum: [
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'paramedic',
        'reception_staff',
        'other_staff',
      ],
      required: true,
      index: true,
    },

    // Hospital Affiliation Details
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },

    department: String,

    // Professional Information
    specialization: [String],

    licenseNumber: String,

    registrationNumber: String,

    qualifications: [String],

    yearsOfExperience: Number,

    // Request Status
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'withdrawn'],
      default: 'pending',
      index: true,
    },

    // Approval/Rejection Details
    reviewedAt: Date,

    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    reviewerRole: {
      type: String,
      enum: ['hospital_admin', 'system_admin'],
    },

    approvalReason: String,

    rejectionReason: String,

    // Request Details
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },

    // Additional Notes
    notes: String,

    // Audit
    ipAddress: String,

    userAgent: String,

    // Metadata
    metadata: mongoose.Schema.Types.Mixed,
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, hospitalId: 1 }, // Prevent duplicate requests for same user + hospital
      { hospitalId: 1, status: 1 }, // For listing pending requests by hospital
      { status: 1, submittedAt: -1 }, // For global request queue
      { email: 1, status: 1 }, // For checking applicant status
    ],
  }
);

// Compound unique index: prevent duplicate pending/approved requests
staffRegistrationRequestSchema.index(
  { userId: 1, hospitalId: 1, status: 1 },
  {
    unique: true,
    sparse: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } },
  }
);

const StaffRegistrationRequest = mongoose.models.StaffRegistrationRequest ||
  mongoose.model('StaffRegistrationRequest', staffRegistrationRequestSchema);

export default StaffRegistrationRequest;
