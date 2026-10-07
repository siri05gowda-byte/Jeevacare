import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },

    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },

    startTime: String,

    endTime: String,

    duration: {
      type: Number,
      default: 30, // in minutes
    },

    appointmentType: {
      type: String,
      enum: ['consultation', 'follow_up', 'procedure', 'vaccination', 'checkup', 'emergency', 'other'],
      default: 'consultation',
    },

    tokenNumber: String,

    reasonForVisit: String,

    notes: String,

    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show', 'rescheduled'],
      default: 'scheduled',
      index: true,
    },

    // Link to resulting encounter
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
      sparse: true,
    },

    // Cancellation information
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: String,

    // Rescheduling information
    rescheduledFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
    },
    rescheduledReason: String,

    // Check-in information
    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Patient-provided information for appointment
    patientSymptoms: String,
    patientMedicalHistory: String,
    currentMedications: [String],
    allergies: [String],
    emergencyContact: String,

    // Completion information
    completedAt: Date,
    appointmentNotes: String,
    prescribedTests: [String],
    prescribedMedications: [String],
    followUpAppointmentRequired: Boolean,
    followUpAppointmentDate: Date,

    // Billing information
    estimatedCost: Number,
    actualCost: Number,
    paymentStatus: {
      type: String,
      enum: ['pending', 'partial', 'paid', 'refunded'],
      default: 'pending',
    },
    paymentMethod: String,

    // Reminder tracking
    reminderSent: Boolean,
    reminderSentAt: Date,
    reminderChannel: {
      type: String,
      enum: ['sms', 'email', 'both'],
    },

    // Video consultation details (if applicable)
    isVirtualConsultation: {
      type: Boolean,
      default: false,
    },
    meetingLink: String,
    meetingStartedAt: Date,
    meetingEndedAt: Date,
  },
  {
    timestamps: true,
    indexes: [
      { patientId: 1, appointmentDate: -1 },
      { providerId: 1, appointmentDate: 1 },
      { hospitalId: 1, appointmentDate: 1 },
      { status: 1 },
      { appointmentDate: 1 },
      { createdAt: -1 },
    ],
  }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
