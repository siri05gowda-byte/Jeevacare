import mongoose from 'mongoose';

const hospitalSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
    },

    facilityType: {
      type: String,
      enum: ['general', 'specialty', 'diagnostic', 'pharmacy', 'laboratory', 'clinic', 'nursing_home'],
      required: true,
    },

    contactInformation: {
      phone: String,
      email: {
        type: String,
        lowercase: true,
      },
      website: String,
    },

    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      coordinates: {
        type: {
          type: String,
          enum: ['Point'],
          default: 'Point',
        },
        coordinates: [Number], // [longitude, latitude]
      },
    },

    departments: [
      {
        name: String,
        head: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    verificationStatus: {
      status: {
        type: String,
        enum: ['pending', 'verified', 'rejected', 'suspended'],
        default: 'pending',
      },
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      verificationNotes: String,
      suspensionReason: String,
      suspendedAt: Date,
      suspendedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    },

    // Administrative Access
    administratorUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    staff: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        role: {
          type: String,
          enum: ['DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 
                 'PHARMACIST', 'RECEPTION_STAFF', 'HOSPITAL_ADMIN'],
        },
        department: String,
        joinedAt: Date,
        status: {
          type: String,
          enum: ['active', 'inactive', 'suspended'],
          default: 'active',
        },
      },
    ],

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

    emergencyServicesAvailable: {
      type: Boolean,
      default: false,
    },

    icuBeds: Number,
    totalBeds: Number,

    // Accreditations and Certifications
    accreditations: [
      {
        name: String,
        issueDate: Date,
        expiryDate: Date,
        certificateUrl: String,
      },
    ],

    // Integration Configuration
    integrations: {
      labSystem: {
        enabled: Boolean,
        provider: String,
        credentials: {
          apiKey: String,
          endpoint: String,
        },
      },
      radiologySystem: {
        enabled: Boolean,
        provider: String,
        credentials: {
          apiKey: String,
          endpoint: String,
        },
      },
      pharmacySystem: {
        enabled: Boolean,
        provider: String,
      },
    },

    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'deleted'],
      default: 'active',
    },

    settings: {
      appointmentDurationMinutes: {
        type: Number,
        default: 30,
      },
      maxDailyAppointmentsPerDoctor: {
        type: Number,
        default: 20,
      },
      allowPatientUploadDocuments: {
        type: Boolean,
        default: true,
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      { name: 1 },
      { registrationNumber: 1 },
      { 'verificationStatus.status': 1 },
      { administratorUser: 1 },
      { 'address.coordinates': '2dsphere' },
      { status: 1 },
    ],
  }
);

const Hospital = mongoose.model('Hospital', hospitalSchema);
export default Hospital;
