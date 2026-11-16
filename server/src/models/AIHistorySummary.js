import mongoose from 'mongoose';

const aiHistorySummarySchema = new mongoose.Schema(
  {
    // Patient being summarized
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    // User requesting the summary
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    requestedByRole: {
      type: String,
      enum: ['PATIENT', 'GUARDIAN', 'DOCTOR', 'NURSE', 'HOSPITAL_ADMIN', 'EMERGENCY', 'SYSTEM_ADMIN'],
      required: true,
    },

    // When generated
    generatedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    // Summary type
    summaryType: {
      type: String,
      enum: ['medical_summary', 'patient_explanation'],
      default: 'medical_summary',
    },

    // Language of the summary
    language: {
      type: String,
      enum: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
      default: 'en',
      index: true,
    },

    // Source records that went into this summary
    sourceRecordIds: [
      {
        recordId: mongoose.Schema.Types.ObjectId,
        recordType: {
          type: String,
          enum: [
            'vaccination',
            'laboratory_result',
            'radiology_record',
            'discharge_summary',
            'encounter',
            'clinical_record',
            'medication',
            'allergy',
            'condition',
          ],
        },
        recordTimestamp: Date,
        _id: false,
      },
    ],

    // Version timestamp of the latest source record included
    sourceDataVersion: Date,

    // The actual summary content organized by section
    summaryContent: {
      // Patient overview
      overview: {
        patientName: String,
        age: Number,
        bloodGroup: String,
        primaryLanguage: String,
        lastUpdated: Date,
      },

      // Allergies section
      allergies: {
        documented: [String], // e.g., ["Penicillin", "Ibuprofen"]
        notes: String,
      },

      // Current medications
      currentMedications: {
        medications: [
          {
            name: String,
            dosage: String,
            frequency: String,
            startDate: Date,
            indication: String,
          },
        ],
        lastUpdated: Date,
      },

      // Major conditions
      conditions: {
        active: [String], // e.g., ["Hypertension", "Type 2 Diabetes"]
        historical: [String],
        notes: String,
        lastUpdated: Date,
      },

      // Vaccinations
      vaccinations: {
        completed: [
          {
            vaccine: String,
            date: Date,
            provider: String,
            status: String,
          },
        ],
        pending: [String],
        notes: String,
        lastUpdated: Date,
      },

      // Recent laboratory investigations
      laboratoryInvestigations: {
        recent: [
          {
            testName: String,
            result: String,
            referenceRange: String,
            date: Date,
            status: String,
          },
        ],
        abnormal: [
          {
            testName: String,
            result: String,
            referenceRange: String,
            date: Date,
          },
        ],
        lastUpdated: Date,
      },

      // Radiology studies
      radiologyStudies: {
        recent: [
          {
            studyType: String,
            findings: String,
            date: Date,
            facility: String,
          },
        ],
        significant: [
          {
            studyType: String,
            findings: String,
            date: Date,
          },
        ],
        lastUpdated: Date,
      },

      // Previous procedures and surgeries
      proceduresAndSurgeries: {
        procedures: [
          {
            procedure: String,
            date: Date,
            facility: String,
            outcome: String,
          },
        ],
        surgeries: [
          {
            surgery: String,
            date: Date,
            indication: String,
            outcome: String,
          },
        ],
        lastUpdated: Date,
      },

      // Hospitalizations
      hospitalizations: {
        recent: [
          {
            date: Date,
            reason: String,
            duration: String,
            facility: String,
            outcome: String,
          },
        ],
        significant: [
          {
            date: Date,
            reason: String,
            facility: String,
          },
        ],
        lastUpdated: Date,
      },

      // Recent consultations
      consultations: {
        recent: [
          {
            specialty: String,
            date: Date,
            provider: String,
            findings: String,
          },
        ],
        lastUpdated: Date,
      },

      // Discharge and follow-up information
      dischargeAndFollowUp: {
        recentDischarges: [
          {
            date: Date,
            diagnosis: String,
            followUpRequired: Boolean,
            followUpDetails: String,
          },
        ],
        pendingFollowUps: [
          {
            item: String,
            dueDate: Date,
            provider: String,
          },
        ],
        lastUpdated: Date,
      },

      // Important documented events
      importantEvents: [
        {
          event: String,
          date: Date,
          significance: String,
        },
      ],

      // Missing or unclear information
      missingInformation: [
        {
          field: String,
          reason: String,
        },
      ],

      // Custom notes from summary generation
      notes: String,
    },

    // Safety disclaimers always included
    disclaimers: {
      type: [String],
      default: [
        'This AI-generated summary is based on your JeevaCare clinical records.',
        'It is for information and understanding only and does not replace professional medical advice.',
        'Always consult a qualified healthcare professional for medical decisions.',
        'This summary does not constitute a medical diagnosis or treatment recommendation.',
      ],
    },

    // Cache status
    cacheStatus: {
      type: String,
      enum: ['fresh', 'stale', 'regenerating'],
      default: 'fresh',
    },

    // Generation status
    generationStatus: {
      type: String,
      enum: ['success', 'partial', 'failed'],
      default: 'success',
    },

    generationError: String, // If generation failed, error message

    // Reference to audit event for this generation
    auditEventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AuditEvent',
      sparse: true,
    },

    // When this summary expires (staleness marker)
    expiresAt: Date,

    // Model/provider information
    modelInfo: {
      provider: String, // 'openai', 'anthropic', 'ollama', 'mock', etc.
      model: String,
      isDemo: Boolean,
    },

    // Structured metadata for audit/compliance
    metadata: {
      sourceRecordCount: Number,
      sourceRecordTypes: [String],
      generationDurationMs: Number,
      tokenEstimate: Number, // For LLM cost tracking
    },

    // Status
    status: {
      type: String,
      enum: ['active', 'archived', 'failed'],
      default: 'active',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for querying latest summary for a patient
aiHistorySummarySchema.index({ patientId: 1, language: 1, generatedAt: -1 });

// Index for finding stale summaries
aiHistorySummarySchema.index({ patientId: 1, expiresAt: 1, cacheStatus: 1 });

// Index for audit trail
aiHistorySummarySchema.index({ requestedBy: 1, generatedAt: -1 });

export default mongoose.model('AIHistorySummary', aiHistorySummarySchema);
