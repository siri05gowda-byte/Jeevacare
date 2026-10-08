import mongoose from 'mongoose';

/**
 * AppointmentToken Model
 * Manages patient queue and token status for appointments
 * 
 * States: CHECKED_IN → TOKEN_ASSIGNED → WAITING → IN_CONSULTATION → COMPLETED
 */
const appointmentTokenSchema = new mongoose.Schema(
  {
    // Link to appointment
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
      index: true,
    },

    // Patient info
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // Facility and doctor
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },

    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    // Appointment date (for daily queue)
    appointmentDate: {
      type: Date,
      required: true,
      index: true,
    },

    // Token information
    tokenNumber: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    // Queue position
    queuePosition: Number,

    // Token status flow
    status: {
      type: String,
      enum: ['checked_in', 'token_assigned', 'waiting', 'in_consultation', 'completed', 'no_show', 'cancelled'],
      default: 'checked_in',
      index: true,
    },

    // Check-in information
    checkedInAt: Date,
    checkedInBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Token assignment
    tokenAssignedAt: Date,
    tokenAssignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Consultation information
    consultationStartedAt: Date,
    consultationEndedAt: Date,
    consultationDuration: Number, // in minutes

    // Completion/no-show
    completedAt: Date,
    completedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    noShowAt: Date,
    noShowReason: String,

    // Cancellation
    cancelledAt: Date,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    cancellationReason: String,

    // Wait time metrics
    waitTimeMinutes: Number, // from check-in to consultation start
    estimatedWaitTime: Number, // estimated at token assignment

    // Link to encounter if created
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
      sparse: true,
    },

    // Notes
    notes: String,
  },
  {
    timestamps: true,
    indexes: [
      { appointmentId: 1 },
      { appointmentDate: 1, hospitalId: 1, professionalId: 1 },
      { hospitalId: 1, appointmentDate: 1 },
      { status: 1 },
      { patientId: 1, appointmentDate: -1 },
    ],
  }
);

// Ensure only one active token per appointment
appointmentTokenSchema.index(
  { appointmentId: 1, status: 1 },
  { unique: false }
);

const AppointmentToken = mongoose.models.AppointmentToken || mongoose.model('AppointmentToken', appointmentTokenSchema);
export default AppointmentToken;

