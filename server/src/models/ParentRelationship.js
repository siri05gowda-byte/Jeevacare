/**
 * ParentRelationship Model
 * Represents the relationship between a parent/caregiver and a child patient
 * Separate from GuardianRelationship - parents are primary caregivers
 */

import mongoose from 'mongoose';

const parentRelationshipSchema = new mongoose.Schema(
  {
    // The child patient
    childPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // The parent - can be another Patient (for parent-to-child) or just contact info
    parentPatientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      sparse: true,
    },

    // Parent contact/identification
    parentName: {
      firstName: String,
      lastName: String,
    },

    parentPhone: String,
    parentEmail: String,

    // Relationship type
    relationship: {
      type: String,
      enum: ['mother', 'father', 'legal_guardian', 'grandparent', 'uncle', 'aunt', 'other'],
      required: true,
    },

    // Verification status
    verificationStatus: {
      type: String,
      enum: ['unverified', 'verified', 'rejected'],
      default: 'unverified',
    },

    verificationDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    verifiedAt: Date,

    // Authorization & Permissions
    authorizationStatus: {
      type: String,
      enum: ['pending', 'authorized', 'revoked', 'suspended'],
      default: 'pending',
    },

    permissions: {
      viewRecords: {
        type: Boolean,
        default: true,
      },
      manageContact: {
        type: Boolean,
        default: true,
      },
      manageAppointments: {
        type: Boolean,
        default: true,
      },
      viewAccessHistory: {
        type: Boolean,
        default: true,
      },
    },

    // Temporal relationship
    startDate: {
      type: Date,
      default: Date.now,
    },

    endDate: Date,

    // Status
    status: {
      type: String,
      enum: ['active', 'suspended', 'terminated'],
      default: 'active',
    },

    terminatedReason: String,
    terminatedAt: Date,
    terminatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Audit information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    notes: String,
  },
  {
    timestamps: true,
    indexes: [
      { childPatientId: 1 },
      { parentPatientId: 1 },
      { relationship: 1 },
      { verificationStatus: 1 },
      { status: 1 },
      { 'authorizationStatus': 1 },
      { createdAt: -1 },
    ],
  }
);

const ParentRelationship = mongoose.model('ParentRelationship', parentRelationshipSchema);
export default ParentRelationship;
