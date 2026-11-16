/**
 * Hospital Staff Model
 * Represents staff association with a facility
 * Supports multi-facility professionals with facility-scoped roles and permissions
 */

import mongoose from 'mongoose';

const hospitalStaffSchema = new mongoose.Schema(
  {
    // Links
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareProfessional',
      sparse: true,
      index: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },

    // Role at this Facility
    role: {
      type: String,
      enum: [
        'hospital_admin',
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

    // Department/Section
    department: {
      name: String,
      departmentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital', // Reference to department within hospital
      },
    },

    // Employment Information
    employmentStatus: {
      type: String,
      enum: ['active', 'on_leave', 'contract', 'visiting', 'temporary'],
      default: 'active',
      index: true,
    },

    startDate: {
      type: Date,
      required: true,
    },

    endDate: Date,

    // Facility-Specific Permissions
    permissions: {
      viewPatientRecords: { type: Boolean, default: false },
      createClinicalRecords: { type: Boolean, default: false },
      createDiagnosis: { type: Boolean, default: false },
      createPrescription: { type: Boolean, default: false },
      createLaboratoryResults: { type: Boolean, default: false },
      createRadiologyReports: { type: Boolean, default: false },
      manageAppointments: { type: Boolean, default: false },
      manageStaff: { type: Boolean, default: false },
      manageFacility: { type: Boolean, default: false },
      accessEmergencyProfiles: { type: Boolean, default: false },
      approveEmergencyAccess: { type: Boolean, default: false },
      // Add more as needed
    },

    // Verification/Association Status
    associationStatus: {
      type: String,
      enum: ['pending', 'active', 'suspended', 'revoked'],
      default: 'pending',
      index: true,
    },

    // Approval Information
    approvalInformation: {
      approvedAt: Date,
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      approvalMethod: String, // 'facility_admin', 'jeevacare_admin', 'automatic'
    },

    // Suspension/Revocation Information
    suspension: {
      suspendedAt: Date,
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      suspensionReason: String,
      suspensionExpiryDate: Date,
    },

    revocation: {
      revokedAt: Date,
      revokedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      revocationReason: String,
    },

    // Professional Verification Status at this Facility
    professionalVerificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
    },

    // Facility Status at time of association
    facilityVerificationStatusAtAssociation: String,

    // Contact Information
    facilityContactEmail: String,
    facilityContactPhone: String,

    // Additional Information
    notes: String,
    specialization: [String],

    // Audit Information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
    indexes: [
      { userId: 1, hospitalId: 1 }, // Unique per facility
      { hospitalId: 1, role: 1 },
      { professionalId: 1, hospitalId: 1 },
      { associationStatus: 1 },
      { startDate: -1 },
      { endDate: 1 },
    ],
  }
);

// Index for checking staff is active at a facility
hospitalStaffSchema.index(
  {
    userId: 1,
    hospitalId: 1,
    associationStatus: 1,
    startDate: 1,
    endDate: 1,
  },
  {
    name: 'active_staff_lookup',
  }
);

const HospitalStaff = mongoose.models.HospitalStaff || mongoose.model('HospitalStaff', hospitalStaffSchema);
export default HospitalStaff;

