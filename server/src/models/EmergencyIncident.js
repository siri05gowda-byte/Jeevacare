import mongoose from 'mongoose';

const emergencyIncidentSchema = new mongoose.Schema(
  {
    // Unique incident identifier
    incidentId: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },

    // Patient Information (may be unknown initially)
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      sparse: true,
      index: true,
    },

    // Patient identification status
    patientIdentificationStatus: {
      type: String,
      enum: ['unknown', 'pending_verification', 'identified', 'ambiguous', 'not_found'],
      default: 'unknown',
      index: true,
    },

    // If patient cannot be immediately identified
    unknownPatientInfo: {
      approximateAge: String,
      sex: String,
      description: String,
      distinguishingFeatures: String,
      identificationDocuments: [
        {
          documentType: String,
          documentValue: String,
          verified: Boolean,
        },
      ],
    },

    // Incident Details
    incidentType: {
      type: String,
      enum: [
        'road_accident',
        'collapse',
        'unconscious_patient',
        'acute_emergency',
        'poison_overdose',
        'trauma',
        'medical_emergency',
        'psychiatric_emergency',
        'other',
      ],
      required: true,
      index: true,
    },

    incidentDescription: {
      type: String,
      maxlength: 5000,
      required: true,
    },

    // Incident Location
    location: {
      latitude: Number,
      longitude: Number,
      address: String,
      landmark: String,
    },

    // Date and Time
    incidentDateTime: {
      type: Date,
      required: true,
      index: true,
    },

    // Receiving Facility
    receivingFacilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
      sparse: true,
    },

    receivingFacilityName: String,

    receivingDateTime: Date,

    // Rescuer Information
    rescuers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Rescuer',
      },
    ],

    // Witness Information
    witnesses: [
      {
        name: String,
        contactInfo: String,
        statement: String,
        recordedAt: Date,
        recordedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Supporting Documents
    documents: [
      {
        documentId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Document',
        },
        documentType: String,
        uploadedAt: Date,
        uploadedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
      },
    ],

    // Initial Assessment (by paramedics/emergency staff)
    initialAssessment: {
      consciousnessLevel: String,
      vitalsIfAvailable: {
        heartRate: Number,
        bloodPressure: String,
        temperature: Number,
        respiratoryRate: Number,
        oxygenSaturation: Number,
      },
      injuriesObserved: String,
      initialTreatment: String,
      assessedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      assessedAt: Date,
    },

    // Incident Status
    incidentStatus: {
      type: String,
      enum: ['reported', 'in_transit', 'received', 'resolved', 'escalated', 'closed'],
      default: 'reported',
      index: true,
    },

    // Patient Identification Resolution
    identificationResolution: {
      status: {
        type: String,
        enum: ['pending', 'resolved', 'unable_to_identify'],
        default: 'pending',
      },
      identificationMethod: String, // e.g., "JeevaCare ID", "ID card", "family identification"
      identificationVerifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      identificationVerifiedAt: Date,
      identificationNotes: String,
    },

    // Clinical Encounter Link (if created)
    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
      sparse: true,
    },

    // Emergency Notes
    emergencyNotes: String,

    // Police/Authority Information (if applicable)
    authorityReported: {
      type: Boolean,
      default: false,
    },

    authorityType: String, // e.g., "police", "fire department"

    caseNumber: String,

    officerName: String,

    // Audit Information
    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    lastUpdatedAt: Date,

    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Sensitivity flags
    sensitivityFlags: [String], // e.g., "requires_police_follow_up", "potential_self_harm"

    // Privacy flags
    privateNotes: String, // Notes not visible to patient
  },
  {
    timestamps: false,
    indexes: [
      { incidentId: 1 },
      { patientId: 1 },
      { incidentType: 1 },
      { incidentDateTime: -1 },
      { incidentStatus: 1 },
      { patientIdentificationStatus: 1 },
      { receivingFacilityId: 1 },
      { createdAt: -1 },
    ],
  }
);

// Generate incident ID before saving
emergencyIncidentSchema.pre('save', async function (next) {
  if (!this.incidentId) {
    // Format: EI-YYYY-MM-DD-XXXXX
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    this.incidentId = `EI-${date}-${random}`;
  }
  next();
});

const EmergencyIncident = mongoose.model('EmergencyIncident', emergencyIncidentSchema);
export default EmergencyIncident;
