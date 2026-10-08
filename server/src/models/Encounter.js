import mongoose from 'mongoose';

const encounterSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      sparse: true,
    },

    encounterDate: {
      type: Date,
      required: true,
      index: true,
    },

    encounterType: {
      type: String,
      enum: ['consultation', 'follow_up', 'admission', 'emergency', 'telehealth', 'procedure', 'vaccination', 'checkup', 'diagnostic'],
      required: true,
    },

    reasonForVisit: String,

    chiefComplaint: String,

    clinicalNotes: String,

    vitals: {
      temperature: {
        value: Number,
        unit: { type: String, default: 'celsius' },
        recordedAt: Date,
      },
      heartRate: {
        value: Number,
        unit: { type: String, default: 'bpm' },
        recordedAt: Date,
      },
      bloodPressure: {
        systolic: Number,
        diastolic: Number,
        unit: { type: String, default: 'mmHg' },
        recordedAt: Date,
      },
      respiratoryRate: {
        value: Number,
        unit: { type: String, default: 'breaths_per_min' },
        recordedAt: Date,
      },
      oxygenSaturation: {
        value: Number,
        unit: { type: String, default: 'percent' },
        recordedAt: Date,
      },
      weight: {
        value: Number,
        unit: { type: String, default: 'kg' },
        recordedAt: Date,
      },
      height: {
        value: Number,
        unit: { type: String, default: 'cm' },
        recordedAt: Date,
      },
    },

    physicalExamination: String,

    assessments: [
      {
        condition: String,
        isPrimary: Boolean,
        icdCode: String,
        severity: {
          type: String,
          enum: ['mild', 'moderate', 'severe', 'critical'],
        },
      },
    ],

    plan: String,

    followUpInstructions: String,

    prescribedMedications: [
      {
        medicationId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClinicalRecord',
        },
      },
    ],

    labOrdersPlaced: [
      {
        labOrderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClinicalRecord',
        },
      },
    ],

    imagingOrdersPlaced: [
      {
        imagingOrderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClinicalRecord',
        },
      },
    ],

    proceduresPerformed: [
      {
        name: String,
        code: String,
        description: String,
      },
    ],

    attachments: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
      },
    ],

    status: {
      type: String,
      enum: ['in_progress', 'completed', 'cancelled', 'no_show'],
      default: 'in_progress',
    },

    dischargeInformation: {
      dischargeSummary: String,
      dischargeDiagnosis: [String],
      dischargeMedications: [String],
      dischargeInstructions: String,
      followUpAppointment: Date,
      dischargeTo: String, // e.g., 'home', 'another_facility'
    },

    costsAndBilling: {
      consultationFee: Number,
      procedureFees: Number,
      labTestFees: Number,
      medicationCharges: Number,
      totalAmount: Number,
      paymentStatus: {
        type: String,
        enum: ['pending', 'partial', 'paid'],
      },
    },

    qualityIndicators: {
      recordCompleteness: Number, // 0-100
      allMandatoryFieldsFilled: Boolean,
      documentationQuality: {
        type: String,
        enum: ['excellent', 'good', 'fair', 'poor'],
      },
    },
  },
  {
    timestamps: true,
    indexes: [
      { patientId: 1, encounterDate: -1 },
      { hospitalId: 1 },
      { providerId: 1 },
      { status: 1 },
      { encounterType: 1 },
      { 'assessments.icdCode': 1 },
    ],
  }
);

const Encounter = mongoose.models.Encounter || mongoose.model('Encounter', encounterSchema);
export default Encounter;
