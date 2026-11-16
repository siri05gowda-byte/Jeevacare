import mongoose from 'mongoose';

/**
 * DoctorSchedule Model
 * Manages doctor working hours, capacity, and facility-scoped availability
 * 
 * Used to calculate available appointment slots
 */
const doctorScheduleSchema = new mongoose.Schema(
  {
    // Link to healthcare professional
    professionalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthcareProfessional',
      required: true,
      index: true,
    },

    // Facility where this schedule applies
    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      required: true,
      index: true,
    },

    // Working schedule
    workingDays: {
      type: [String], // ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY']
      default: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
    },

    // Daily working hours
    dailySchedule: {
      startTime: {
        type: String, // HH:MM format, e.g., "09:00"
        required: true,
      },
      endTime: {
        type: String, // HH:MM format, e.g., "17:00"
        required: true,
      },
      breakStartTime: String, // e.g., "13:00"
      breakEndTime: String,   // e.g., "14:00"
    },

    // Appointment duration in minutes
    appointmentDuration: {
      type: Number,
      default: 30,
      min: 15,
      max: 120,
    },

    // Maximum appointments per day
    maxAppointmentsPerDay: {
      type: Number,
      default: 20,
      min: 1,
    },

    // Unavailable/leave dates
    unavailableDates: [
      {
        date: Date,
        reason: String, // e.g., "Medical leave", "Training", "Holiday"
        allDay: {
          type: Boolean,
          default: true,
        },
        startTime: String, // If not allDay
        endTime: String,   // If not allDay
      },
    ],

    // Special hours for specific dates
    specialHours: [
      {
        date: Date,
        startTime: String,
        endTime: String,
        maxAppointments: Number,
      },
    ],

    // Status
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
      index: true,
    },

    // When schedule is effective from
    effectiveFrom: {
      type: Date,
      default: Date.now,
    },

    // When schedule ends (if applicable)
    effectiveUntil: Date,

    // Created/modified info
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
      { professionalId: 1, hospitalId: 1 },
      { hospitalId: 1, status: 1 },
      { status: 1 },
      { 'unavailableDates.date': 1 },
    ],
  }
);

const DoctorSchedule = mongoose.models.DoctorSchedule || mongoose.model('DoctorSchedule', doctorScheduleSchema);
export default DoctorSchedule;

