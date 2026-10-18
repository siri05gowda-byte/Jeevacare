/**
 * Synthetic Healthcare Dataset Seeding Script
 * Creates realistic Indian healthcare demonstration data
 * 
 * IMPORTANT:
 * - Only runs in development or staging environments
 * - Never automatically runs on production
 * - Is idempotent (safe to re-run)
 * - Preserves existing demo data
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
import logger from '../utils/logger.js';

// Synthetic Indian names
const FIRST_NAMES_MALE = [
  'Arun', 'Raj', 'Vikram', 'Suresh', 'Deepak',
  'Arjun', 'Nikhil', 'Rohan', 'Sanjay', 'Ashok'
];

const FIRST_NAMES_FEMALE = [
  'Priya', 'Anjali', 'Kavya', 'Neha', 'Riya',
  'Asha', 'Pooja', 'Divya', 'Meera', 'Shruti'
];

const LAST_NAMES = [
  'Sharma', 'Kumar', 'Singh', 'Patel', 'Reddy',
  'Gupta', 'Nair', 'Desai', 'Chopra', 'Malhotra'
];

const SPECIALIZATIONS = [
  'General Practitioner',
  'Cardiology',
  'Orthopedics',
  'Pediatrics',
  'Neurology',
  'ENT',
  'General Surgery',
  'Obstetrics',
  'Dermatology',
];

// Deterministic ID generation for idempotency
function generateDeterministicId(prefix, index) {
  return `${prefix}-${String(index).padStart(4, '0')}`;
}

async function hashPassword(password) {
  const salt = await bcryptjs.genSalt(10);
  return await bcryptjs.hash(password, salt);
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generatePhoneNumber() {
  const operators = ['91', '98', '99', '97', '94'];
  const operator = getRandomItem(operators);
  const number = Math.random().toString().slice(2, 10);
  return `+${operator}${number}`;
}

async function seedHospitals() {
  console.log('🏥 Seeding hospitals...');

  const hospitals = [
    {
      facilityId: 'JC-HOSP-AROGYA-001',
      name: 'Aarogya Multispeciality Hospital',
      facilityType: 'general_hospital',
      address: {
        street: '123 Whitefield Road',
        city: 'Bengaluru',
        state: 'Karnataka',
        country: 'India',
        zipCode: '560066',
      },
      contactInfo: {
        phone: '+91-080-40615000',
        email: 'info@aarogyahosp.in',
        website: 'www.aarogyahosp.in',
      },
      registration: {
        registrationNumber: 'KA-0001/2020',
        registrationType: 'state_registration',
        issuingAuthority: 'Karnataka Medical Council',
        issueDate: new Date('2020-01-15'),
        expiryDate: new Date('2025-01-15'),
      },
      services: [
        'emergency',
        'cardiology',
        'orthopedics',
        'pediatrics',
        'general_surgery',
      ],
      status: 'active',
      verificationStatus: 'verified',
    },
    {
      facilityId: 'JC-HOSP-SANJEEVANI-001',
      name: 'Sanjeevani City Hospital',
      facilityType: 'general_hospital',
      address: {
        street: '456 Indiranagar',
        city: 'Mysuru',
        state: 'Karnataka',
        country: 'India',
        zipCode: '570001',
      },
      contactInfo: {
        phone: '+91-0821-2345678',
        email: 'admin@sanjeevani-hosp.in',
        website: 'www.sanjeevani-hosp.in',
      },
      registration: {
        registrationNumber: 'KA-0002/2019',
        registrationType: 'state_registration',
        issuingAuthority: 'Karnataka Medical Council',
        issueDate: new Date('2019-06-01'),
        expiryDate: new Date('2024-06-01'),
      },
      services: ['emergency', 'neurology', 'ent', 'obstetrics', 'dermatology'],
      status: 'active',
      verificationStatus: 'verified',
    },
  ];

  const createdHospitals = [];
  for (const hospitalData of hospitals) {
    try {
      let hospital = await Hospital.findOne({ facilityId: hospitalData.facilityId });

      if (hospital) {
        console.log(`  ✓ Hospital already exists: ${hospital.name}`);
      } else {
        hospital = new Hospital(hospitalData);
        await hospital.save();
        console.log(`  ✓ Created hospital: ${hospital.name}`);
      }

      createdHospitals.push(hospital);
    } catch (error) {
      console.error(`  ✗ Failed to create hospital: ${error.message}`);
    }
  }

  return createdHospitals;
}

async function seedHospitalAdministrators(hospitals) {
  console.log('👨‍💼 Seeding hospital administrators...');

  const admins = [
    {
      hospitalId: hospitals[0]._id,
      email: 'admin@aarogya.in',
      firstName: 'Rajesh',
      lastName: 'Kumar',
      hospitalName: hospitals[0].name,
    },
    {
      hospitalId: hospitals[1]._id,
      email: 'admin@sanjeevani.in',
      firstName: 'Priya',
      lastName: 'Sharma',
      hospitalName: hospitals[1].name,
    },
  ];

  const createdAdmins = [];
  for (const adminData of admins) {
    try {
      let user = await User.findOne({ email: adminData.email });

      if (user) {
        console.log(`  ✓ Admin already exists: ${adminData.email}`);
      } else {
        user = new User({
          email: adminData.email,
          passwordHash: 'hospital_admin_123', // Will be hashed by middleware
          role: 'HOSPITAL_ADMIN',
          jeevaId: `JC-ADM-${generateDeterministicId('H', createdAdmins.length)}`,
          verificationStatus: 'verified',
          profile: {
            firstName: adminData.firstName,
            lastName: adminData.lastName,
            hospitalId: adminData.hospitalId,
          },
        });
        await user.save();
        console.log(`  ✓ Created hospital admin: ${adminData.email}`);
      }

      // Ensure HospitalStaff association
      let staff = await HospitalStaff.findOne({
        userId: user._id,
        hospitalId: adminData.hospitalId,
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: adminData.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2020-01-01'),
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            manageStaff: true,
            manageFacility: true,
            accessEmergencyProfiles: true,
            approveEmergencyAccess: true,
          },
        });
        await staff.save();
      }

      createdAdmins.push(user);
    } catch (error) {
      console.error(`  ✗ Failed to create admin: ${error.message}`);
    }
  }

  return createdAdmins;
}

async function seedDoctors(hospitals) {
  console.log('👨‍⚕️ Seeding doctors...');

  const doctorCount = 5;
  const createdDoctors = [];

  for (let i = 0; i < doctorCount; i++) {
    const firstName = getRandomItem(FIRST_NAMES_MALE);
    const lastName = getRandomItem(LAST_NAMES);
    const hospital = getRandomItem(hospitals);
    const specialization = getRandomItem(SPECIALIZATIONS);

    try {
      const email = `dr.${firstName.toLowerCase()}.${lastName.toLowerCase()}@jeevacare.in`;

      let user = await User.findOne({ email });

      if (user) {
        console.log(`  ✓ Doctor already exists: ${email}`);
      } else {
        user = new User({
          email,
          passwordHash: 'doctor_123',
          role: 'DOCTOR',
          jeevaId: generateDeterministicId('JC-DOC', i),
          verificationStatus: 'verified',
          profile: {
            firstName,
            lastName,
            phone: generatePhoneNumber(),
          },
        });
        await user.save();
        console.log(`  ✓ Created doctor: ${email}`);
      }

      // Create HospitalStaff association
      let staff = await HospitalStaff.findOne({
        userId: user._id,
        hospitalId: hospital._id,
        associationStatus: 'active',
      });

      if (!staff) {
        staff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospital._id,
          role: 'doctor',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date('2021-01-01'),
          specialization: [specialization],
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            manageAppointments: true,
          },
        });
        await staff.save();
      }

      // Create HealthcareProfessional profile
      let professional = await HealthcareProfessional.findOne({ userId: user._id });
      if (!professional) {
        professional = new HealthcareProfessional({
          userId: user._id,
          professionalId: generateDeterministicId('DOC', i),
          professionalType: 'DOCTOR',
          specialization,
          verificationStatus: 'verified',
          facilityAssociations: [hospital._id],
        });
        await professional.save();
      }

      createdDoctors.push(user);
    } catch (error) {
      console.error(`  ✗ Failed to create doctor: ${error.message}`);
    }
  }

  return createdDoctors;
}

async function seedPatients() {
  console.log('👥 Seeding patients...');

  const patientCount = 15;
  const createdPatients = [];

  for (let i = 0; i < patientCount; i++) {
    const firstName = getRandomItem(
      Math.random() > 0.5 ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE
    );
    const lastName = getRandomItem(LAST_NAMES);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;

    try {
      let user = await User.findOne({ email });

      if (user) {
        console.log(`  ✓ Patient already exists: ${email}`);
      } else {
        user = new User({
          email,
          passwordHash: 'patient_123',
          role: 'PATIENT',
          jeevaId: generateDeterministicId('JC-PAT', i),
          verificationStatus: 'verified',
          profile: {
            firstName,
            lastName,
            phone: generatePhoneNumber(),
          },
        });
        await user.save();

        // Create Patient profile
        const dob = new Date('1980-01-01');
        dob.setFullYear(1980 + Math.floor(Math.random() * 40));

        const patient = new Patient({
          userId: user._id,
          personalIdentity: {
            firstName,
            lastName,
            dateOfBirth: dob,
            sex: Math.random() > 0.5 ? 'M' : 'F',
            phone: user.profile.phone,
          },
          bloodGroup: {
            group: getRandomItem(['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']),
            source: 'patient_reported',
          },
          createdBy: user._id,
        });
        await patient.save();

        console.log(`  ✓ Created patient: ${email}`);
      }

      createdPatients.push(user);
    } catch (error) {
      console.error(`  ✗ Failed to create patient: ${error.message}`);
    }
  }

  return createdPatients;
}

async function seedAppointments(doctors, patients) {
  console.log('📅 Seeding appointments...');

  let appointmentCount = 0;

  for (let i = 0; i < 8; i++) {
    try {
      const doctor = getRandomItem(doctors);
      const patient = getRandomItem(patients);

      const appointmentDate = new Date();
      appointmentDate.setDate(
        appointmentDate.getDate() + Math.floor(Math.random() * 30)
      );

      let appointment = await Appointment.findOne({
        doctorId: doctor._id,
        patientId: patient._id,
        appointmentDate: {
          $gte: new Date(appointmentDate.toDateString()),
          $lt: new Date(
            appointmentDate.getTime() + 24 * 60 * 60 * 1000
          ),
        },
      });

      if (!appointment) {
        appointment = new Appointment({
          doctorId: doctor._id,
          patientId: patient._id,
          appointmentDate,
          reason: getRandomItem([
            'General Checkup',
            'Follow-up',
            'Consultation',
            'Treatment',
          ]),
          status: 'scheduled',
        });
        await appointment.save();
        appointmentCount++;
        console.log(`  ✓ Created appointment between ${doctor.profile.firstName} and ${patient.profile.firstName}`);
      }
    } catch (error) {
      console.error(`  ✗ Failed to create appointment: ${error.message}`);
    }
  }

  console.log(`  Total appointments created: ${appointmentCount}`);
}

async function main() {
  try {
    // Safety check
    if (process.env.NODE_ENV === 'production') {
      console.error('❌ SAFETY CHECK FAILED: Synthetic data seeding is disabled in production');
      process.exit(1);
    }

    // Connect to database
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/jeevacare'
    );
    console.log('✓ Connected to MongoDB');

    // Seed data in order
    const hospitals = await seedHospitals();
    const admins = await seedHospitalAdministrators(hospitals);
    const doctors = await seedDoctors(hospitals);
    const patients = await seedPatients();

    // Optional: create some appointments
    if (doctors.length > 0 && patients.length > 0) {
      await seedAppointments(doctors, patients);
    }

    console.log('\n✅ Synthetic data seeding completed successfully!');
    console.log('\n📋 Created:');
    console.log(`  - ${hospitals.length} hospitals`);
    console.log(`  - ${admins.length} hospital administrators`);
    console.log(`  - ${doctors.length} doctors`);
    console.log(`  - ${patients.length} patients`);

    console.log('\n🔑 Test Credentials:');
    console.log('  Hospital Admin: admin@aarogya.in / hospital_admin_123');
    console.log('  Doctor: dr.arun.sharma@jeevacare.in / doctor_123');
    console.log('  Patient: arun.sharma@example.com / patient_123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
