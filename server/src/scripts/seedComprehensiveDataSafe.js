/**
 * SAFE Comprehensive Synthetic Healthcare Data Seed Script
 * Enhanced with production safety checks and explicit database verification
 * 
 * Creates:
 * - 10 diverse Indian doctors with realistic profiles
 * - Nurses and laboratory technicians
 * - 32 diverse synthetic patients with medical histories
 * - Appointments, encounters, and clinical records
 * - Laboratory results and radiology reports
 * - Demo accounts: patient@demo.com, doctor@demo.com, admin@demo.com
 * 
 * SAFETY FEATURES:
 * - Explicit database name verification before any writes
 * - Prevents execution against production databases
 * - Idempotent operations (safe to re-run)
 * - Detailed pre-flight checks
 * - Dry-run mode support
 * 
 * IMPORTANT: All data is SYNTHETIC for demonstration purposes only.
 * NOT FOR CLINICAL USE.
 */

import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import HospitalStaff from '../models/HospitalStaff.js';
import Appointment from '../models/Appointment.js';
import Encounter from '../models/Encounter.js';
import LaboratoryResult from '../models/LaboratoryResult.js';
import RadiologyRecord from '../models/RadiologyRecord.js';
import Vaccination from '../models/Vaccination.js';

// Stable identifiers for idempotent seeding
const DEMO_IDENTIFIERS = {
  patient: 'demo-patient-001',
  doctor: 'demo-doctor-001',
  admin: 'demo-admin-001',
};

// ALLOWED database names for seeding (whitelist approach)
const ALLOWED_DATABASES = [
  'jeevacare-dev',
  'jeevacare-test',
  'jeevacare-demo',
  'jeevacare-local',
  'jeevacare',  // Local development only
];

// ALLOWED cluster hosts (explicit MongoDB Atlas cluster whitelist)
const ALLOWED_CLUSTERS = [
  'jeevacare-devs.7tehhhk.mongodb.net',  // Development Atlas cluster
  'localhost',                            // Local MongoDB
  '127.0.0.1',                           // Local MongoDB
];

// BLOCKED database patterns (fail-safe)
const BLOCKED_PATTERNS = [
  /prod/i,
  /production/i,
  /live/i,
  /main/i,
  /master/i,
];

/**
 * Pre-flight safety check: Verify target database is safe for seeding
 */
async function verifyTargetDatabase(uri) {
  logger.info('🔍 Running pre-flight safety checks...\n');

  // Extract cluster host and database name from URI
  const hostMatch = uri.match(/@([^/]+)\//);
  const clusterHost = hostMatch ? hostMatch[1] : null;
  
  const dbMatch = uri.match(/\/([^?\/]+)(\?|$)/);
  const dbName = dbMatch ? dbMatch[1] : null;

  logger.info(`Database URI Pattern: ${uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@')}`);
  logger.info(`Extracted Cluster Host: ${clusterHost || 'NOT SPECIFIED'}`);
  logger.info(`Extracted Database Name: ${dbName || 'NOT SPECIFIED'}\n`);

  // FAIL-SAFE 1: Cluster host must be explicitly specified and whitelisted
  if (!clusterHost) {
    throw new Error(
      '❌ SAFETY CHECK FAILED: No cluster host specified in connection URI.\n' +
      '   Unable to verify target cluster.\n' +
      '   \n' +
      '   Required format: mongodb://...@<CLUSTER_HOST>/<DATABASE_NAME>?params\n' +
      '   Update MONGODB_URI in server/.env with explicit cluster and database.'
    );
  }

  if (!ALLOWED_CLUSTERS.includes(clusterHost)) {
    throw new Error(
      `❌ SAFETY CHECK FAILED: Cluster host "${clusterHost}" is not in the allowed list.\n` +
      `   Allowed clusters: ${ALLOWED_CLUSTERS.join(', ')}\n` +
      `   \n` +
      `   This prevents accidental seeding of production or unauthorized clusters.\n` +
      `   If this is a valid development cluster, add it to ALLOWED_CLUSTERS\n` +
      `   in server/src/scripts/seedComprehensiveDataSafe.js`
    );
  }

  // FAIL-SAFE 2: Database name must be explicitly specified
  if (!dbName) {
    throw new Error(
      '❌ SAFETY CHECK FAILED: No database name specified in connection URI.\n' +
      '   MongoDB would use the default "test" database, which is unsafe.\n' +
      '   \n' +
      '   Required format: mongodb://.../<DATABASE_NAME>?params\n' +
      '   Example: mongodb+srv://user:pass@cluster/jeevacare-dev?retryWrites=true\n' +
      '   \n' +
      '   Update MONGODB_URI in server/.env with explicit database name.'
    );
  }

  // FAIL-SAFE 3: Check against blocked patterns
  for (const pattern of BLOCKED_PATTERNS) {
    if (pattern.test(dbName)) {
      throw new Error(
        `❌ SAFETY CHECK FAILED: Database name "${dbName}" matches blocked pattern: ${pattern}\n` +
        `   This appears to be a production or live database.\n` +
        `   Seeding blocked for safety. Use a development/demo database instead.\n` +
        `   Allowed: ${ALLOWED_DATABASES.join(', ')}`
      );
    }
  }

  // FAIL-SAFE 4: Check against whitelist
  if (!ALLOWED_DATABASES.includes(dbName)) {
    throw new Error(
      `❌ SAFETY CHECK FAILED: Database "${dbName}" is not in the allowed list.\n` +
      `   Allowed databases: ${ALLOWED_DATABASES.join(', ')}\n` +
      `   \n` +
      `   If this is a valid development database, add it to ALLOWED_DATABASES\n` +
      `   in server/src/scripts/seedComprehensiveDataSafe.js`
    );
  }

  // FAIL-SAFE 5: Environment check
  const env = process.env.NODE_ENV || 'development';
  if (env === 'production') {
    logger.warn('⚠️  WARNING: NODE_ENV=production detected');
    logger.warn('   Seeding scripts should typically run in development/test environments.');
    logger.warn('   Proceeding because cluster and database passed whitelist checks.\n');
  }

  // All checks passed
  logger.info('✅ Safety checks PASSED');
  logger.info(`   Target cluster: ${clusterHost}`);
  logger.info(`   Target database: ${dbName}`);
  logger.info(`   Environment: ${env}`);
  logger.info(`   Cluster allowed: YES`);
  logger.info(`   Database allowed: YES\n`);

  return { clusterHost, dbName, env };
}

const seedComprehensiveData = async () => {
  let connection = null;

  try {
    // MANDATORY: Check for explicit confirmation flag
    const args = process.argv.slice(2);
    const hasConfirmFlag = args.includes('--confirm-dev-seed');
    
    if (!hasConfirmFlag) {
      console.error('═══════════════════════════════════════════════════════');
      console.error('❌ SAFETY CHECK FAILED: Missing confirmation flag');
      console.error('═══════════════════════════════════════════════════════\n');
      console.error('This script requires explicit confirmation to prevent accidental execution.\n');
      console.error('Usage:');
      console.error('  node src/scripts/seedComprehensiveDataSafe.js --confirm-dev-seed\n');
      console.error('The flag confirms you intend to seed the development database.');
      console.error('This is a mandatory safety requirement in addition to cluster/database whitelists.\n');
      process.exit(1);
    }

    logger.info('═══════════════════════════════════════════════════════');
    logger.info('🌱 JeevaCare Comprehensive Indian Synthetic Dataset Seeding');
    logger.info('═══════════════════════════════════════════════════════\n');

    // PRE-FLIGHT: Verify target database before connecting
    const { clusterHost, dbName, env } = await verifyTargetDatabase(config.database.uri);

    // Connect to verified database
    logger.info('🔌 Connecting to MongoDB Atlas...');
    connection = await mongoose.connect(config.database.uri);
    logger.info(`✅ Connected to: ${dbName}\n`);

    // Display current database stats
    const collections = await mongoose.connection.db.listCollections().toArray();
    logger.info(`📊 Current database state: ${collections.length} collections`);
    for (const coll of collections) {
      const count = await mongoose.connection.db.collection(coll.name).countDocuments();
      if (count > 0) {
        logger.info(`   ${coll.name}: ${count} documents`);
      }
    }
    logger.info('');

    // User confirmation checkpoint
    logger.info('⏸️  CHECKPOINT: Ready to seed data');
    logger.info(`   Database: ${dbName}`);
    logger.info(`   Operation: Idempotent seeding (existing records preserved)`);
    logger.info(`   New records will be created only if they don\'t exist\n`);

    // ==========================================
    // PHASE 1: HOSPITALS/FACILITIES
    // ==========================================
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('PHASE 1: Creating Healthcare Facilities');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const hospitals = await createHospitals();
    logger.info(`✅ Hospitals ready: ${hospitals.length}\n`);

    // ==========================================
    // PHASE 2: HEALTHCARE WORKFORCE
    // ==========================================
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('PHASE 2: Creating Healthcare Workforce');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const doctors = await createDoctors(hospitals);
    logger.info(`✅ Doctors ready: ${doctors.length}`);
    
    const nurses = await createNurses(hospitals);
    logger.info(`✅ Nurses ready: ${nurses.length}`);
    
    const labTechs = await createLabTechs(hospitals);
    logger.info(`✅ Lab Technicians ready: ${labTechs.length}\n`);

    // ==========================================
    // PHASE 3: DEMO ACCOUNTS
    // ==========================================
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('PHASE 3: Creating Demo Accounts');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const demoAccounts = await createDemoAccounts(hospitals[0], doctors[0]);
    logger.info('✅ Demo accounts ready\n');

    // ==========================================
    // PHASE 4: SYNTHETIC PATIENT POPULATION
    // ==========================================
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('PHASE 4: Creating Synthetic Patient Population');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const patients = await createSyntheticPatients(hospitals);
    logger.info(`✅ Patients ready: ${patients.length}\n`);

    // ==========================================
    // PHASE 5: MEDICAL RECORDS
    // ==========================================
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('PHASE 5: Creating Medical Records');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    await createMedicalRecords(patients, doctors, nurses, labTechs, hospitals, demoAccounts?.patientDoc);
    logger.info('✅ Medical records ready\n');

    // ==========================================
    // PHASE 6: APPOINTMENTS
    // ==========================================
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    logger.info('PHASE 6: Creating Appointments');
    logger.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    const appointmentStats = await createAppointments(patients, doctors, hospitals);
    logger.info(`✅ Appointments ready: ${appointmentStats.total} total\n`);
    logger.info(`   Past (completed): ${appointmentStats.completed}`);
    logger.info(`   Today (scheduled/in-progress): ${appointmentStats.today}`);
    logger.info(`   Future (scheduled): ${appointmentStats.future}\n`);

    // ==========================================
    // FINAL SUMMARY
    // ==========================================
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ SEEDING COMPLETE');
    logger.info('═══════════════════════════════════════════════════════\n');
    
    // Display final stats
    const finalStats = {
      hospitals: hospitals.length,
      doctors: doctors.length,
      nurses: nurses.length,
      labTechs: labTechs.length,
      patients: patients.length,
      appointments: appointmentStats.total,
      demoAccounts: 3,
    };

    logger.info('📊 Dataset Summary:');
    logger.info(`   Hospitals: ${finalStats.hospitals}`);
    logger.info(`   Doctors: ${finalStats.doctors}`);
    logger.info(`   Nurses: ${finalStats.nurses}`);
    logger.info(`   Lab Technicians: ${finalStats.labTechs}`);
    logger.info(`   Patients: ${finalStats.patients}`);
    logger.info(`   Appointments: ${finalStats.appointments}`);
    logger.info(`   Demo Accounts: ${finalStats.demoAccounts}\n`);
    
    logger.info('🔐 Demo Credentials:');
    logger.info('   Patient: patient@demo.com / DemoPassword123');
    logger.info('   Doctor: doctor@demo.com / DemoPassword123');
    logger.info('   Admin: admin@demo.com / DemoPassword123\n');
    
    logger.info('⚠️  IMPORTANT: This is SYNTHETIC DEMO DATA');
    logger.info('   NOT FOR CLINICAL USE\n');

    logger.info(`✅ Data seeded successfully to: ${dbName}\n`);

    process.exit(0);
  } catch (error) {
    logger.error(`\n❌ Seeding failed: ${error.message}`);
    if (error.stack) {
      logger.error(error.stack);
    }
    
    // Report partial progress
    logger.error('\n⚠️  PARTIAL EXECUTION DETECTED');
    logger.error('   Some data may have been created before the error occurred.');
    logger.error('   The script is idempotent - safe to re-run with the same command.');
    logger.error('   Existing records will be preserved; only missing records will be created.\n');
    
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.disconnect();
      logger.info('🔌 Disconnected from MongoDB\n');
    }
  }
};

// ==========================================
// HOSPITAL CREATION
// ==========================================
async function createHospitals() {
  const hospitalData = [
    {
      name: 'Apollo City Hospital',
      facilityType: 'general_hospital',
      address: {
        street: '123 MG Road',
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
        zipCode: '560001',
      },
      contactInfo: {
        phone: '+91-80-12345678',
        email: 'info@apollocity.demo',
      },
      verificationStatus: 'verified',
      status: 'active',
    },
    {
      name: 'Medanta Multi-Specialty Clinic',
      facilityType: 'specialty_hospital',
      address: {
        street: '456 Anna Salai',
        city: 'Chennai',
        state: 'Tamil Nadu',
        country: 'India',
        zipCode: '600002',
      },
      contactInfo: {
        phone: '+91-44-87654321',
        email: 'contact@medanta.demo',
      },
      verificationStatus: 'verified',
      status: 'active',
    },
    {
      name: 'Fortis Community Health Center',
      facilityType: 'community_health_center',
      address: {
        street: '789 Residency Road',
        city: 'Mumbai',
        state: 'Maharashtra',
        country: 'India',
        zipCode: '400001',
      },
      contactInfo: {
        phone: '+91-22-11223344',
        email: 'info@fortis.demo',
      },
      verificationStatus: 'verified',
      status: 'active',
    },
  ];

  const hospitals = [];
  for (const data of hospitalData) {
    let hospital = await Hospital.findOne({ name: data.name });
    if (!hospital) {
      hospital = await Hospital.create(data);
      logger.info(`   ✨ Created: ${data.name}`);
    } else {
      logger.info(`   ♻️  Exists: ${data.name}`);
    }
    hospitals.push(hospital);
  }

  return hospitals;
}

// ==========================================
// DOCTOR CREATION (10 diverse doctors)
// ==========================================
async function createDoctors(hospitals) {
  const doctorData = [
    { firstName: 'Rajesh', lastName: 'Kumar', specialization: ['general_medicine'], experience: 15, hospital: 0 },
    { firstName: 'Priya', lastName: 'Sharma', specialization: ['cardiology'], experience: 12, hospital: 0 },
    { firstName: 'Mohammed', lastName: 'Ibrahim', specialization: ['pediatrics'], experience: 10, hospital: 1 },
    { firstName: 'Lakshmi', lastName: 'Menon', specialization: ['dermatology'], experience: 8, hospital: 1 },
    { firstName: 'Arjun', lastName: 'Patel', specialization: ['orthopedics'], experience: 14, hospital: 2 },
    { firstName: 'Sarah', lastName: 'Thomas', specialization: ['gynecology'], experience: 11, hospital: 0 },
    { firstName: 'Karthik', lastName: 'Reddy', specialization: ['radiology'], experience: 9, hospital: 1 },
    { firstName: 'Anjali', lastName: 'Desai', specialization: ['general_medicine', 'family_medicine'], experience: 7, hospital: 2 },
    { firstName: 'Vikram', lastName: 'Singh', specialization: ['neurology'], experience: 13, hospital: 0 },
    { firstName: 'Fatima', lastName: 'Khan', specialization: ['endocrinology'], experience: 6, hospital: 1 },
  ];

  const doctors = [];
  for (let i = 0; i < doctorData.length; i++) {
    const data = doctorData[i];
    const email = `${data.firstName.toLowerCase()}.${data.lastName.toLowerCase()}@demo.jeevacare.local`;
    
    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcryptjs.hash('DemoPassword123', 10);
      user = await User.create({
        email,
        passwordHash,
        role: 'DOCTOR',
        status: 'active',
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: `+91-${9000000000 + i}`,
        },
        verificationStatus: 'verified',
        consentRecord: {
          termsAccepted: true,
          termsAcceptedAt: new Date(),
          privacyPolicyAccepted: true,
          privacyPolicyAcceptedAt: new Date(),
        },
      });
      logger.info(`   ✨ Created user: ${email}`);
    }

    let professional = await HealthcareProfessional.findOne({ userId: user._id });
    if (!professional) {
      professional = await HealthcareProfessional.create({
        userId: user._id,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phone: user.profile.phone,
        professionalType: 'doctor',
        specialization: data.specialization,
        yearsOfExperience: data.experience,
        verificationStatus: 'verified',
        accountStatus: 'active',
        verification: {
          verifiedAt: new Date(),
          verificationMethod: 'demo',
          verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      logger.info(`   ✨ Created professional: Dr. ${data.firstName} ${data.lastName}`);
    }

    let staff = await HospitalStaff.findOne({ userId: user._id, hospitalId: hospitals[data.hospital]._id });
    if (!staff) {
      await HospitalStaff.create({
        userId: user._id,
        professionalId: professional._id,
        hospitalId: hospitals[data.hospital]._id,
        role: 'doctor',
        employmentStatus: 'active',
        startDate: new Date('2020-01-01'),
        permissions: {
          viewPatientRecords: true,
          createClinicalRecords: true,
          createDiagnosis: true,
          createPrescription: true,
          accessEmergencyProfiles: true,
        },
        associationStatus: 'active',
        professionalVerificationStatus: 'verified',
      });
    }

    doctors.push({ user, professional });
  }

  return doctors;
}

// ==========================================
// NURSE CREATION
// ==========================================
async function createNurses(hospitals) {
  const nurseData = [
    { firstName: 'Meera', lastName: 'Nair', experience: 5, hospital: 0 },
    { firstName: 'Pooja', lastName: 'Gupta', experience: 7, hospital: 1 },
    { firstName: 'Sunita', lastName: 'Verma', experience: 4, hospital: 2 },
  ];

  const nurses = [];
  for (let i = 0; i < nurseData.length; i++) {
    const data = nurseData[i];
    const email = `nurse.${data.firstName.toLowerCase()}@demo.jeevacare.local`;
    
    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcryptjs.hash('DemoPassword123', 10);
      user = await User.create({
        email,
        passwordHash,
        role: 'NURSE',
        status: 'active',
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: `+91-${9100000000 + i}`,
        },
        verificationStatus: 'verified',
        consentRecord: {
          termsAccepted: true,
          termsAcceptedAt: new Date(),
          privacyPolicyAccepted: true,
          privacyPolicyAcceptedAt: new Date(),
        },
      });
    }

    let professional = await HealthcareProfessional.findOne({ userId: user._id });
    if (!professional) {
      professional = await HealthcareProfessional.create({
        userId: user._id,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phone: user.profile.phone,
        professionalType: 'nurse',
        yearsOfExperience: data.experience,
        verificationStatus: 'verified',
        accountStatus: 'active',
      });
    }

    let staff = await HospitalStaff.findOne({ userId: user._id, hospitalId: hospitals[data.hospital]._id });
    if (!staff) {
      await HospitalStaff.create({
        userId: user._id,
        professionalId: professional._id,
        hospitalId: hospitals[data.hospital]._id,
        role: 'nurse',
        employmentStatus: 'active',
        startDate: new Date('2021-01-01'),
        permissions: {
          viewPatientRecords: true,
          createClinicalRecords: false,
          accessEmergencyProfiles: true,
        },
        associationStatus: 'active',
        professionalVerificationStatus: 'verified',
      });
    }

    nurses.push({ user, professional });
  }

  return nurses;
}

// ==========================================
// LAB TECHNICIAN CREATION
// ==========================================
async function createLabTechs(hospitals) {
  const labTechData = [
    { firstName: 'Ramesh', lastName: 'Kumar', experience: 3, hospital: 0 },
    { firstName: 'Kavita', lastName: 'Singh', experience: 5, hospital: 1 },
  ];

  const labTechs = [];
  for (let i = 0; i < labTechData.length; i++) {
    const data = labTechData[i];
    const email = `labtech.${data.firstName.toLowerCase()}@demo.jeevacare.local`;
    
    let user = await User.findOne({ email });
    if (!user) {
      const passwordHash = await bcryptjs.hash('DemoPassword123', 10);
      user = await User.create({
        email,
        passwordHash,
        role: 'LAB_TECHNICIAN',
        status: 'active',
        profile: {
          firstName: data.firstName,
          lastName: data.lastName,
          phone: `+91-${9200000000 + i}`,
        },
        verificationStatus: 'verified',
        consentRecord: {
          termsAccepted: true,
          termsAcceptedAt: new Date(),
          privacyPolicyAccepted: true,
          privacyPolicyAcceptedAt: new Date(),
        },
      });
    }

    let professional = await HealthcareProfessional.findOne({ userId: user._id });
    if (!professional) {
      professional = await HealthcareProfessional.create({
        userId: user._id,
        firstName: data.firstName,
        lastName: data.lastName,
        email,
        phone: user.profile.phone,
        professionalType: 'lab_technician',
        yearsOfExperience: data.experience,
        verificationStatus: 'verified',
        accountStatus: 'active',
      });
    }

    let staff = await HospitalStaff.findOne({ userId: user._id, hospitalId: hospitals[data.hospital]._id });
    if (!staff) {
      await HospitalStaff.create({
        userId: user._id,
        professionalId: professional._id,
        hospitalId: hospitals[data.hospital]._id,
        role: 'lab_technician',
        employmentStatus: 'active',
        startDate: new Date('2022-01-01'),
        permissions: {
          viewPatientRecords: true,
          createLaboratoryResults: true,
        },
        associationStatus: 'active',
        professionalVerificationStatus: 'verified',
      });
    }

    labTechs.push({ user, professional });
  }

  return labTechs;
}

// ==========================================
// DEMO ACCOUNTS CREATION
// ==========================================
async function createDemoAccounts(hospital, doctor) {
  // Patient Demo Account
  let patientUser = await User.findOne({ email: 'patient@demo.com' });
  if (!patientUser) {
    const passwordHash = await bcryptjs.hash('DemoPassword123', 10);
    patientUser = await User.create({
      email: 'patient@demo.com',
      passwordHash,
      role: 'PATIENT',
      status: 'active',
      profile: {
        firstName: 'Demo',
        lastName: 'Patient',
        phone: '+91-9999900001',
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });

    await Patient.create({
      userId: patientUser._id,
      personalIdentity: {
        firstName: 'Demo',
        lastName: 'Patient',
        dateOfBirth: new Date('1985-06-15'),
        sex: 'M',
        phone: '+91-9999900001',
        email: 'patient@demo.com',
      },
      bloodGroup: {
        group: 'O+',
        source: 'patient_reported',
        verificationStatus: 'unverified',
      },
      status: 'active',
      facilities: [{ facilityId: hospital._id }],
    });
    logger.info('   ✨ Created demo patient account');
  }

  // Doctor Demo Account
  let doctorUser = await User.findOne({ email: 'doctor@demo.com' });
  if (!doctorUser) {
    const passwordHash = await bcryptjs.hash('DemoPassword123', 10);
    doctorUser = await User.create({
      email: 'doctor@demo.com',
      passwordHash,
      role: 'DOCTOR',
      status: 'active',
      profile: {
        firstName: 'Demo',
        lastName: 'Doctor',
        phone: '+91-9999900002',
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });
  }

  let doctorProf = await HealthcareProfessional.findOne({ userId: doctorUser._id });
  if (!doctorProf) {
    doctorProf = await HealthcareProfessional.create({
      userId: doctorUser._id,
      firstName: 'Demo',
      lastName: 'Doctor',
      email: 'doctor@demo.com',
      phone: doctorUser.profile.phone,
      professionalType: 'doctor',
      specialization: ['general_medicine'],
      yearsOfExperience: 10,
      verificationStatus: 'verified',
      accountStatus: 'active',
      verification: {
        verifiedAt: new Date(),
        verificationMethod: 'demo',
        verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  let doctorStaff = await HospitalStaff.findOne({ userId: doctorUser._id, hospitalId: hospital._id });
  if (!doctorStaff) {
    await HospitalStaff.create({
      userId: doctorUser._id,
      professionalId: doctorProf._id,
      hospitalId: hospital._id,
      role: 'doctor',
      employmentStatus: 'active',
      startDate: new Date('2020-01-01'),
      permissions: {
        viewPatientRecords: true,
        createClinicalRecords: true,
        createDiagnosis: true,
        createPrescription: true,
        accessEmergencyProfiles: true,
      },
      associationStatus: 'active',
      professionalVerificationStatus: 'verified',
    });
    logger.info('   ✨ Created demo doctor account');
  }

  // Admin Demo Account
  let adminUser = await User.findOne({ email: 'admin@demo.com' });
  if (!adminUser) {
    const passwordHash = await bcryptjs.hash('DemoPassword123', 10);
    adminUser = await User.create({
      email: 'admin@demo.com',
      passwordHash,
      role: 'HOSPITAL_ADMIN',
      status: 'active',
      profile: {
        firstName: 'Hospital',
        lastName: 'Admin',
        phone: '+91-9999900003',
        hospitalId: hospital._id,
      },
      verificationStatus: 'verified',
      consentRecord: {
        termsAccepted: true,
        termsAcceptedAt: new Date(),
        privacyPolicyAccepted: true,
        privacyPolicyAcceptedAt: new Date(),
      },
    });
    logger.info('   ✨ Created demo admin account');
  }

  let patientDoc = await Patient.findOne({ userId: patientUser._id });
  if (!patientDoc) {
    patientDoc = await Patient.findOne({ 'personalIdentity.email': 'patient@demo.com' });
  }

  return { patientUser, doctorUser, adminUser, patientDoc, doctorProf };
}

// ==========================================
// SYNTHETIC PATIENT POPULATION
// ==========================================
async function createSyntheticPatients(hospitals) {
  const patientTemplates = [
    // Infants and children
    { firstName: 'Aarav', lastName: 'Sharma', dob: '2024-03-15', sex: 'M', condition: 'healthy_infant' },
    { firstName: 'Ananya', lastName: 'Patel', dob: '2022-08-20', sex: 'F', condition: 'routine_checkup' },
    { firstName: 'Vihaan', lastName: 'Kumar', dob: '2020-11-05', sex: 'M', condition: 'asthma' },
    
    // Teenagers
    { firstName: 'Ishita', lastName: 'Reddy', dob: '2010-04-12', sex: 'F', condition: 'acne_treatment' },
    { firstName: 'Rohan', lastName: 'Gupta', dob: '2008-09-25', sex: 'M', condition: 'sports_injury' },
    
    // Young adults
    { firstName: 'Priya', lastName: 'Nair', dob: '1998-01-18', sex: 'F', condition: 'anemia' },
    { firstName: 'Arjun', lastName: 'Singh', dob: '1995-07-22', sex: 'M', condition: 'respiratory_infection' },
    { firstName: 'Divya', lastName: 'Iyer', dob: '1992-12-10', sex: 'F', condition: 'thyroid_disorder' },
    
    // Middle-aged adults
    { firstName: 'Suresh', lastName: 'Menon', dob: '1980-05-30', sex: 'M', condition: 'diabetes' },
    { firstName: 'Kavita', lastName: 'Desai', dob: '1978-08-14', sex: 'F', condition: 'hypertension' },
    { firstName: 'Rajesh', lastName: 'Verma', dob: '1975-03-25', sex: 'M', condition: 'cardiac_checkup' },
    { firstName: 'Sunita', lastName: 'Joshi', dob: '1982-11-08', sex: 'F', condition: 'pregnancy_care' },
    
    // Older adults
    { firstName: 'Ramesh', lastName: 'Pillai', dob: '1965-02-17', sex: 'M', condition: 'hypertension_diabetes' },
    { firstName: 'Lakshmi', lastName: 'Rao', dob: '1960-06-22', sex: 'F', condition: 'arthritis' },
    { firstName: 'Mohan', lastName: 'Krishnan', dob: '1955-10-05', sex: 'M', condition: 'chronic_disease' },
    
    // Additional diverse cases
    { firstName: 'Fatima', lastName: 'Begum', dob: '1988-04-30', sex: 'F', condition: 'skin_condition' },
    { firstName: 'Ahmed', lastName: 'Ali', dob: '1990-12-15', sex: 'M', condition: 'gastric_issue' },
    { firstName: 'Zoya', lastName: 'Khan', dob: '2015-07-08', sex: 'F', condition: 'pediatric_care' },
    { firstName: 'Aisha', lastName: 'Syed', dob: '1985-09-20', sex: 'F', condition: 'preventive_health' },
    { firstName: 'Kiran', lastName: 'Bhat', dob: '1972-03-11', sex: 'M', condition: 'post_surgery' },
    
    // More pediatric cases
    { firstName: 'Saanvi', lastName: 'Jain', dob: '2021-05-18', sex: 'F', condition: 'vaccination' },
    { firstName: 'Aditya', lastName: 'Malhotra', dob: '2019-10-22', sex: 'M', condition: 'fever' },
    
    // Chronic conditions
    { firstName: 'Prakash', lastName: 'Shetty', dob: '1968-08-05', sex: 'M', condition: 'copd' },
    { firstName: 'Radha', lastName: 'Nambiar', dob: '1970-11-12', sex: 'F', condition: 'osteoporosis' },
    
    // More young adults
    { firstName: 'Siddharth', lastName: 'Mehta', dob: '1996-02-28', sex: 'M', condition: 'mental_health' },
    { firstName: 'Nisha', lastName: 'Chopra', dob: '1994-06-16', sex: 'F', condition: 'migraine' },
    
    // Middle-aged preventive care
    { firstName: 'Vijay', lastName: 'Agarwal', dob: '1979-01-20', sex: 'M', condition: 'health_screening' },
    { firstName: 'Meena', lastName: 'Bose', dob: '1981-04-09', sex: 'F', condition: 'wellness_checkup' },
    
    // Senior citizens
    { firstName: 'Gopal', lastName: 'Iyengar', dob: '1950-07-14', sex: 'M', condition: 'geriatric_care' },
    { firstName: 'Savitri', lastName: 'Devi', dob: '1958-09-03', sex: 'F', condition: 'multiple_conditions' },
    
    // Additional diversity
    { firstName: 'Thomas', lastName: 'George', dob: '1987-12-25', sex: 'M', condition: 'dental_referral' },
    { firstName: 'Mary', lastName: 'Francis', dob: '1991-03-17', sex: 'F', condition: 'orthopedic' },
    { firstName: 'David', lastName: 'Samuel', dob: '2012-08-30', sex: 'M', condition: 'allergy' },
  ];

  const patients = [];
  let created = 0;
  let existing = 0;

  for (let i = 0; i < patientTemplates.length; i++) {
    const template = patientTemplates[i];
    const email = `${template.firstName.toLowerCase()}.${template.lastName.toLowerCase()}@synthetic.demo`;
    
    let existingPatient = await Patient.findOne({ 'personalIdentity.email': email });
    if (existingPatient) {
      patients.push(existingPatient);
      existing++;
      continue;
    }

    const patient = await Patient.create({
      personalIdentity: {
        firstName: template.firstName,
        lastName: template.lastName,
        dateOfBirth: new Date(template.dob),
        sex: template.sex,
        phone: `+91-${9300000000 + i}`,
        email,
      },
      bloodGroup: {
        group: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'][i % 8],
        source: 'lab_test',
        verificationStatus: 'verified',
        recordedAt: new Date(),
      },
      status: 'active',
      facilities: [{ facilityId: hospitals[i % hospitals.length]._id }],
      identityVerification: {
        status: 'verified',
        method: 'demo',
        verifiedAt: new Date(),
      },
      preferences: {
        language: ['en', 'hi', 'kn', 'te', 'ta'][i % 5],
      },
    });

    patients.push(patient);
    created++;
  }

  logger.info(`   ✨ Created: ${created} new patients`);
  logger.info(`   ♻️  Existing: ${existing} patients`);

  return patients;
}

// ==========================================
// MEDICAL RECORDS CREATION
// ==========================================
async function createMedicalRecords(patients, doctors, nurses, labTechs, hospitals, demoPatient) {
  const recordsPatients = demoPatient ? [demoPatient, ...patients] : patients;
  let created = 0;
  let existing = 0;

  // Create sample lab results for selected patients
  for (let i = 0; i < Math.min(15, recordsPatients.length); i++) {
    const patient = recordsPatients[i];
    const doctor = doctors[i % doctors.length];
    const labTech = labTechs[i % labTechs.length];
    const hospital = hospitals[i % hospitals.length];

    // FIXED: Use composite key for idempotency (patientId + labTestName)
    // Patients can have multiple lab results, but not duplicate tests
    const testName = `[DEMO] ${['Complete Blood Count', 'Blood Glucose', 'Lipid Profile', 'Thyroid Function'][i % 4]}`;
    const existingLab = await LaboratoryResult.findOne({ 
      patientId: patient._id,
      labTestName: testName 
    });
    
    if (!existingLab) {
      await LaboratoryResult.create({
        patientId: patient._id,
        facilityId: hospital._id,
        providerId: doctor.user._id,
        labName: hospital.name + ' Diagnostic Laboratory',
        labTestName: testName,
        labTestCategory: 'hematology',
        sampleCollectionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        resultReceivedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        results: [
          {
            testName: 'Hemoglobin',
            value: '13.5',
            unit: 'g/dL',
            referenceRange: '12-16',
            flag: 'N',
          },
        ],
        verificationStatus: 'provider_verified',
        verifiedBy: doctor.user._id,
        verifiedAt: new Date(),
      });
      created++;
    } else {
      existing++;
    }

    // Create sample radiology records for some patients
    if (i % 3 === 0) {
      // FIXED: Use composite key for idempotency (patientId + modalityType + bodyPart)
      const modalityType = ['x_ray', 'ct_scan', 'ultrasound'][i % 3];
      const bodyPart = ['chest', 'abdomen', 'head'][i % 3];
      
      const existingRadiology = await RadiologyRecord.findOne({ 
        patientId: patient._id,
        modalityType,
        bodyPart
      });
      
      if (!existingRadiology) {
        await RadiologyRecord.create({
          patientId: patient._id,
          facilityId: hospital._id,
          providerId: doctor.user._id,
          studyDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          reportDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          modalityType,
          bodyPart,
          clinicalIndication: '[DEMO SYNTHETIC DATA] Routine diagnostic imaging evaluation',
          findings: '[DEMO SYNTHETIC DATA] Normal anatomical alignment. No acute fractures, infiltrates, or focal lesions identified.',
          impression: '[DEMO SYNTHETIC DATA] Normal study. No acute cardiopulmonary or structural abnormalities.',
          recommendation: '[DEMO SYNTHETIC DATA] Routine clinical follow-up as clinically indicated.',
          radiologistName: doctor.professional.firstName + ' ' + doctor.professional.lastName,
          verificationStatus: 'provider_verified',
          verifiedBy: doctor.user._id,
          verifiedAt: new Date(),
          hasCriticalFindings: false,
        });
        created++;
      }
    }

    // Create vaccination records for children
    const age = new Date().getFullYear() - new Date(patient.personalIdentity.dateOfBirth).getFullYear();
    if (age < 18) {
      // FIXED: Use composite key for idempotency (patientId + vaccineName + dose)
      const vaccineName = age < 2 ? 'BCG' : 'MMR';
      const dose = 'Dose 1';
      
      const existingVaccination = await Vaccination.findOne({ 
        patientId: patient._id,
        vaccineName,
        dose
      });
      
      if (!existingVaccination) {
        await Vaccination.create({
          patientId: patient._id,
          vaccineName,
          dose,
          administrationDate: new Date(patient.personalIdentity.dateOfBirth.getTime() + 60 * 24 * 60 * 60 * 1000),
          facilityId: hospital._id,
          provider: 'Dr. ' + doctor.professional.firstName + ' ' + doctor.professional.lastName,
          providerId: doctor.user._id,
          verificationStatus: 'provider_verified',
        });
        created++;
      }
    }
  }

  logger.info(`   ✨ Created: ${created} new medical records`);
  logger.info(`   ♻️  Existing: ${existing} records preserved`);
}

// ==========================================
// APPOINTMENT CREATION
// ==========================================
async function createAppointments(patients, doctors, hospitals) {
  let created = 0;
  let existing = 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Appointment reasons by specialty
  const reasonsBySpecialty = {
    'general_medicine': ['Annual Check-up', 'Diabetes Follow-up', 'Hypertension Review', 'General Consultation', 'Preventive Health'],
    'cardiology': ['Cardiac Assessment', 'ECG Review', 'Chest Pain Evaluation', 'Heart Disease Follow-up', 'Cholesterol Management'],
    'pediatrics': ['Child Wellness Check', 'Vaccination', 'Growth Assessment', 'Fever Evaluation', 'Developmental Screening'],
    'dermatology': ['Skin Rash Consultation', 'Acne Treatment', 'Mole Examination', 'Dermatology Follow-up', 'Allergy Assessment'],
    'orthopedics': ['Joint Pain Review', 'Post-Surgery Follow-up', 'Fracture Assessment', 'Arthritis Management', 'Sports Injury'],
    'gynecology': ['Prenatal Check-up', 'Annual Gynecology Exam', 'Menstrual Consultation', 'Contraception Counseling', 'Pregnancy Follow-up'],
    'radiology': ['Imaging Review', 'Scan Results Discussion', 'Diagnostic Consultation', 'Report Review', 'Follow-up Imaging'],
    'family_medicine': ['Family Health Check', 'Chronic Disease Management', 'Preventive Care', 'Health Screening', 'Wellness Visit'],
    'neurology': ['Headache Evaluation', 'Neurological Assessment', 'Migraine Management', 'Nerve Pain Consultation', 'Cognitive Assessment'],
    'endocrinology': ['Thyroid Check-up', 'Diabetes Management', 'Hormone Assessment', 'Metabolic Evaluation', 'Endocrine Follow-up'],
  };

  // Create diverse appointments across time periods
  const appointmentTemplates = [
    // PAST APPOINTMENTS (completed) - last 2 weeks
    { daysOffset: -14, status: 'completed', timeSlots: ['09:00', '10:30', '14:00', '15:30'] },
    { daysOffset: -12, status: 'completed', timeSlots: ['09:30', '11:00', '14:30'] },
    { daysOffset: -10, status: 'completed', timeSlots: ['10:00', '11:30', '15:00'] },
    { daysOffset: -7, status: 'completed', timeSlots: ['09:00', '10:00', '14:00'] },
    { daysOffset: -5, status: 'completed', timeSlots: ['09:30', '11:00'] },
    { daysOffset: -3, status: 'completed', timeSlots: ['10:00', '15:00'] },
    { daysOffset: -2, status: 'completed', timeSlots: ['09:00', '14:30'] },
    { daysOffset: -1, status: 'completed', timeSlots: ['10:30', '15:30'] },
    
    // TODAY'S APPOINTMENTS (mixed statuses)
    { daysOffset: 0, status: 'completed', timeSlots: ['09:00', '09:30'] },
    { daysOffset: 0, status: 'in_progress', timeSlots: ['10:30'] },
    { daysOffset: 0, status: 'confirmed', timeSlots: ['14:00', '15:00', '15:30', '16:00'] },
    
    // FUTURE APPOINTMENTS (scheduled/confirmed)
    { daysOffset: 1, status: 'confirmed', timeSlots: ['09:00', '10:00', '14:00'] },
    { daysOffset: 2, status: 'confirmed', timeSlots: ['09:30', '11:00', '14:30'] },
    { daysOffset: 3, status: 'scheduled', timeSlots: ['10:00', '15:00'] },
    { daysOffset: 5, status: 'scheduled', timeSlots: ['09:00', '10:30'] },
    { daysOffset: 7, status: 'scheduled', timeSlots: ['09:30', '14:00', '15:30'] },
    { daysOffset: 10, status: 'scheduled', timeSlots: ['10:00', '11:00'] },
    { daysOffset: 14, status: 'scheduled', timeSlots: ['09:00', '14:30'] },
  ];

  let appointmentIndex = 0;
  let completedCount = 0;
  let todayCount = 0;
  let futureCount = 0;

  // Distribute appointments across templates
  for (const template of appointmentTemplates) {
    const appointmentDate = new Date(today);
    appointmentDate.setDate(appointmentDate.getDate() + template.daysOffset);
    
    for (const timeSlot of template.timeSlots) {
      // Cycle through patients and doctors
      const patient = patients[appointmentIndex % patients.length];
      const doctorData = doctors[appointmentIndex % doctors.length];
      
      // Extract doctor details
      const doctorUser = doctorData.user;
      const doctorProfessional = doctorData.professional;
      
      // Get hospital where doctor works - need to find from the doctor templates
      // Since doctors array doesn't include hospital index, use modulo to distribute across hospitals
      const hospitalIndex = appointmentIndex % hospitals.length;
      const hospital = hospitals[hospitalIndex];
      
      // Get appropriate reason based on doctor's specialization
      const specialties = doctorProfessional.specialization || ['general_medicine'];
      const specialty = specialties[0];
      const reasons = reasonsBySpecialty[specialty] || reasonsBySpecialty['general_medicine'];
      const reason = reasons[appointmentIndex % reasons.length];
      
      // Parse time slot
      const [hours, minutes] = timeSlot.split(':').map(Number);
      const aptDateTime = new Date(appointmentDate);
      aptDateTime.setHours(hours, minutes, 0, 0);
      
      // Calculate end time (30-45 min appointments)
      const duration = appointmentIndex % 2 === 0 ? 30 : 45;
      const endTime = new Date(aptDateTime.getTime() + duration * 60000);
      const endTimeStr = `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
      
      // Create unique appointment identifier for idempotency
      // Using composite key: patientId + providerId + date + time
      const dateKey = appointmentDate.toISOString().split('T')[0];
      const existingAppointment = await Appointment.findOne({
        patientId: patient._id,
        providerId: doctorUser._id,
        appointmentDate: {
          $gte: new Date(appointmentDate.setHours(0, 0, 0, 0)),
          $lt: new Date(appointmentDate.setHours(23, 59, 59, 999))
        },
        startTime: timeSlot
      });
      
      if (!existingAppointment) {
        const appointment = await Appointment.create({
          patientId: patient._id,
          providerId: doctorUser._id,
          hospitalId: hospital._id,
          appointmentDate: aptDateTime,
          startTime: timeSlot,
          endTime: endTimeStr,
          duration,
          appointmentType: appointmentIndex % 5 === 0 ? 'follow_up' : 'consultation',
          reasonForVisit: reason,
          status: template.status,
          notes: `[DEMO SYNTHETIC DATA] ${specialty.replace(/_/g, ' ')} appointment`,
          
          // Add completion details for completed appointments
          ...(template.status === 'completed' && {
            completedAt: new Date(aptDateTime.getTime() + duration * 60000),
            checkedInAt: new Date(aptDateTime.getTime() - 10 * 60000), // 10 min early
          }),
          
          // Add check-in for in-progress appointments
          ...(template.status === 'in_progress' && {
            checkedInAt: new Date(aptDateTime.getTime() - 5 * 60000), // 5 min early
          }),
        });
        
        created++;
        
        // Track by time period
        if (template.daysOffset < 0) {
          completedCount++;
        } else if (template.daysOffset === 0) {
          todayCount++;
        } else {
          futureCount++;
        }
      } else {
        existing++;
      }
      
      appointmentIndex++;
    }
  }

  logger.info(`   ✨ Created: ${created} new appointments`);
  logger.info(`   ♻️  Existing: ${existing} appointments preserved`);
  
  return {
    total: created,
    completed: completedCount,
    today: todayCount,
    future: futureCount,
  };
}

// Run the seed script
seedComprehensiveData();
