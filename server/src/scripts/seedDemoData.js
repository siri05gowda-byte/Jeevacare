/**
 * Seed Demo Data Script
 * Creates synthetic demo patients and relationships for development/testing
 */

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import GuardianRelationship from '../models/GuardianRelationship.js';
import ParentRelationship from '../models/ParentRelationship.js';

const seedDemoData = async () => {
  try {
    logger.info('🌱 Starting demo data seeding...\n');

    // Connect to database
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✅ Connected to MongoDB\n');

    // Clear existing demo data (optional - comment out to preserve)
    // await User.deleteMany({ email: /demo|test/ });
    // await Patient.deleteMany({ 'personalIdentity.email': /demo|test/ });

    // ======================================
    // 1. CREATE ADULT PATIENT
    // ======================================
    logger.info('📝 Creating demo adult patient...');

    const adultUserPassword = await bcryptjs.hash('demo123456', 10);
    const adultUser = await User.create({
      email: 'adult.patient@demo.jeevacare.local',
      passwordHash: adultUserPassword,
      role: 'PATIENT',
      status: 'active',
      profile: {
        firstName: 'Rajesh',
        lastName: 'Kumar',
        phone: '9876543210',
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });

    const adultPatient = await Patient.create({
      userId: adultUser._id,
      personalIdentity: {
        firstName: 'Rajesh',
        lastName: 'Kumar',
        dateOfBirth: new Date('1990-03-15'),
        sex: 'M',
        phone: '9876543210',
        email: 'adult.patient@demo.jeevacare.local',
      },
      identityVerification: {
        status: 'verified',
        method: 'demo',
        verifiedAt: new Date(),
      },
      bloodGroup: {
        group: 'O+',
        source: 'provider_verified',
        verificationStatus: 'verified',
        recordedAt: new Date(),
      },
      preferences: {
        language: 'en',
        audioEnabled: false,
      },
      status: 'active',
    });

    logger.info(`   ✅ Adult patient: ${adultPatient.jeevaId}`);
    logger.info(`      Email: ${adultUser.email}`);
    logger.info(`      Name: ${adultPatient.personalIdentity.firstName} ${adultPatient.personalIdentity.lastName}\n`);

    // ======================================
    // 2. CREATE NEWBORN PATIENT WITH PARENTS
    // ======================================
    logger.info('👶 Creating demo newborn patient...');

    // Mother user
    const motherPassword = await bcryptjs.hash('demo123456', 10);
    const motherUser = await User.create({
      email: 'mother.patient@demo.jeevacare.local',
      passwordHash: motherPassword,
      role: 'PATIENT',
      status: 'active',
      profile: {
        firstName: 'Priya',
        lastName: 'Sharma',
        phone: '9876543211',
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });

    const motherPatient = await Patient.create({
      userId: motherUser._id,
      personalIdentity: {
        firstName: 'Priya',
        lastName: 'Sharma',
        dateOfBirth: new Date('1995-07-22'),
        sex: 'F',
        phone: '9876543211',
        email: 'mother.patient@demo.jeevacare.local',
      },
      identityVerification: {
        status: 'verified',
        method: 'demo',
        verifiedAt: new Date(),
      },
      preferences: {
        language: 'hi',
        audioEnabled: true,
      },
      status: 'active',
    });

    // Newborn
    const newbornPatient = await Patient.create({
      personalIdentity: {
        firstName: 'Aditya',
        lastName: 'Sharma',
        dateOfBirth: new Date('2026-08-01'),
        sex: 'M',
      },
      birthInformation: {
        placeOfBirth: 'Apollo Hospital, Mumbai',
        timeOfBirth: '14:30',
        birthWeight: {
          value: 3.2,
          unit: 'kg',
        },
        birthLength: {
          value: 50,
          unit: 'cm',
        },
        headCircumference: {
          value: 34,
          unit: 'cm',
        },
        recordedAt: new Date('2026-08-01'),
      },
      identityVerification: {
        status: 'pending',
        method: 'birth_record',
      },
      bloodGroup: {
        group: 'B+',
        source: 'birth_record',
        verificationStatus: 'pending_review',
        recordedAt: new Date('2026-08-01'),
      },
      status: 'active',
    });

    logger.info(`   ✅ Newborn patient: ${newbornPatient.jeevaId}`);
    logger.info(`      Name: ${newbornPatient.personalIdentity.firstName}`);
    logger.info(`      Mother: ${motherPatient.jeevaId}\n`);

    // Link parent relationship
    const parentRelationship = await ParentRelationship.create({
      childPatientId: newbornPatient._id,
      parentPatientId: motherPatient._id,
      relationship: 'mother',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      status: 'active',
    });

    logger.info(`   ✅ Parent relationship created\n`);

    // ======================================
    // 3. CREATE MINOR PATIENT WITH GUARDIAN
    // ======================================
    logger.info('👧 Creating demo minor patient with guardian...');

    // Minor patient user
    const minorPassword = await bcryptjs.hash('demo123456', 10);
    const minorUser = await User.create({
      email: 'minor.patient@demo.jeevacare.local',
      passwordHash: minorPassword,
      role: 'PATIENT',
      status: 'active',
      profile: {
        firstName: 'Ananya',
        lastName: 'Gupta',
        phone: '9876543212',
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });

    const minorPatient = await Patient.create({
      userId: minorUser._id,
      personalIdentity: {
        firstName: 'Ananya',
        lastName: 'Gupta',
        dateOfBirth: new Date('2015-12-10'),
        sex: 'F',
        phone: '9876543212',
        email: 'minor.patient@demo.jeevacare.local',
      },
      identityVerification: {
        status: 'verified',
        method: 'demo',
        verifiedAt: new Date(),
      },
      bloodGroup: {
        group: 'A+',
        source: 'lab_test',
        verificationStatus: 'verified',
        recordedAt: new Date(),
      },
      preferences: {
        language: 'hi',
        audioEnabled: false,
      },
      status: 'active',
    });

    // Guardian user (father)
    const guardianPassword = await bcryptjs.hash('demo123456', 10);
    const guardianUser = await User.create({
      email: 'guardian.parent@demo.jeevacare.local',
      passwordHash: guardianPassword,
      role: 'GUARDIAN',
      status: 'active',
      profile: {
        firstName: 'Vikram',
        lastName: 'Gupta',
        phone: '9876543213',
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });

    logger.info(`   ✅ Minor patient: ${minorPatient.jeevaId}`);
    logger.info(`      Name: ${minorPatient.personalIdentity.firstName}`);
    logger.info(`      Age: ${new Date().getFullYear() - 2015} years\n`);

    // Create guardian relationship
    const guardianRelationship = await GuardianRelationship.create({
      patientId: minorPatient._id,
      guardianUserId: guardianUser._id,
      relationship: 'father',
      verificationStatus: 'verified',
      verifiedAt: new Date(),
      status: 'active',
      permissions: {
        viewMedicalRecords: true,
        manageMedicalRecords: false,
        manageAppointments: true,
        manageEmergencyProfile: true,
        manageGuardians: false,
        viewAccessHistory: true,
      },
    });

    minorPatient.guardianRelationships.push(guardianRelationship._id);
    await minorPatient.save();

    logger.info(`   ✅ Guardian relationship created`);
    logger.info(`      Guardian: ${guardianUser.email}`);
    logger.info(`      Relationship: Father\n`);

    // ======================================
    // 4. SUMMARY
    // ======================================
    logger.info('✅ Demo data seeded successfully!\n');
    logger.info('Demo Credentials:\n');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('👨 ADULT PATIENT');
    logger.info(`   Email: adult.patient@demo.jeevacare.local`);
    logger.info(`   Password: demo123456`);
    logger.info(`   JeevaId: ${adultPatient.jeevaId}`);
    logger.info(`   Name: Rajesh Kumar (Adult, Verified)\n`);

    logger.info('👩 MOTHER OF NEWBORN');
    logger.info(`   Email: mother.patient@demo.jeevacare.local`);
    logger.info(`   Password: demo123456`);
    logger.info(`   JeevaId: ${motherPatient.jeevaId}\n`);

    logger.info('👶 NEWBORN PATIENT');
    logger.info(`   JeevaId: ${newbornPatient.jeevaId}`);
    logger.info(`   Name: Aditya Sharma (Born 2026-08-01)`);
    logger.info(`   Parent: ${motherPatient.jeevaId}\n`);

    logger.info('👧 MINOR PATIENT (with Guardian)');
    logger.info(`   Email: minor.patient@demo.jeevacare.local`);
    logger.info(`   Password: demo123456`);
    logger.info(`   JeevaId: ${minorPatient.jeevaId}`);
    logger.info(`   Name: Ananya Gupta (Age: 10)\n`);

    logger.info('👨 GUARDIAN (Father of Minor)');
    logger.info(`   Email: guardian.parent@demo.jeevacare.local`);
    logger.info(`   Password: demo123456`);
    logger.info(`   Role: Guardian\n`);

    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    logger.info('🔐 IMPORTANT: This is demo data. Do NOT use in production.');
    logger.info('Change all passwords immediately in a production environment.\n');

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Failed to seed demo data: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Run seeding
seedDemoData();
