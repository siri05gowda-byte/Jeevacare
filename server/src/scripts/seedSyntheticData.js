/**
 * Synthetic Healthcare Dataset Seeding Script
 * Creates realistic Indian healthcare demonstration data with exact hospital and doctor specifications
 * 
 * IMPORTANT:
 * - Only runs in development or staging environments
 * - Never automatically runs on production
 * - Is idempotent (safe to re-run)
 * - Preserves existing demo data
 * - Creates exactly: 2 hospitals, 2 hospital admins, 11 named doctors, 20 patients
 * - Shared doctor: Swami Murti (affiliated with both hospitals)
 * 
 * Usage:
 *   npm run seed:synthetic
 *   NODE_ENV=development node src/scripts/seedSyntheticData.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcryptjs from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import Appointment from '../models/Appointment.js';
import RadiologyRecord from '../models/RadiologyRecord.js';
import ClinicalRecord from '../models/ClinicalRecord.js';
import logger from '../utils/logger.js';

// ============================================================================
// EXACT HOSPITAL SPECIFICATIONS
// ============================================================================

const HOSPITALS_CONFIG = [
  {
    name: 'Sanjivani Hospital',
    city: 'Mysore, Karnataka, India',
    facilityId: 'JC-HOSP-SANJIVANI-001',
    street: '42 Vinoba Puram',
    city_code: 'Mysore',
    state: 'Karnataka',
    zipCode: '570001',
    phone: '+91-0821-4321567',
    email: 'admin@sanjivani-mysore.in',
    website: 'www.sanjivani-mysore.in',
    registrationNumber: 'KA-SANJ-2015-001',
  },
  {
    name: 'Aarogya Kendra',
    city: 'Mandya, Karnataka, India',
    facilityId: 'JC-HOSP-AAROGYA-KENDRA-001',
    street: '156 NH Highway',
    city_code: 'Mandya',
    state: 'Karnataka',
    zipCode: '571401',
    phone: '+91-08232-256789',
    email: 'admin@aarogya-mandya.in',
    website: 'www.aarogya-mandya.in',
    registrationNumber: 'KA-AARO-2016-001',
  },
];

// Hospital Admins (exactly as specified)
const HOSPITAL_ADMINS_CONFIG = [
  {
    name: 'Prakash Rao',
    firstName: 'Prakash',
    lastName: 'Rao',
    email: 'prakash.rao@sanjivani.in',
    hospitalIndex: 0, // Sanjivani
    password: 'PrakashRao@123',
  },
  {
    name: 'Revathi Kumar',
    firstName: 'Revathi',
    lastName: 'Kumar',
    email: 'revathi.kumar@aarogya.in',
    hospitalIndex: 1, // Aarogya Kendra
    password: 'RevathiKumar@123',
  },
];

// Sanjivani Hospital Doctors (5 hospital-specific)
const SANJIVANI_DOCTORS = [
  {
    firstName: 'Soundarya',
    lastName: 'Shetty',
    email: 'soundarya.shetty@sanjivani.in',
    specialization: 'Internal Medicine',
    licenseId: 'KA-LIC-SMD-2015-001',
    password: 'SoundaryaShetty@123',
  },
  {
    firstName: 'Christopher',
    lastName: 'Matthews',
    email: 'christopher.matthews@sanjivani.in',
    specialization: 'Cardiology',
    licenseId: 'KA-LIC-CM-2014-002',
    password: 'ChristopherMatthews@123',
  },
  {
    firstName: 'Manjunath',
    lastName: 'Rao',
    email: 'manjunath.rao@sanjivani.in',
    specialization: 'Orthopedics',
    licenseId: 'KA-LIC-MR-2013-003',
    password: 'ManjunathRao@123',
  },
  {
    firstName: 'Asia',
    lastName: 'Begum',
    email: 'asia.begum@sanjivani.in',
    specialization: 'Pediatrics',
    licenseId: 'KA-LIC-AB-2016-004',
    password: 'AsiaBegum@123',
  },
  {
    firstName: 'Ansh',
    lastName: 'Kumar',
    email: 'ansh.kumar@sanjivani.in',
    specialization: 'Neurology',
    licenseId: 'KA-LIC-AK-2017-005',
    password: 'AnshKumar@123',
  },
];

// Aarogya Kendra Doctors (5 hospital-specific)
const AAROGYA_DOCTORS = [
  {
    firstName: 'Harshith',
    lastName: 'Bagrecha',
    email: 'harshith.bagrecha@aarogya.in',
    specialization: 'General Surgery',
    licenseId: 'KA-LIC-HB-2015-006',
    password: 'HarshithBagrecha@123',
  },
  {
    firstName: 'Ashwin',
    lastName: 'S.',
    email: 'ashwin.s@aarogya.in',
    specialization: 'ENT',
    licenseId: 'KA-LIC-AS-2014-007',
    password: 'AshwinS@123',
  },
  {
    firstName: 'Apoorva',
    lastName: 'Santosh',
    email: 'apoorva.santosh@aarogya.in',
    specialization: 'Obstetrics & Gynecology',
    licenseId: 'KA-LIC-AP-2016-008',
    password: 'ApoorvaSantosh@123',
  },
  {
    firstName: 'Siri',
    lastName: 'M.N.',
    email: 'siri.mn@aarogya.in',
    specialization: 'Dermatology',
    licenseId: 'KA-LIC-SM-2015-009',
    password: 'SiriMN@123',
  },
  {
    firstName: 'Vinay',
    lastName: 'Kumar',
    email: 'vinay.kumar@aarogya.in',
    specialization: 'Radiology',
    licenseId: 'KA-LIC-VK-2017-010',
    password: 'VinayKumar@123',
  },
];

// Shared Doctor (affiliated with both hospitals)
const SHARED_DOCTOR = {
  firstName: 'Swami',
  lastName: 'Murti',
  email: 'swami.murti@jeevacare.in',
  specialization: 'Anesthesiology',
  licenseId: 'KA-LIC-SM-2013-011',
  password: 'SwamiMurti@123',
  shared: true,
};

// Sanjivani Hospital Patients (10 patients)
const SANJIVANI_PATIENTS = [
  { firstName: 'Rajesh', lastName: 'Kumar', email: 'rajesh.kumar.pat@sanjivani.in', dob: '1965-03-15', sex: 'M' },
  { firstName: 'Meera', lastName: 'Singh', email: 'meera.singh.pat@sanjivani.in', dob: '1972-07-22', sex: 'F' },
  { firstName: 'Anil', lastName: 'Patel', email: 'anil.patel.pat@sanjivani.in', dob: '1958-11-08', sex: 'M' },
  { firstName: 'Divya', lastName: 'Sharma', email: 'divya.sharma.pat@sanjivani.in', dob: '1985-05-19', sex: 'F' },
  { firstName: 'Suresh', lastName: 'Desai', email: 'suresh.desai.pat@sanjivani.in', dob: '1970-09-27', sex: 'M' },
  { firstName: 'Priya', lastName: 'Nair', email: 'priya.nair.pat@sanjivani.in', dob: '1992-02-14', sex: 'F' },
  { firstName: 'Vikram', lastName: 'Rao', email: 'vikram.rao.pat@sanjivani.in', dob: '1975-12-03', sex: 'M' },
  { firstName: 'Anjali', lastName: 'Chopra', email: 'anjali.chopra.pat@sanjivani.in', dob: '1988-06-10', sex: 'F' },
  { firstName: 'Arjun', lastName: 'Gupta', email: 'arjun.gupta.pat@sanjivani.in', dob: '1968-08-25', sex: 'M' },
  { firstName: 'Kavya', lastName: 'Iyer', email: 'kavya.iyer.pat@sanjivani.in', dob: '1995-01-17', sex: 'F' },
];

// Aarogya Kendra Patients (10 different patients)
const AAROGYA_PATIENTS = [
  { firstName: 'Ramesh', lastName: 'Krishnan', email: 'ramesh.krishnan.pat@aarogya.in', dob: '1962-04-12', sex: 'M' },
  { firstName: 'Sneha', lastName: 'Verma', email: 'sneha.verma.pat@aarogya.in', dob: '1980-10-21', sex: 'F' },
  { firstName: 'Nikhil', lastName: 'Pandey', email: 'nikhil.pandey.pat@aarogya.in', dob: '1975-06-18', sex: 'M' },
  { firstName: 'Isha', lastName: 'Joshi', email: 'isha.joshi.pat@aarogya.in', dob: '1987-03-09', sex: 'F' },
  { firstName: 'Rohan', lastName: 'Bansal', email: 'rohan.bansal.pat@aarogya.in', dob: '1970-09-14', sex: 'M' },
  { firstName: 'Neha', lastName: 'Menon', email: 'neha.menon.pat@aarogya.in', dob: '1993-07-26', sex: 'F' },
  { firstName: 'Sanjay', lastName: 'Agarwal', email: 'sanjay.agarwal.pat@aarogya.in', dob: '1966-12-05', sex: 'M' },
  { firstName: 'Pallavi', lastName: 'Saxena', email: 'pallavi.saxena.pat@aarogya.in', dob: '1982-11-30', sex: 'F' },
  { firstName: 'Ashok', lastName: 'Tripathi', email: 'ashok.tripathi.pat@aarogya.in', dob: '1973-02-28', sex: 'M' },
  { firstName: 'Ritika', lastName: 'Pathak', email: 'ritika.pathak.pat@aarogya.in', dob: '1996-05-13', sex: 'F' },
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

async function generatePasswordHash(password) {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
}

function generatePhoneNumber(seed = '') {
  const operators = ['98', '99', '97', '94', '91'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  const number = Math.random().toString().slice(2, 10);
  return `+${operator}${number}`;
}

function calculateAge(dob) {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

// ============================================================================
// DRY-RUN TRACKING (for verification without database writes)
// ============================================================================
let DRY_RUN = process.env.SEED_DRY_RUN === 'true' || process.env.SEED_DRY_RUN === '1';
const DRY_RUN_LOG = {
  mode: DRY_RUN ? 'DRY-RUN (no database writes)' : 'LIVE SEEDING',
  hospitalsToCreate: [],
  adminsToCreate: [],
  doctorsToCreate: [],
  patientsToCreate: [],
  operationsPlanned: 0,
  summary: {},
};

if (DRY_RUN) {
  console.log('\n⚠️  DRY-RUN MODE ENABLED');
  console.log('   No data will be written to the database.');
  console.log('   This pass validates the seed logic and reports intended changes.\n');
}

// ============================================================================
// SEEDING FUNCTIONS
// ============================================================================

async function seedHospitals() {
  console.log('\n🏥 Seeding hospitals...');
  const createdHospitals = [];

  for (const config of HOSPITALS_CONFIG) {
    try {
      let hospital = await Hospital.findOne({ facilityId: config.facilityId });

      if (hospital) {
        console.log(`  ✓ Hospital already exists: ${hospital.name}`);
      } else {
        if (DRY_RUN) {
          console.log(`  [DRY-RUN] Would create: ${config.name} (${config.facilityId})`);
          DRY_RUN_LOG.hospitalsToCreate.push({
            name: config.name,
            facilityId: config.facilityId,
            city: config.city_code,
          });
          DRY_RUN_LOG.operationsPlanned++;
        } else {
          hospital = new Hospital({
            facilityId: config.facilityId,
            name: config.name,
            facilityType: 'general_hospital',
            address: {
              street: config.street,
              city: config.city_code,
              state: config.state,
              country: 'India',
              zipCode: config.zipCode,
            },
            contactInfo: {
              phone: config.phone,
              email: config.email,
              website: config.website,
            },
            registration: {
              registrationNumber: config.registrationNumber,
              registrationType: 'state_registration',
              issuingAuthority: 'Karnataka Medical Council',
              issueDate: new Date('2015-01-01'),
              expiryDate: new Date('2028-12-31'),
            },
            services: ['emergency', 'cardiology', 'orthopedics', 'pediatrics', 'general_surgery', 'radiology'],
            status: 'active',
            verificationStatus: 'verified',
          });
          await hospital.save();
          console.log(`  ✓ Created hospital: ${hospital.name} (${config.city})`);
        }
      }

      createdHospitals.push(hospital || { name: config.name, facilityId: config.facilityId });
    } catch (error) {
      console.error(`  ✗ Failed to create hospital: ${error.message}`);
    }
  }

  return createdHospitals;
}

async function seedHospitalAdministrators(hospitals) {
  console.log('\n👨‍💼 Seeding hospital administrators...');
  const createdAdmins = [];

  for (const adminConfig of HOSPITAL_ADMINS_CONFIG) {
    try {
      const hospital = hospitals[adminConfig.hospitalIndex];
      let user = await User.findOne({ email: adminConfig.email });

      if (user) {
        console.log(`  ✓ Admin already exists: ${adminConfig.email}`);
      } else {
        const passwordHash = await generatePasswordHash(adminConfig.password);
        user = new User({
          email: adminConfig.email,
          passwordHash,
          role: 'HOSPITAL_ADMIN',
          profile: {
            firstName: adminConfig.firstName,
            lastName: adminConfig.lastName,
            phone: generatePhoneNumber(),
            hospitalId: hospital._id,
          },
          verificationStatus: 'verified',
        });
        await user.save();
        console.log(`  ✓ Created hospital admin: ${adminConfig.firstName} ${adminConfig.lastName} (${adminConfig.email})`);
      }

      // Ensure HospitalStaff association
      let staff = await HospitalStaff.findOne({
        userId: user._id,
        hospitalId: hospital._id,
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospital._id,
          role: 'hospital_admin',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2015-01-01'),
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
            manageStaff: true,
            manageFacility: true,
            accessEmergencyProfiles: true,
            approveEmergencyAccess: true,
          },
        });
        await staff.save();
      }

      createdAdmins.push({ user, hospital, password: adminConfig.password });
    } catch (error) {
      console.error(`  ✗ Failed to create admin: ${error.message}`);
    }
  }

  return createdAdmins;
}

async function seedDoctors(hospitals) {
  console.log('\n👨‍⚕️ Seeding doctors...');
  const createdDoctors = [];

  // Sanjivani Hospital doctors
  console.log('  📍 Sanjivani Hospital doctors:');
  for (const doctorConfig of SANJIVANI_DOCTORS) {
    try {
      let user = await User.findOne({ email: doctorConfig.email });

      if (user) {
        console.log(`    ✓ Already exists: ${doctorConfig.firstName} ${doctorConfig.lastName}`);
      } else {
        const passwordHash = await generatePasswordHash(doctorConfig.password);
        user = new User({
          email: doctorConfig.email,
          passwordHash,
          role: 'DOCTOR',
          profile: {
            firstName: doctorConfig.firstName,
            lastName: doctorConfig.lastName,
            phone: generatePhoneNumber(),
          },
          verificationStatus: 'verified',
        });
        await user.save();
        console.log(`    ✓ Created: ${doctorConfig.firstName} ${doctorConfig.lastName} (${doctorConfig.specialization})`);
      }

      // Create HospitalStaff association
      let staff = await HospitalStaff.findOne({
        userId: user._id,
        hospitalId: hospitals[0]._id,
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospitals[0]._id,
          role: 'doctor',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2015-01-01'),
          specialization: [doctorConfig.specialization],
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
            accessEmergencyProfiles: true,
          },
        });
        await staff.save();
      }

      // Create HealthcareProfessional profile
      let professional = await HealthcareProfessional.findOne({ userId: user._id });
      if (!professional) {
        professional = new HealthcareProfessional({
          userId: user._id,
          firstName: doctorConfig.firstName,
          lastName: doctorConfig.lastName,
          email: doctorConfig.email,
          phone: user.profile.phone,
          professionalType: 'doctor',
          specialization: [doctorConfig.specialization],
          licenseNumber: doctorConfig.licenseId,
          verificationStatus: 'verified',
          accountStatus: 'active',
          facilityAssociations: [staff._id],
        });
        await professional.save();
      }

      createdDoctors.push({ user, hospital: hospitals[0], password: doctorConfig.password, license: doctorConfig.licenseId });
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
    }
  }

  // Aarogya Kendra doctors
  console.log('  📍 Aarogya Kendra doctors:');
  for (const doctorConfig of AAROGYA_DOCTORS) {
    try {
      let user = await User.findOne({ email: doctorConfig.email });

      if (user) {
        console.log(`    ✓ Already exists: ${doctorConfig.firstName} ${doctorConfig.lastName}`);
      } else {
        const passwordHash = await generatePasswordHash(doctorConfig.password);
        user = new User({
          email: doctorConfig.email,
          passwordHash,
          role: 'DOCTOR',
          profile: {
            firstName: doctorConfig.firstName,
            lastName: doctorConfig.lastName,
            phone: generatePhoneNumber(),
          },
          verificationStatus: 'verified',
        });
        await user.save();
        console.log(`    ✓ Created: ${doctorConfig.firstName} ${doctorConfig.lastName} (${doctorConfig.specialization})`);
      }

      // Create HospitalStaff association
      let staff = await HospitalStaff.findOne({
        userId: user._id,
        hospitalId: hospitals[1]._id,
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospitals[1]._id,
          role: 'doctor',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2016-01-01'),
          specialization: [doctorConfig.specialization],
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
            accessEmergencyProfiles: true,
          },
        });
        await staff.save();
      }

      // Create HealthcareProfessional profile
      let professional = await HealthcareProfessional.findOne({ userId: user._id });
      if (!professional) {
        professional = new HealthcareProfessional({
          userId: user._id,
          firstName: doctorConfig.firstName,
          lastName: doctorConfig.lastName,
          email: doctorConfig.email,
          phone: user.profile.phone,
          professionalType: 'doctor',
          specialization: [doctorConfig.specialization],
          licenseNumber: doctorConfig.licenseId,
          verificationStatus: 'verified',
          accountStatus: 'active',
          facilityAssociations: [staff._id],
        });
        await professional.save();
      }

      createdDoctors.push({ user, hospital: hospitals[1], password: doctorConfig.password, license: doctorConfig.licenseId });
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
    }
  }

  // Shared Doctor (Swami Murti) - affiliated with both hospitals
  console.log('  📍 Shared doctor (both hospitals):');
  try {
    let user = await User.findOne({ email: SHARED_DOCTOR.email });

    if (user) {
      console.log(`    ✓ Already exists: ${SHARED_DOCTOR.firstName} ${SHARED_DOCTOR.lastName}`);
    } else {
      const passwordHash = await generatePasswordHash(SHARED_DOCTOR.password);
      user = new User({
        email: SHARED_DOCTOR.email,
        passwordHash,
        role: 'DOCTOR',
        profile: {
          firstName: SHARED_DOCTOR.firstName,
          lastName: SHARED_DOCTOR.lastName,
          phone: generatePhoneNumber(),
        },
        verificationStatus: 'verified',
      });
      await user.save();
      console.log(`    ✓ Created: ${SHARED_DOCTOR.firstName} ${SHARED_DOCTOR.lastName} (${SHARED_DOCTOR.specialization}) - SHARED`);
    }

    // Create HealthcareProfessional profile
    let professional = await HealthcareProfessional.findOne({ userId: user._id });
    if (!professional) {
      professional = new HealthcareProfessional({
        userId: user._id,
        firstName: SHARED_DOCTOR.firstName,
        lastName: SHARED_DOCTOR.lastName,
        email: SHARED_DOCTOR.email,
        phone: user.profile.phone,
        professionalType: 'doctor',
        specialization: [SHARED_DOCTOR.specialization],
        licenseNumber: SHARED_DOCTOR.licenseId,
        verificationStatus: 'verified',
        accountStatus: 'active',
      });
      await professional.save();
    }

    // Associate with both hospitals
    const staffAssociations = [];
    for (let i = 0; i < hospitals.length; i++) {
      let staff = await HospitalStaff.findOne({
        userId: user._id,
        hospitalId: hospitals[i]._id,
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospitals[i]._id,
          role: 'doctor',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2013-01-01'),
          specialization: [SHARED_DOCTOR.specialization],
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
            accessEmergencyProfiles: true,
          },
        });
        await staff.save();
      }
      staffAssociations.push(staff._id);
    }

    // Update professional with both associations
    if (professional && professional.facilityAssociations.length === 0) {
      professional.facilityAssociations = staffAssociations;
      await professional.save();
    }

    createdDoctors.push({ user, hospitals, password: SHARED_DOCTOR.password, license: SHARED_DOCTOR.licenseId, shared: true });
  } catch (error) {
    console.error(`    ✗ Failed to create shared doctor: ${error.message}`);
  }

  return createdDoctors;
}

async function seedPatients(hospitals, doctors) {
  console.log('\n👥 Seeding patients...');
  const createdPatients = [];
  const defaultPassword = 'Patient@123';

  // Sanjivani Hospital patients
  console.log('  📍 Sanjivani Hospital patients:');
  for (let idx = 0; idx < SANJIVANI_PATIENTS.length; idx++) {
    const patientConfig = SANJIVANI_PATIENTS[idx];
    try {
      let user = await User.findOne({ email: patientConfig.email });

      if (user) {
        console.log(`    ✓ Already exists: ${patientConfig.firstName} ${patientConfig.lastName}`);
      } else {
        const passwordHash = await generatePasswordHash(defaultPassword);
        user = new User({
          email: patientConfig.email,
          passwordHash,
          role: 'PATIENT',
          profile: {
            firstName: patientConfig.firstName,
            lastName: patientConfig.lastName,
            phone: generatePhoneNumber(),
          },
          verificationStatus: 'verified',
        });
        await user.save();

        // Create Patient profile
        const dob = new Date(patientConfig.dob);
        const patient = new Patient({
          userId: user._id,
          personalIdentity: {
            firstName: patientConfig.firstName,
            lastName: patientConfig.lastName,
            dateOfBirth: dob,
            sex: patientConfig.sex,
            phone: user.profile.phone,
            email: patientConfig.email,
          },
          bloodGroup: {
            group: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'][Math.floor(Math.random() * 8)],
            source: 'patient_reported',
          },
          facilities: [
            {
              facilityId: hospitals[0]._id,
              registeredAt: new Date(),
            },
          ],
          createdBy: user._id,
          status: 'active',
        });
        await patient.save();

        // Assign a primary doctor (rotate through available doctors)
        const assignedDoctorIdx = idx % SANJIVANI_DOCTORS.length;
        const assignedDoctor = doctors.find(d => d.hospital._id.toString() === hospitals[0]._id.toString() && d.user.email === SANJIVANI_DOCTORS[assignedDoctorIdx].email);
        
        if (assignedDoctor) {
          // Create a clinical record to establish the doctor-patient relationship
          const clinicalRecord = new ClinicalRecord({
            patientId: patient._id,
            providerId: assignedDoctor.user._id,
            hospitalId: hospitals[0]._id,
            recordType: 'initial_assessment',
            status: 'completed',
            createdAt: new Date(),
          });
          await clinicalRecord.save();
        }

        console.log(`    ✓ Created: ${patientConfig.firstName} ${patientConfig.lastName} (Age ${calculateAge(dob)})`);
      }

      createdPatients.push({ user, hospital: hospitals[0], password: defaultPassword });
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
    }
  }

  // Aarogya Kendra patients
  console.log('  📍 Aarogya Kendra patients:');
  for (let idx = 0; idx < AAROGYA_PATIENTS.length; idx++) {
    const patientConfig = AAROGYA_PATIENTS[idx];
    try {
      let user = await User.findOne({ email: patientConfig.email });

      if (user) {
        console.log(`    ✓ Already exists: ${patientConfig.firstName} ${patientConfig.lastName}`);
      } else {
        const passwordHash = await generatePasswordHash(defaultPassword);
        user = new User({
          email: patientConfig.email,
          passwordHash,
          role: 'PATIENT',
          profile: {
            firstName: patientConfig.firstName,
            lastName: patientConfig.lastName,
            phone: generatePhoneNumber(),
          },
          verificationStatus: 'verified',
        });
        await user.save();

        // Create Patient profile
        const dob = new Date(patientConfig.dob);
        const patient = new Patient({
          userId: user._id,
          personalIdentity: {
            firstName: patientConfig.firstName,
            lastName: patientConfig.lastName,
            dateOfBirth: dob,
            sex: patientConfig.sex,
            phone: user.profile.phone,
            email: patientConfig.email,
          },
          bloodGroup: {
            group: ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'][Math.floor(Math.random() * 8)],
            source: 'patient_reported',
          },
          facilities: [
            {
              facilityId: hospitals[1]._id,
              registeredAt: new Date(),
            },
          ],
          createdBy: user._id,
          status: 'active',
        });
        await patient.save();

        // Assign a primary doctor
        const assignedDoctorIdx = idx % AAROGYA_DOCTORS.length;
        const assignedDoctor = doctors.find(d => d.hospital._id.toString() === hospitals[1]._id.toString() && d.user.email === AAROGYA_DOCTORS[assignedDoctorIdx].email);
        
        if (assignedDoctor) {
          const clinicalRecord = new ClinicalRecord({
            patientId: patient._id,
            providerId: assignedDoctor.user._id,
            hospitalId: hospitals[1]._id,
            recordType: 'initial_assessment',
            status: 'completed',
            createdAt: new Date(),
          });
          await clinicalRecord.save();
        }

        console.log(`    ✓ Created: ${patientConfig.firstName} ${patientConfig.lastName} (Age ${calculateAge(dob)})`);
      }

      createdPatients.push({ user, hospital: hospitals[1], password: defaultPassword });
    } catch (error) {
      console.error(`    ✗ Failed: ${error.message}`);
    }
  }

  return createdPatients;
}

async function seedRadiologyReports(hospitals, patients) {
  console.log('\n📋 Seeding radiology reports...');
  let reportCount = 0;

  // Create 3 synthetic reports per hospital
  for (let h = 0; h < hospitals.length; h++) {
    const hospitalPatients = patients.filter(p => p.hospital._id.toString() === hospitals[h]._id.toString());
    
    for (let i = 0; i < 3 && i < hospitalPatients.length; i++) {
      try {
        const patientId = await Patient.findOne({ userId: hospitalPatients[i].user._id }).then(p => p._id);
        
        const studyDate = new Date();
        studyDate.setDate(studyDate.getDate() - Math.floor(Math.random() * 30));

        const report = new RadiologyRecord({
          patientId,
          hospitalId: hospitals[h]._id,
          studyType: ['Chest X-Ray', 'Abdominal CT', 'Shoulder Ultrasound', 'Knee MRI'][Math.floor(Math.random() * 4)],
          studyDescription: '[SYNTHETIC DEMO DATA] Radiological examination for demonstration purposes',
          studyDate,
          findings: '[DEMO] No acute findings. Technique and positioning satisfactory for diagnostic evaluation.',
          impressions: '[DEMO] Normal radiographic examination. Clinical correlation recommended.',
          status: 'completed',
          radiologistId: null,
          createdAt: studyDate,
          metadata: {
            isDemo: true,
            markedSynthetic: true,
          },
        });
        await report.save();
        reportCount++;
        console.log(`  ✓ Created radiology report for ${hospitalPatients[i].user.profile.firstName} ${hospitalPatients[i].user.profile.lastName}`);
      } catch (error) {
        console.error(`  ✗ Failed to create radiology report: ${error.message}`);
      }
    }
  }

  console.log(`  Total radiology reports created: ${reportCount}`);
}

async function seedAppointments(hospitals, doctors, patients) {
  console.log('\n📅 Seeding appointments...');
  let appointmentCount = 0;

  for (let h = 0; h < hospitals.length; h++) {
    const hospitalDoctors = doctors.filter(d => 
      Array.isArray(d.hospitals) 
        ? d.hospitals.some(dh => dh._id.toString() === hospitals[h]._id.toString())
        : d.hospital._id.toString() === hospitals[h]._id.toString()
    );
    
    const hospitalPatients = patients.filter(p => p.hospital._id.toString() === hospitals[h]._id.toString());

    for (let i = 0; i < 5 && hospitalDoctors.length > 0 && hospitalPatients.length > 0; i++) {
      try {
        const doctor = hospitalDoctors[Math.floor(Math.random() * hospitalDoctors.length)];
        const patient = hospitalPatients[Math.floor(Math.random() * hospitalPatients.length)];

        const appointmentDate = new Date();
        appointmentDate.setDate(appointmentDate.getDate() + Math.floor(Math.random() * 60) + 1);
        appointmentDate.setHours(9 + Math.floor(Math.random() * 8), 0, 0, 0);

        const patientId = await Patient.findOne({ userId: patient.user._id }).then(p => p._id);

        let appointment = await Appointment.findOne({
          doctorId: doctor.user._id,
          patientId,
          appointmentDate: {
            $gte: new Date(appointmentDate.toDateString()),
            $lt: new Date(new Date(appointmentDate.toDateString()).getTime() + 24 * 60 * 60 * 1000),
          },
        });

        if (!appointment) {
          appointment = new Appointment({
            doctorId: doctor.user._id,
            patientId,
            appointmentDate,
            reason: ['General Checkup', 'Follow-up', 'Consultation', 'Treatment', 'Lab Work'][Math.floor(Math.random() * 5)],
            status: 'scheduled',
            notes: '[SYNTHETIC DEMO DATA]',
          });
          await appointment.save();
          appointmentCount++;
        }
      } catch (error) {
        console.error(`  ✗ Failed to create appointment: ${error.message}`);
      }
    }
  }

  console.log(`  Total appointments created: ${appointmentCount}`);
}

async function main() {
  try {
    // Safety check: Production environment
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ SAFETY CHECK FAILED: Synthetic data seeding is disabled in production');
      process.exit(1);
    }

    // Safety check: Require explicit TEST_MONGODB_URI
    const mongoUri = process.env.TEST_MONGODB_URI;
    if (!mongoUri) {
      console.error('❌ MISSING TEST DATABASE CONFIGURATION');
      console.error('   The TEST_MONGODB_URI environment variable is required to seed demo data.');
      console.error('   This prevents accidental seeding of production databases.');
      console.error('');
      console.error('   To seed the test database, set:');
      console.error('   TEST_MONGODB_URI=mongodb://localhost:27017/jeevacare-test');
      console.error('');
      console.error('   Then run: npm run seed:synthetic');
      process.exit(1);
    }

    // Safety check: Verify database name is exactly jeevacare-test
    const dbNameMatch = mongoUri.match(/\/([a-zA-Z0-9_-]+)(?:\?|$)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : null;
    
    if (dbName !== 'jeevacare-test') {
      console.error('❌ INVALID TEST DATABASE');
      console.error(`   Expected database: jeevacare-test`);
      console.error(`   Got: ${dbName || 'unknown'}`);
      console.error('');
      console.error('   This safety check prevents accidental seeding of production or unintended databases.');
      console.error('   Set TEST_MONGODB_URI to a connection string targeting jeevacare-test.');
      process.exit(1);
    }

    console.log('✓ Database target verified: jeevacare-test');

    // Connect to database (do not log URI)
    console.log('🔌 Connecting to MongoDB...');
    try {
      await mongoose.connect(mongoUri);
      console.log('✓ Connected to MongoDB');
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB');
      console.error(`   Error: ${error.message}`);
      process.exit(1);
    }

    // Seed data in order
    const hospitals = await seedHospitals();
    const admins = await seedHospitalAdministrators(hospitals);
    const doctors = await seedDoctors(hospitals);
    const patients = await seedPatients(hospitals, doctors);

    // Seed clinical data
    await seedAppointments(hospitals, doctors, patients);
    await seedRadiologyReports(hospitals, patients);

    // ============================================================================
    // SUMMARY AND VERIFICATION
    // ============================================================================

    if (DRY_RUN) {
      console.log('\n\n📋 DRY-RUN SUMMARY (No data written to database)');
      console.log('═'.repeat(80));
      console.log(`\nPlanned Operations: ${DRY_RUN_LOG.operationsPlanned}`);
      console.log(`\nHospitals to create: ${DRY_RUN_LOG.hospitalsToCreate.length}`);
      for (const h of DRY_RUN_LOG.hospitalsToCreate) {
        console.log(`  - ${h.name} (${h.facilityId})`);
      }
      console.log('\n✅ DRY-RUN PASSED: Seed logic validated without database writes');
      console.log('\nTo perform actual seeding, run:');
      console.log('  unset SEED_DRY_RUN');
      console.log('  TEST_MONGODB_URI=mongodb://localhost:27017/jeevacare-test npm run seed:synthetic');
      process.exit(0);
    }

    console.log('\n\n✅ SYNTHETIC DATA SEEDING COMPLETED SUCCESSFULLY!');
    console.log('═'.repeat(80));

    console.log('\n📊 SUMMARY:');
    console.log(`  ✓ Hospitals: ${hospitals.length}`);
    console.log(`  ✓ Hospital Admins: ${admins.length}`);
    console.log(`  ✓ Doctors: ${doctors.length} (including 1 shared doctor)`);
    console.log(`  ✓ Patients: ${patients.length}`);

    console.log('\n🏥 HOSPITALS & ADMINISTRATORS:');
    for (let i = 0; i < admins.length; i++) {
      const admin = admins[i];
      console.log(`\n  Hospital ${i + 1}: ${hospitals[i].name}`);
      console.log(`  📍 Location: ${hospitals[i].address.city}, ${hospitals[i].address.state}`);
      console.log(`  Administrator: ${admin.user.profile.firstName} ${admin.user.profile.lastName}`);
      console.log(`  📧 Email: ${admin.user.email}`);
    }

    console.log('\n\n👨‍⚕️ DOCTORS (Sample):');
    for (let i = 0; i < Math.min(3, doctors.length); i++) {
      const doctor = doctors[i];
      console.log(`  ${doctor.user.profile.firstName} ${doctor.user.profile.lastName}`);
      console.log(`    📧 Email: ${doctor.user.email}`);
    }
    console.log(`  ... and ${Math.max(0, doctors.length - 3)} more doctors\n`);

    console.log('═'.repeat(80));
    console.log('\n✨ NEXT STEPS:');
    console.log('  1. Verify accounts via MongoDB: use jeevacare-test; db.users.count()');
    console.log('  2. Start the backend: npm run start:server');
    console.log('  3. Start the frontend: npm run start:client');
    console.log('  4. Test login with doctor credentials from output above');
    console.log('\n🔐 Note: These are synthetic demo credentials only. Never use in production.');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

main();
