import mongoose from 'mongoose';

const clinicalRecordSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
      index: true,
    },

    encounterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Encounter',
      sparse: true,
    },

    recordType: {
      type: String,
      enum: [
        'diagnosis',
        'medication',
        'vaccination',
        'laboratory_result',
        'radiology_report',
        'procedure',
        'surgery',
        'hospitalization',
        'discharge_summary',
        'allergy',
        'vital_observation',
        'growth_observation',
        'chronic_condition',
        'supporting_document',
        'clinical_note',
      ],
      required: true,
      index: true,
    },

    recordDate: {
      type: Date,
      required: true,
      index: true,
    },

    providerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    hospitalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Hospital',
    },

    // Verification and Provenance - CRITICAL FOR RECORD INTEGRITY
    verificationStatus: {
      type: String,
      enum: [
        'provider_verified',     // Official clinical record from verified provider
        'patient_uploaded',       // Uploaded by patient, not yet verified
        'patient_reported',       // Patient-reported information (e.g., allergy)
        'pending_review',         // Waiting for provider review
        'amended',                // This is an amended version
        'restricted',             // Access restricted
        'ai_generated',           // AI-generated explanation/summary
      ],
      default: 'pending_review',
      index: true,
    },

    sourceDocument: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
    },

    // Amendment History - preserve all historical versions
    amendmentHistory: [
      {
        originalRecordId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'ClinicalRecord',
        },
        amendedAt: Date,
        amendedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        reason: String,
        previousData: mongoose.Schema.Types.Mixed,
      },
    ],

    // Type-specific data structures
    data: {
      // For diagnosis
      condition: String,
      icdCode: String,
      severity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'critical'],
      },
      status: {
        type: String,
        enum: ['active', 'resolved', 'chronic'],
      },

      // For medication
      medicationName: String,
      dosage: String,
      frequency: String,
      route: {
        type: String,
        enum: ['oral', 'injection', 'topical', 'inhaled', 'intravenous'],
      },
      startDate: Date,
      endDate: Date,
      indication: String,
      sideEffects: [String],

      // For vaccination
      vaccineName: String,
      dose: String,
      administrationDate: Date,
      batchNumber: String,
      provider: String,
      nextScheduledDate: Date,

      // For allergy
      allergen: String,
      allergyType: String,
      reactionSeverity: {
        type: String,
        enum: ['mild', 'moderate', 'severe', 'anaphylaxis'],
      },
      reaction: String,
      dateOnset: Date,

      // For vital observations (historical - not permanent patient data)
      vitalType: String, // temperature, blood_pressure, heart_rate, etc.
      vitalValue: Number,
      vitalUnit: String,
      observedAt: Date,

      // For growth observations (historical - not permanent patient data)
      growthMetric: String, // height, weight, head_circumference, bmi
      metricValue: Number,
      metricUnit: String,
      percentile: Number,
      observedAt: Date,

      // For laboratory result
      labTestName: String,
      labTestCode: String,
      sampleCollectionDate: Date,
      resultReceivedDate: Date,
      results: [
        {
          testName: String,
          value: String,
          unit: String,
          referenceRange: String,
          normalRange: String,
          isAbnormal: Boolean,
          flag: {
            type: String,
            enum: ['H', 'L', 'N'], // High, Low, Normal
          },
        },
      ],

      // For radiology
      modalityType: String, // X-ray, CT, MRI, Ultrasound, etc.
      bodyPart: String,
      findings: String,
      impression: String,
      reportDate: Date,

      // For procedure/surgery
      procedureName: String,
      procedureCode: String,
      description: String,
      outcome: String,
      complications: [String],
      performedAt: Date,

      // For discharge summary
      admissionDate: Date,
      dischargeDate: Date,
      primaryDiagnosis: String,
      secondaryDiagnoses: [String],
      procedures: [String],
      medications: [String],
      dischargeInstructions: String,
      followUpRequired: Boolean,
    },

    // ===== PHASE 4 PROVIDER VERIFICATION TRACKING =====
    // Comprehensive provider verification and attribution
    providerVerification: {
      // Professional who created this record
      professionalId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HealthcareProfessional',
        index: true,
      },
      professionalIdString: String, // Denormalized: HP-YYMMDD-XXXXX for quick reference

      // Professional details at time of creation (for historical accuracy)
      professionalName: String,
      professionalType: String, // doctor, nurse, etc.
      professionalLicense: String, // License number if applicable

      // Facility where record was created
      facilityId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Hospital',
        index: true,
      },
      facilityIdString: String, // Denormalized: FH-YYMMDD-XXXXX
      facilityName: String,

      // Staff association at time of creation
      staffAssociationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HospitalStaff',
      },
      staffRole: String, // doctor, nurse, etc. (at facility)

      // Authorization verification
      authorizationVerifiedAt: Date,
      authorizationDetails: {
        userVerified: Boolean,
        professionalVerified: Boolean,
        facilityVerified: Boolean,
        staffAssociationActive: Boolean,
        roleAuthorized: Boolean,
        permissionGranted: Boolean,
        credentialsValid: Boolean,
        patientAccessible: Boolean,
        allChecksPassed: Boolean,
      },

      // Credentials at time of creation
      validCredentials: [
        {
          credentialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'ProfessionalCredential',
          },
          credentialType: String,
          credentialName: String,
          credentialNumber: String,
          expiryDate: Date,
          status: String,
        },
      ],

      // Digital signature/attribution
      createdAt: Date, // Record creation timestamp
      createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        index: true,
      },
    },

    // Traditional verification (for reviewing/verifying provider-created records)
    verificationDetails: {
      verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      verifiedAt: Date,
      verificationNotes: String,
    },

    // For patient corrections
    correctionRequested: {
      type: Boolean,
      default: false,
    },

    correctionRequest: {
      requestId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'CorrectionRequest',
      },
      requestedAt: Date,
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      reason: String,
      status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'clarified'],
      },
    },

    // Accessibility information
    accessibility: {
      ocrExtractedText: String,
      ocrQualityScore: Number,
      aiExplanationAvailable: Boolean,
      multilingualAvailable: [String],
      audioAvailable: Boolean,
    },

    // Audit information
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // Security and privacy
    accessRestrictions: [
      {
        restrictedFrom: String, // Role or user type
        reason: String,
      },
    ],

    // Flag for sensitive information
    flaggedAsSensitive: Boolean,
  },
  {
    timestamps: true,
    indexes: [
      { patientId: 1, recordDate: -1 },
      { recordType: 1 },
      { verificationStatus: 1 },
      { hospitalId: 1 },
      { providerId: 1 },
      { 'data.icdCode': 1 },
      { 'data.allergen': 1 },
      { createdAt: -1 },
      // Phase 4 provider verification indexes
      { 'providerVerification.professionalId': 1 },
      { 'providerVerification.facilityId': 1 },
      { 'providerVerification.staffAssociationId': 1 },
      { 'providerVerification.createdByUserId': 1 },
      { 'providerVerification.professionalIdString': 1 },
      { 'providerVerification.facilityIdString': 1 },
    ],
  }
);

// Prevent direct modification of provider-verified records (use amendments instead)
// Pre-save hook for document.save()
clinicalRecordSchema.pre('save', function (next) {
  // Only enforce on updates (not initial creation)
  if (!this.isNew) {
    // Check if this is a provider-verified record
    if (this.verificationStatus === 'provider_verified') {
      // Allow only amendmentHistory modifications, verification details, and internal fields
      const modifiedPaths = this.modifiedPaths();
      const nonAmendmentChanges = modifiedPaths.filter(path => 
        !path.startsWith('amendmentHistory') && 
        !path.startsWith('verificationDetails') &&
        path !== '__v' && 
        path !== 'updatedAt' &&
        path !== 'verificationStatus' // Allow status to remain unchanged or transition to verified
      );
      
      if (nonAmendmentChanges.length > 0) {
        return next(new Error('Provider-verified clinical records are immutable. Use amendment workflow instead.'));
      }
    }
  }
  next();
});

// Pre-update hooks for query-based updates
clinicalRecordSchema.pre('findByIdAndUpdate', async function (next) {
  const docToUpdate = await this.model.findOne(this.getFilter());

  if (docToUpdate && docToUpdate.verificationStatus === 'provider_verified') {
    const update = this.getUpdate();

    if (update.$set && Object.keys(update.$set).some((key) => key !== '_id' && key !== 'amendmentHistory')) {
      throw new Error('Provider-verified clinical records are immutable. Use amendment workflow instead.');
    }
  }

  next();
});

clinicalRecordSchema.pre('findOneAndUpdate', async function (next) {
  const docToUpdate = await this.model.findOne(this.getFilter());

  if (docToUpdate && docToUpdate.verificationStatus === 'provider_verified') {
    const update = this.getUpdate();

    if (update.$set && Object.keys(update.$set).some((key) => key !== '_id' && key !== 'amendmentHistory')) {
      throw new Error('Provider-verified clinical records are immutable. Use amendment workflow instead.');
    }
  }

  next();
});

clinicalRecordSchema.pre('updateOne', async function (next) {
  const docToUpdate = await this.model.findOne(this.getFilter());

  if (docToUpdate && docToUpdate.verificationStatus === 'provider_verified') {
    throw new Error('Provider-verified clinical records are immutable. Use amendment workflow instead.');
  }

  next();
});

clinicalRecordSchema.pre('updateMany', async function (next) {
  const docsToUpdate = await this.model.find(this.getFilter());
  const hasVerified = docsToUpdate.some(doc => doc.verificationStatus === 'provider_verified');

  if (hasVerified) {
    throw new Error('Provider-verified clinical records are immutable. Use amendment workflow instead.');
  }

  next();
});

// Prevent deletion of provider-verified records
clinicalRecordSchema.pre('findOneAndDelete', async function (next) {
  const docToDelete = await this.model.findOne(this.getFilter());

  if (docToDelete && docToDelete.verificationStatus === 'provider_verified') {
    throw new Error('Provider-verified clinical records cannot be deleted. Use amendment workflow to mark as restricted.');
  }

  next();
});

clinicalRecordSchema.pre('findByIdAndDelete', async function (next) {
  const docToDelete = await this.model.findOne(this.getFilter());

  if (docToDelete && docToDelete.verificationStatus === 'provider_verified') {
    throw new Error('Provider-verified clinical records cannot be deleted. Use amendment workflow to mark as restricted.');
  }

  next();
});

clinicalRecordSchema.pre('deleteOne', async function (next) {
  const docToDelete = await this.model.findOne(this.getFilter());

  if (docToDelete && docToDelete.verificationStatus === 'provider_verified') {
    throw new Error('Provider-verified clinical records cannot be deleted. Use amendment workflow to mark as restricted.');
  }

  next();
});

clinicalRecordSchema.pre('deleteMany', async function (next) {
  const docsToDelete = await this.model.find(this.getFilter());
  const hasVerified = docsToDelete.some(doc => doc.verificationStatus === 'provider_verified');

  if (hasVerified) {
    throw new Error('Provider-verified clinical records cannot be deleted. Use amendment workflow to mark as restricted.');
  }

  next();
});

const ClinicalRecord = mongoose.models.ClinicalRecord || mongoose.model('ClinicalRecord', clinicalRecordSchema);
export default ClinicalRecord;

