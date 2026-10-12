/**
 * Comprehensive Synthetic Healthcare Data Seed Script
 * Phase 1-5: Major Upgrade Implementation
 * 
 * Creates:
 * - 10 diverse Indian doctors with realistic profiles
 * - Nurses and laboratory technicians
 * - 30-50 diverse synthetic patients with medical histories
 * - Appointments, encounters, and clinical records
 * - Laboratory results and radiology reports
 * - Demo accounts: patient@demo.com, doctor@demo.com, admin@demo.com
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

const seedComprehensiveData = async () => {
  try {
    logger.info('🌱 Starting comprehensive synthetic data seeding...\n');

    await mongoose.connect(config.database.uri);
    logger.info('✅ Connected to MongoDB\n');

    // ==========================================
    // PHASE 1: HOSPITALS/FACILITIES
    // ==========================================
    logger.info('🏥 Creating Hospitals...');
    
    const hospitals = await createHospitals();
    logger.info(`✅ Created ${hospitals.length} hospitals\n`);

    // ==========================================
    // PHASE 2: HEALTHCARE WORKFORCE
    // ==========================================
    logger.info('👨‍⚕️ Creating Healthcare Workforce...');
    
    const doctors = await createDoctors(hospitals);
    logger.info(`✅ Created ${doctors.length} doctors`);
    
    const nurses = await createNurses(hospitals);
    logger.info(`✅ Created ${nurses.length} nurses`);
    
    const labTechs = await createLabTechs(hospitals);
    logger.info(`✅ Created ${labTechs.length} lab technicians\n`);

    // ==========================================
    // PHASE 3: DEMO ACCOUNTS
    // ==========================================
    logger.info('🔐 Creating Demo Accounts...');
    
    const demoAccounts = await createDemoAccounts(hospitals[0], doctors[0]);
    logger.info('✅ Demo accounts created\n');

    // ==========================================
    // PHASE 4: SYNTHETIC PATIENTS
    // ==========================================
    logger.info('👥 Creating Synthetic Patient Population...');
    
    const patients = await createSyntheticPatients(hospitals);
    logger.info(`✅ Created ${patients.length} synthetic patients\n`);

    // ==========================================
    // PHASE 5: MEDICAL RECORDS
    // ==========================================
    logger.info('📋 Creating Medical Records...');
    
    await createMedicalRecords(patients, doctors, nurses, labTechs, hospitals, demoAccounts?.patientDoc);
    logger.info('✅ Medical records created\n');

    // ==========================================
    // SUMMARY
    // ==========================================
    logger.info('═══════════════════════════════════════════════════════');
    logger.info('✅ COMPREHENSIVE SYNTHETIC DATA SEEDING COMPLETE');
    logger.info('═══════════════════════════════════════════════════════\n');
    
    logger.info('📊 Summary:');
    logger.info(`   Hospitals: ${hospitals.length}`);
    logger.info(`   Doctors: ${doctors.length}`);
    logger.info(`   Nurses: ${nurses.length}`);
    logger.info(`   Lab Technicians: ${labTechs.length}`);
    logger.info(`   Patients: ${patients.length}\n`);
    
    logger.info('🔐 Demo Credentials:');
    logger.info('   Patient: patient@demo.com / DemoPassword123');
    logger.info('   Doctor: doctor@demo.com / DemoPassword123');
    logger.info('   Admin: admin@demo.com / DemoPassword123\n');
    
    logger.info('⚠️  IMPORTANT: This is SYNTHETIC DEMO DATA');
    logger.info('   NOT FOR CLINICAL USE\n');

    process.exit(0);
  } catch (error) {
    logger.error(`❌ Seeding failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
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
    // Check if hospital exists (idempotent)
    let hospital = await Hospital.findOne({ name: data.name });
    if (!hospital) {
      hospital = await Hospital.create(data);
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
    
    // Check if user exists (idempotent)
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
    }

    // Check if professional exists
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
    }

    // Check if staff association exists (idempotent)
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
  }

  // Doctor Demo Account (use first created doctor)
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

  // Ensure HealthcareProfessional and HospitalStaff exist for doctor@demo.com
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
  }

  // Retrieve patient document for demo patient
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
  for (let i = 0; i < patientTemplates.length; i++) {
    const template = patientTemplates[i];
    const email = `${template.firstName.toLowerCase()}.${template.lastName.toLowerCase()}@synthetic.demo`;
    
    // Check if already exists (idempotent)
    let existingPatient = await Patient.findOne({ 'personalIdentity.email': email });
    if (existingPatient) {
      patients.push(existingPatient);
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
  }

  return patients;
}

// ==========================================
// MEDICAL RECORDS CREATION
// ==========================================
async function createMedicalRecords(patients, doctors, nurses, labTechs, hospitals, demoPatient) {
  const recordsPatients = demoPatient ? [demoPatient, ...patients] : patients;
  // Create sample lab results for selected patients
  for (let i = 0; i < Math.min(15, recordsPatients.length); i++) {
    const patient = recordsPatients[i];
    const doctor = doctors[i % doctors.length];
    const labTech = labTechs[i % labTechs.length];
    const hospital = hospitals[i % hospitals.length];

    // Check if lab result already exists
    const existingLab = await LaboratoryResult.findOne({ patientId: patient._id });
    if (!existingLab) {
      await LaboratoryResult.create({
        patientId: patient._id,
        facilityId: hospital._id,
        providerId: doctor.user._id,
        labName: hospital.name + ' Diagnostic Laboratory',
        labTestName: `[DEMO] ${['Complete Blood Count', 'Blood Glucose', 'Lipid Profile', 'Thyroid Function'][i % 4]}`,
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
    }

    // Create sample radiology records for some patients
    if (i % 3 === 0) {
      const existingRadiology = await RadiologyRecord.findOne({ patientId: patient._id });
      if (!existingRadiology) {
        await RadiologyRecord.create({
          patientId: patient._id,
          facilityId: hospital._id,
          providerId: doctor.user._id,
          studyDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          reportDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
          modalityType: ['x_ray', 'ct_scan', 'ultrasound'][i % 3],
          bodyPart: ['chest', 'abdomen', 'head'][i % 3],
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
      }
    }

    // Create vaccination records for children
    const age = new Date().getFullYear() - new Date(patient.personalIdentity.dateOfBirth).getFullYear();
    if (age < 18) {
      const existingVaccination = await Vaccination.findOne({ patientId: patient._id });
      if (!existingVaccination) {
        await Vaccination.create({
          patientId: patient._id,
          vaccineName: age < 2 ? 'BCG' : 'MMR',
          dose: 'Dose 1',
          administrationDate: new Date(patient.personalIdentity.dateOfBirth.getTime() + 60 * 24 * 60 * 60 * 1000),
          facilityId: hospital._id,
          provider: 'Dr. ' + doctor.professional.firstName + ' ' + doctor.professional.lastName,
          providerId: doctor.user._id,
          verificationStatus: 'provider_verified',
        });
      }
    }
  }

  logger.info('   ✅ Lab results created');
  logger.info('   ✅ Radiology records created');
  logger.info('   ✅ Vaccination records created');
}

// Run the seed script
seedComprehensiveData();
