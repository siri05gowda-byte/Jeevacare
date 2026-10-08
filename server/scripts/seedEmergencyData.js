/**
 * Seed Emergency Data Script
 * Creates synthetic emergency scenarios for testing and demonstration
 */

import mongoose from 'mongoose';
import { hashPassword } from '../src/utils/auth.js';
import config from '../src/config/index.js';
import User from '../src/models/User.js';
import Patient from '../src/models/Patient.js';
import EmergencyProfile from '../src/models/EmergencyProfile.js';
import EmergencyContact from '../src/models/EmergencyContact.js';
import EmergencyAccess from '../src/models/EmergencyAccess.js';
import EmergencyIncident from '../src/models/EmergencyIncident.js';
import Rescuer from '../src/models/Rescuer.js';
import logger from '../src/utils/logger.js';

async function seedEmergencyData() {
  try {
    // Connect to database
    await mongoose.connect(config.database.uri, config.database.options);
    logger.info('Connected to MongoDB');

    // Clear existing emergency demo data
    await User.deleteMany({ email: { $regex: '^emergency' } });
    await Patient.deleteMany({ 'personalIdentity.firstName': 'EmergencyDemo' });
    await EmergencyProfile.deleteMany({});
    await EmergencyContact.deleteMany({});
    await EmergencyAccess.deleteMany({});
    await EmergencyIncident.deleteMany({});
    await Rescuer.deleteMany({});
    logger.info('Cleared existing emergency demo data');

    // ==================== SCENARIO 1: Verified Adult with Critical Info ====================

    const patient1User = await User.create({
      email: 'emergency.verified.adult@demo.jeevacare.local',
      passwordHash: await hashPassword('demo123456'),
      role: 'PATIENT',
      profile: {
        firstName: 'EmergencyDemo',
        lastName: 'Verified',
      },
      status: 'active',
    });

    const patient1 = await Patient.create({
      userId: patient1User._id,
      personalIdentity: {
        firstName: 'Rajesh',
        lastName: 'Sharma',
        dateOfBirth: new Date('1965-03-15'),
        sex: 'M',
        phone: '9876543210',
        email: 'emergency.verified.adult@demo.jeevacare.local',
      },
      identityVerification: {
        status: 'verified',
        method: 'demo',
      },
      status: 'active',
    });

    const profile1 = await EmergencyProfile.create({
      patientId: patient1._id,
      allergies: [
        {
          allergen: 'Penicillin',
          severity: 'life-threatening',
          reaction: 'Anaphylaxis',
          source: 'provider_verified',
          verificationStatus: 'verified',
          recordedAt: new Date(),
          recordedBy: patient1User._id,
          verifiedBy: patient1User._id,
          verifiedAt: new Date(),
        },
        {
          allergen: 'Aspirin',
          severity: 'severe',
          reaction: 'Severe GI bleeding',
          source: 'patient_reported',
          verificationStatus: 'unverified',
          recordedAt: new Date(),
          recordedBy: patient1User._id,
        },
      ],
      criticalConditions: [
        {
          condition: 'Hypertension',
          status: 'active',
          severity: 'moderate',
          source: 'provider_verified',
          verificationStatus: 'verified',
          recordedAt: new Date(),
          recordedBy: patient1User._id,
          verifiedBy: patient1User._id,
          verifiedAt: new Date(),
        },
        {
          condition: 'Type 2 Diabetes',
          status: 'active',
          severity: 'moderate',
          source: 'provider_verified',
          verificationStatus: 'verified',
          recordedAt: new Date(),
          recordedBy: patient1User._id,
          verifiedBy: patient1User._id,
          verifiedAt: new Date(),
        },
      ],
      currentMedications: [
        {
          medicationName: 'Lisinopril',
          dosage: '10mg',
          frequency: 'Once daily',
          indication: 'Hypertension',
          source: 'provider_verified',
          verificationStatus: 'verified',
          startDate: new Date('2018-01-01'),
          recordedAt: new Date(),
          recordedBy: patient1User._id,
        },
        {
          medicationName: 'Metformin',
          dosage: '500mg',
          frequency: 'Twice daily',
          indication: 'Diabetes',
          source: 'provider_verified',
          verificationStatus: 'verified',
          startDate: new Date('2015-06-15'),
          recordedAt: new Date(),
          recordedBy: patient1User._id,
        },
      ],
      bloodGroup: {
        group: 'O+',
        source: 'provider_verified',
        verificationStatus: 'verified',
        recordedAt: new Date(),
        recordedBy: patient1User._id,
        verifiedBy: patient1User._id,
        verifiedAt: new Date(),
      },
      majorSurgeries: [
        {
          surgeryName: 'Appendectomy',
          date: new Date('2010-04-20'),
          facility: 'City Hospital',
          complications: 'None',
          source: 'provider_verified',
          verificationStatus: 'verified',
          recordedAt: new Date(),
          recordedBy: patient1User._id,
        },
      ],
      emergencyNotes: 'Known cardiac risk factors. Monitor BP closely during procedures.',
      status: 'active',
      lastUpdatedBy: patient1User._id,
    });

    patient1.emergencyProfileId = profile1._id;
    await patient1.save();

    // Add emergency contacts
    await EmergencyContact.create({
      emergencyProfileId: profile1._id,
      patientId: patient1._id,
      contactName: 'Priya Sharma',
      relationship: 'spouse',
      contactMethods: [
        { type: 'phone', value: '9876543211', primary: true, verified: true },
      ],
      priority: 1,
      authorizationStatus: 'active',
      consentGiven: true,
      consentGivenAt: new Date(),
      status: 'active',
      createdBy: patient1User._id,
    });

    logger.info('✓ Scenario 1: Verified adult with critical information');

    // ==================== SCENARIO 2: Patient with Patient-Reported Blood Group ====================

    const patient2User = await User.create({
      email: 'emergency.patient.reported@demo.jeevacare.local',
      passwordHash: await hashPassword('demo123456'),
      role: 'PATIENT',
      profile: {
        firstName: 'EmergencyDemo',
        lastName: 'PatientReported',
      },
      status: 'active',
    });

    const patient2 = await Patient.create({
      userId: patient2User._id,
      personalIdentity: {
        firstName: 'Priya',
        lastName: 'Kumar',
        dateOfBirth: new Date('1985-07-22'),
        sex: 'F',
        phone: '9123456789',
      },
      identityVerification: {
        status: 'verified',
        method: 'demo',
      },
      status: 'active',
    });

    const profile2 = await EmergencyProfile.create({
      patientId: patient2._id,
      bloodGroup: {
        group: 'AB-',
        source: 'patient_reported',
        verificationStatus: 'unverified',
        recordedAt: new Date(),
        recordedBy: patient2User._id,
      },
      allergies: [
        {
          allergen: 'Sulfonamides',
          severity: 'moderate',
          source: 'patient_reported',
          verificationStatus: 'unverified',
          recordedAt: new Date(),
          recordedBy: patient2User._id,
        },
      ],
      status: 'active',
      lastUpdatedBy: patient2User._id,
    });

    patient2.emergencyProfileId = profile2._id;
    await patient2.save();

    logger.info('✓ Scenario 2: Patient with patient-reported blood group');

    // ==================== SCENARIO 3: Unconscious Patient Emergency Incident ====================

    const docUser = await User.create({
      email: 'emergency.doc@demo.jeevacare.local',
      passwordHash: await hashPassword('demo123456'),
      role: 'DOCTOR',
      profile: {
        firstName: 'Dr.',
        lastName: 'Emergency',
      },
      status: 'active',
    });

    const incidentRes = await Rescuer.create({
      rescuerType: 'unknown',
      unknownRescuerInfo: {
        name: 'Traffic Police Officer',
        description: 'First responder at accident scene',
        verified: false,
      },
      profession: 'police',
      actionsPerformed: [
        {
          action: 'Called ambulance',
          timestamp: new Date(),
        },
        {
          action: 'Provided basic first aid',
          timestamp: new Date(),
        },
      ],
    });

    const incident = await EmergencyIncident.create({
      patientId: patient1._id,
      patientIdentificationStatus: 'identified',
      incidentType: 'road_accident',
      incidentDescription:
        'Two-wheeler accident on Main Road. Patient unconscious, found with JeevaCare ID card.',
      location: {
        address: 'Main Road, City',
        landmark: 'Near Central Hospital',
      },
      incidentDateTime: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      receivingFacilityName: 'Central Hospital',
      rescuers: [incidentRes._id],
      initialAssessment: {
        consciousnessLevel: 'Unconscious',
        vitalsIfAvailable: {
          heartRate: 88,
          bloodPressure: '140/90',
          temperature: 36.8,
          respiratoryRate: 18,
          oxygenSaturation: 95,
        },
        injuriesObserved: 'Head injury, abrasions on left arm',
        initialTreatment: 'Oxygen provided, bandaged wounds',
        assessedAt: new Date(Date.now() - 25 * 60 * 1000),
        assessedBy: docUser._id,
      },
      incidentStatus: 'received',
      identificationResolution: {
        status: 'resolved',
        identificationMethod: 'JeevaCare ID card',
        identificationVerifiedAt: new Date(Date.now() - 20 * 60 * 1000),
        identificationVerifiedBy: docUser._id,
      },
      createdAt: new Date(Date.now() - 30 * 60 * 1000),
      createdBy: docUser._id,
    });

    logger.info('✓ Scenario 3: Unconscious patient emergency incident');

    // ==================== SCENARIO 4: Emergency Incident with Unknown Rescuer ====================

    const anonIncidentRes = await Rescuer.create({
      rescuerType: 'anonymous',
      anonymousIndicator: 'Paramedic from private ambulance service',
      actionsPerformed: [
        {
          action: 'Provided oxygen support',
          timestamp: new Date(),
        },
        {
          action: 'Stabilized patient for transport',
          timestamp: new Date(),
        },
      ],
    });

    const unknownIncident = await EmergencyIncident.create({
      patientIdentificationStatus: 'pending_verification',
      unknownPatientInfo: {
        approximateAge: '45-50 years',
        sex: 'M',
        description: 'Male patient, found collapsed at public place',
      },
      incidentType: 'collapse',
      incidentDescription: 'Male patient found collapsed at Metro Station. No ID found. Conscious and responsive.',
      location: {
        address: 'Metro Station, Downtown',
      },
      incidentDateTime: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      rescuers: [anonIncidentRes._id],
      incidentStatus: 'reported',
      identificationResolution: {
        status: 'pending',
      },
      createdAt: new Date(Date.now() - 5 * 60 * 1000),
      createdBy: docUser._id,
    });

    logger.info('✓ Scenario 4: Emergency incident with unknown rescuer');

    // ==================== SCENARIO 5: Emergency Access Event ====================

    const accessEvent = await EmergencyAccess.create({
      patientId: patient1._id,
      professionalId: docUser._id,
      professionalRole: 'DOCTOR',
      accessReason: 'unconscious_patient',
      reasonDescription: 'Patient unconscious following road accident',
      accessLevel: 'emergency_profile',
      emergencyIncidentId: incident._id,
      authorizationStatus: 'authorized',
      authorizedBy: docUser._id,
      authorizationDateTime: new Date(Date.now() - 20 * 60 * 1000),
      requestDateTime: new Date(Date.now() - 25 * 60 * 1000),
      accessGrantedDateTime: new Date(Date.now() - 20 * 60 * 1000),
      accessExpirationDateTime: new Date(Date.now() + 40 * 60 * 1000), // Valid for 60 minutes
      accessDurationMinutes: 60,
      accessEvents: [
        {
          accessDateTime: new Date(Date.now() - 18 * 60 * 1000),
          dataAccessed: 'emergency_summary_view',
        },
      ],
      auditTrail: [
        {
          action: 'request_submitted',
          timestamp: new Date(Date.now() - 25 * 60 * 1000),
          actor: docUser._id,
        },
        {
          action: 'authorized',
          timestamp: new Date(Date.now() - 20 * 60 * 1000),
          actor: docUser._id,
        },
      ],
      status: 'active',
    });

    logger.info('✓ Scenario 5: Emergency access event');

    // ==================== SCENARIO 6: Registered Rescuer ====================

    const rescuerUser = await User.create({
      email: 'emergency.rescuer@demo.jeevacare.local',
      passwordHash: await hashPassword('demo123456'),
      role: 'EMERGENCY',
      profile: {
        firstName: 'Paramvir',
        lastName: 'Singh',
      },
      status: 'active',
    });

    const rescuerPatient = await Patient.create({
      userId: rescuerUser._id,
      personalIdentity: {
        firstName: 'Paramvir',
        lastName: 'Singh',
        dateOfBirth: new Date('1990-05-10'),
        sex: 'M',
      },
      status: 'active',
    });

    const registeredRescuer = await Rescuer.create({
      rescuerType: 'registered_jeevacare',
      registeredUserId: rescuerUser._id,
      registeredPatientId: rescuerPatient._id,
      profession: 'paramedic',
      actionsPerformed: [
        {
          action: 'Provided emergency medical care',
          timestamp: new Date(),
        },
      ],
    });

    logger.info('✓ Scenario 6: Registered rescuer');

    // ==================== SUMMARY ====================

    logger.info('');
    logger.info('============================================');
    logger.info('Emergency Data Seeding Completed');
    logger.info('============================================');
    logger.info('');
    logger.info('DEMO ACCOUNTS:');
    logger.info('  Verified Adult:');
    logger.info('    Email: emergency.verified.adult@demo.jeevacare.local');
    logger.info('    Password: demo123456');
    logger.info('    JeevaId: ' + patient1.jeevaId);
    logger.info('');
    logger.info('  Patient (Reported Blood Group):');
    logger.info('    Email: emergency.patient.reported@demo.jeevacare.local');
    logger.info('    Password: demo123456');
    logger.info('    JeevaId: ' + patient2.jeevaId);
    logger.info('');
    logger.info('  Doctor:');
    logger.info('    Email: emergency.doc@demo.jeevacare.local');
    logger.info('    Password: demo123456');
    logger.info('');
    logger.info('  Rescuer:');
    logger.info('    Email: emergency.rescuer@demo.jeevacare.local');
    logger.info('    Password: demo123456');
    logger.info('');
    logger.info('EMERGENCY SCENARIOS:');
    logger.info('  ✓ Verified adult with critical allergies and conditions');
    logger.info('  ✓ Patient with patient-reported blood group (unverified)');
    logger.info('  ✓ Unconscious patient incident (identified via JeevaId)');
    logger.info('  ✓ Unknown patient incident (identification pending)');
    logger.info('  ✓ Active emergency access event (60-minute window)');
    logger.info('  ✓ Registered rescuer (paramedic)');
    logger.info('');

    await mongoose.disconnect();
    logger.info('Database disconnected');
  } catch (error) {
    logger.error(`Seeding failed: ${error.message}`);
    process.exit(1);
  }
}

// Run seeding
seedEmergencyData();
