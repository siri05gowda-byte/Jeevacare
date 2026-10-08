/**
 * Phase 4 Demo Data Seed Script
 * Creates comprehensive test data for facility verification, professional verification,
 * and multi-facility scenarios
 * 
 * Includes:
 * - 3 facilities: verified, pending, suspended
 * - 7+ healthcare professionals with various verification states
 * - Cross-facility staff associations
 * - Complete credential chains
 * - Authorization scenarios for testing
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import Hospital from '../models/Hospital.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import ProfessionalCredential from '../models/ProfessionalCredential.js';
import HospitalStaff from '../models/HospitalStaff.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/jeevacare';

// Color logging for better visibility
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

const log = (message, color = 'reset') => {
  console.log(`${colors[color]}${message}${colors.reset}`);
};

async function seedData() {
  try {
    await mongoose.connect(MONGO_URI);
    log('Connected to MongoDB', 'blue');

    // Clear existing data
    log('Clearing existing data...', 'yellow');
    await Promise.all([
      User.deleteMany({}),
      Patient.deleteMany({}),
      Hospital.deleteMany({}),
      HealthcareProfessional.deleteMany({}),
      ProfessionalCredential.deleteMany({}),
      HospitalStaff.deleteMany({}),
    ]);

    // Create admin user
    log('\nCreating admin user...', 'yellow');
    const adminUser = new User({
      email: 'admin@jeevacare.demo',
      passwordHash: 'Demo@1234', // Will be hashed by pre-save hook
      name: 'System Administrator',
      phone: '+1-555-0000',
      role: 'SYSTEM_ADMIN',
      accountStatus: 'active',
    });
    await adminUser.save();
    log('✓ Admin user created', 'green');

    // ===== FACILITIES =====
    log('\n--- Creating Facilities ---', 'blue');

    // Facility 1: Verified
    log('Creating Verified Hospital...', 'yellow');
    const verifiedHospital = new Hospital({
      name: 'City Medical Center',
      type: 'hospital',
      registrationNumber: 'CMC-REG-2024-001',
      address: {
        street: '123 Healthcare Avenue',
        city: 'Metro City',
        state: 'MC',
        postalCode: '10001',
        country: 'TestLand',
      },
      contact: {
        phone: '+1-555-1001',
        email: 'contact@cityhospital.demo',
      },
      departments: [
        { name: 'Cardiology', head: 'Dr. Heart' },
        { name: 'Neurology', head: 'Dr. Brain' },
        { name: 'Emergency', head: 'Dr. Emergency' },
      ],
      verificationStatus: 'verified',
      status: 'active',
      verification: {
        verifiedAt: new Date(),
        verifiedBy: adminUser._id,
        verificationMethod: 'jeevacare_admin',
        verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await verifiedHospital.save();
    log(`✓ Verified Hospital: ${verifiedHospital.facilityId}`, 'green');

    // Facility 2: Pending
    log('Creating Pending Hospital...', 'yellow');
    const pendingHospital = new Hospital({
      name: 'Regional Health Center',
      type: 'hospital',
      registrationNumber: 'RHC-REG-2024-002',
      address: {
        street: '456 Healing Road',
        city: 'Regional Town',
        state: 'RT',
        postalCode: '20002',
        country: 'TestLand',
      },
      contact: {
        phone: '+1-555-2002',
        email: 'contact@regional-health.demo',
      },
      departments: [
        { name: 'General Medicine', head: 'Dr. General' },
        { name: 'Surgery', head: 'Dr. Surgeon' },
      ],
      verificationStatus: 'pending',
      status: 'active',
    });
    await pendingHospital.save();
    log(`✓ Pending Hospital: ${pendingHospital.facilityId}`, 'green');

    // Facility 3: Suspended
    log('Creating Suspended Hospital...', 'yellow');
    const suspendedHospital = new Hospital({
      name: 'Valley Medical Institute',
      type: 'hospital',
      registrationNumber: 'VMI-REG-2024-003',
      address: {
        street: '789 Valley Street',
        city: 'Valley City',
        state: 'VC',
        postalCode: '30003',
        country: 'TestLand',
      },
      contact: {
        phone: '+1-555-3003',
        email: 'contact@valley-medical.demo',
      },
      verificationStatus: 'verified',
      status: 'suspended',
      suspension: {
        suspendedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        suspendedBy: adminUser._id,
        suspensionReason: 'License renewal pending',
        suspensionExpiryDate: new Date(Date.now() + 23 * 24 * 60 * 60 * 1000), // 23 days remaining
      },
    });
    await suspendedHospital.save();
    log(`✓ Suspended Hospital: ${suspendedHospital.facilityId}`, 'green');

    // ===== PROFESSIONALS =====
    log('\n--- Creating Healthcare Professionals ---', 'blue');

    const professionals = [];

    // Professional 1: Verified with valid credentials
    log('Creating Verified Doctor with Credentials...', 'yellow');
    const user1 = new User({
      email: 'dr.sharma@jeevacare.demo',
      passwordHash: 'Prof@1234', // Will be hashed by pre-save hook
      name: 'Dr. Rajesh Sharma',
      phone: '+1-555-1100',
      role: 'HEALTHCARE_PROVIDER',
      accountStatus: 'active',
    });
    await user1.save();

    const prof1 = new HealthcareProfessional({
      userId: user1._id,
      firstName: 'Rajesh',
      lastName: 'Sharma',
      email: user1.email,
      phone: user1.phone,
      professionalType: 'doctor',
      specialization: ['cardiology', 'internal_medicine'],
      licenseNumber: 'MED-LIC-2020-001',
      yearsOfExperience: 15,
      biography: 'Experienced cardiologist with 15 years of practice',
      verificationStatus: 'verified',
      accountStatus: 'active',
      verification: {
        verifiedAt: new Date(),
        verifiedBy: adminUser._id,
        verificationMethod: 'jeevacare_admin',
        verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await prof1.save();

    // Add credentials to prof1
    const cred1a = new ProfessionalCredential({
      professionalId: prof1._id,
      credentialType: 'medical_license',
      credentialName: 'Medical License',
      credentialNumber: 'ML-2020-001',
      issuingAuthority: 'Medical Board',
      issueDate: new Date('2020-01-15'),
      expiryDate: new Date('2025-01-15'),
      status: 'verified',
      verification: {
        verifiedAt: new Date(),
        verifiedBy: adminUser._id,
        verificationMethod: 'government_verification',
      },
    });
    await cred1a.save();
    prof1.credentials.push(cred1a._id);

    const cred1b = new ProfessionalCredential({
      professionalId: prof1._id,
      credentialType: 'specialty_certification',
      credentialName: 'Cardiology Specialist',
      credentialNumber: 'CARD-2019-001',
      issuingAuthority: 'Cardiology Board',
      issueDate: new Date('2019-06-01'),
      expiryDate: new Date('2024-06-01'),
      status: 'verified',
      verification: {
        verifiedAt: new Date(),
        verifiedBy: adminUser._id,
        verificationMethod: 'manual',
      },
    });
    await cred1b.save();
    prof1.credentials.push(cred1b._id);
    await prof1.save();

    professionals.push(prof1);
    log(`✓ Verified Doctor: ${prof1.professionalId}`, 'green');

    // Professional 2: Pending verification
    log('Creating Pending Verification Professional...', 'yellow');
    const user2 = new User({
      email: 'dr.patel@jeevacare.demo',
      passwordHash: 'Prof@1234', // Will be hashed by pre-save hook
      name: 'Dr. Anita Patel',
      phone: '+1-555-1101',
      role: 'HEALTHCARE_PROVIDER',
      accountStatus: 'active',
    });
    await user2.save();

    const prof2 = new HealthcareProfessional({
      userId: user2._id,
      firstName: 'Anita',
      lastName: 'Patel',
      email: user2.email,
      phone: user2.phone,
      professionalType: 'doctor',
      specialization: ['neurology'],
      licenseNumber: 'MED-LIC-2021-002',
      yearsOfExperience: 8,
      verificationStatus: 'pending',
      accountStatus: 'active',
    });
    await prof2.save();
    professionals.push(prof2);
    log(`✓ Pending Professional: ${prof2.professionalId}`, 'green');

    // Professional 3: Suspended
    log('Creating Suspended Professional...', 'yellow');
    const user3 = new User({
      email: 'dr.suspended@jeevacare.demo',
      passwordHash: 'Prof@1234', // Will be hashed by pre-save hook
      name: 'Dr. Suspended User',
      phone: '+1-555-1102',
      role: 'HEALTHCARE_PROVIDER',
      accountStatus: 'suspended',
    });
    await user3.save();

    const prof3 = new HealthcareProfessional({
      userId: user3._id,
      firstName: 'Suspended',
      lastName: 'User',
      email: user3.email,
      phone: user3.phone,
      professionalType: 'doctor',
      verificationStatus: 'verified',
      accountStatus: 'suspended',
      suspension: {
        suspendedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        suspendedBy: adminUser._id,
        suspensionReason: 'License expired - renewal pending',
      },
    });
    await prof3.save();
    professionals.push(prof3);
    log(`✓ Suspended Professional: ${prof3.professionalId}`, 'green');

    // Professional 4: Nurse
    log('Creating Verified Nurse...', 'yellow');
    const user4 = new User({
      email: 'nurse.kumar@jeevacare.demo',
      passwordHash: 'Prof@1234', // Will be hashed by pre-save hook
      name: 'Nurse Amar Kumar',
      phone: '+1-555-1103',
      role: 'HEALTHCARE_PROVIDER',
      accountStatus: 'active',
    });
    await user4.save();

    const prof4 = new HealthcareProfessional({
      userId: user4._id,
      firstName: 'Amar',
      lastName: 'Kumar',
      email: user4.email,
      phone: user4.phone,
      professionalType: 'nurse',
      specialization: ['critical_care', 'emergency'],
      yearsOfExperience: 5,
      verificationStatus: 'verified',
      accountStatus: 'active',
      verification: {
        verifiedAt: new Date(),
        verifiedBy: adminUser._id,
        verificationMethod: 'jeevacare_admin',
        verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await prof4.save();
    professionals.push(prof4);
    log(`✓ Verified Nurse: ${prof4.professionalId}`, 'green');

    // Professional 5: Lab Technician
    log('Creating Lab Technician...', 'yellow');
    const user5 = new User({
      email: 'labtech.singh@jeevacare.demo',
      passwordHash: 'Prof@1234', // Will be hashed by pre-save hook
      name: 'Lab Technician Priya Singh',
      phone: '+1-555-1104',
      role: 'HEALTHCARE_PROVIDER',
      accountStatus: 'active',
    });
    await user5.save();

    const prof5 = new HealthcareProfessional({
      userId: user5._id,
      firstName: 'Priya',
      lastName: 'Singh',
      email: user5.email,
      phone: user5.phone,
      professionalType: 'lab_technician',
      yearsOfExperience: 3,
      verificationStatus: 'verified',
      accountStatus: 'active',
      verification: {
        verifiedAt: new Date(),
        verifiedBy: adminUser._id,
        verificationMethod: 'jeevacare_admin',
        verificationExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    await prof5.save();
    professionals.push(prof5);
    log(`✓ Lab Technician: ${prof5.professionalId}`, 'green');

    // ===== STAFF ASSOCIATIONS =====
    log('\n--- Creating Staff Associations ---', 'blue');

    // Dr. Sharma at Verified Hospital (Admin + Doctor)
    log('Associating Dr. Sharma with verified hospital (Admin)...', 'yellow');
    const staff1 = new HospitalStaff({
      userId: user1._id,
      professionalId: prof1._id,
      hospitalId: verifiedHospital._id,
      role: 'hospital_admin',
      department: { name: 'Cardiology' },
      employmentStatus: 'active',
      startDate: new Date('2022-01-15'),
      permissions: {
        viewPatientRecords: true,
        createClinicalRecords: true,
        createDiagnosis: true,
        createPrescription: true,
        manageStaff: true,
        manageFacility: true,
        accessEmergencyProfiles: true,
      },
      associationStatus: 'active',
      approvalInformation: {
        approvedAt: new Date(),
        approvedBy: adminUser._id,
        approvalMethod: 'jeevacare_admin',
      },
      professionalVerificationStatus: 'verified',
    });
    await staff1.save();
    prof1.facilityAssociations.push(staff1._id);
    await prof1.save();
    log(`✓ Dr. Sharma as Admin at Verified Hospital`, 'green');

    // Dr. Patel at Pending Hospital (Doctor - Pending Approval)
    log('Associating Dr. Patel with pending hospital...', 'yellow');
    const staff2 = new HospitalStaff({
      userId: user2._id,
      professionalId: prof2._id,
      hospitalId: pendingHospital._id,
      role: 'doctor',
      department: { name: 'Neurology' },
      employmentStatus: 'active',
      startDate: new Date('2024-01-01'),
      permissions: {
        viewPatientRecords: true,
        createClinicalRecords: false, // Pending
      },
      associationStatus: 'pending',
      professionalVerificationStatus: 'pending',
    });
    await staff2.save();
    prof2.facilityAssociations.push(staff2._id);
    await prof2.save();
    log(`✓ Dr. Patel pending at Pending Hospital`, 'green');

    // Nurse at Verified Hospital (Active)
    log('Associating Nurse at verified hospital...', 'yellow');
    const staff3 = new HospitalStaff({
      userId: user4._id,
      professionalId: prof4._id,
      hospitalId: verifiedHospital._id,
      role: 'nurse',
      department: { name: 'Emergency' },
      employmentStatus: 'active',
      startDate: new Date('2023-06-01'),
      permissions: {
        viewPatientRecords: true,
        createClinicalRecords: false,
        createPrescription: false,
      },
      associationStatus: 'active',
      approvalInformation: {
        approvedAt: new Date(),
        approvedBy: adminUser._id,
        approvalMethod: 'jeevacare_admin',
      },
      professionalVerificationStatus: 'verified',
    });
    await staff3.save();
    prof4.facilityAssociations.push(staff3._id);
    await prof4.save();
    log(`✓ Nurse at Verified Hospital`, 'green');

    // Lab Technician at Verified Hospital
    log('Associating Lab Technician...', 'yellow');
    const staff4 = new HospitalStaff({
      userId: user5._id,
      professionalId: prof5._id,
      hospitalId: verifiedHospital._id,
      role: 'lab_technician',
      department: { name: 'Laboratory' },
      employmentStatus: 'active',
      startDate: new Date('2023-03-15'),
      permissions: {
        viewPatientRecords: true,
        createClinicalRecords: false,
        createLaboratoryResults: true,
      },
      associationStatus: 'active',
      approvalInformation: {
        approvedAt: new Date(),
        approvedBy: adminUser._id,
        approvalMethod: 'jeevacare_admin',
      },
      professionalVerificationStatus: 'verified',
    });
    await staff4.save();
    prof5.facilityAssociations.push(staff4._id);
    await prof5.save();
    log(`✓ Lab Technician at Verified Hospital`, 'green');

    // Dr. Sharma at Pending Hospital (Multi-facility)
    log('Associating Dr. Sharma with pending hospital (multi-facility)...', 'yellow');
    const staff5 = new HospitalStaff({
      userId: user1._id,
      professionalId: prof1._id,
      hospitalId: pendingHospital._id,
      role: 'doctor',
      department: { name: 'Cardiology' },
      employmentStatus: 'active',
      startDate: new Date('2023-09-01'),
      permissions: {
        viewPatientRecords: true,
        createClinicalRecords: true,
        createDiagnosis: true,
      },
      associationStatus: 'active',
      approvalInformation: {
        approvedAt: new Date(),
        approvedBy: adminUser._id,
        approvalMethod: 'jeevacare_admin',
      },
      professionalVerificationStatus: 'verified',
    });
    await staff5.save();
    prof1.facilityAssociations.push(staff5._id);
    await prof1.save();
    log(`✓ Dr. Sharma multi-facility at Pending Hospital`, 'green');

    // ===== PATIENTS =====
    log('\n--- Creating Patients ---', 'blue');

    const patient1 = new Patient({
      userId: user1._id,
      personalIdentity: {
        firstName: 'Patient',
        lastName: 'One',
        dateOfBirth: new Date('1985-05-15'),
        sex: 'M',
        phone: '+1-555-5000',
        email: 'patient1@demo.com',
      },
      status: 'active',
      facilities: [{ facilityId: verifiedHospital._id }],
    });
    await patient1.save();
    log(`✓ Patient 1 registered at Verified Hospital`, 'green');

    // ===== SUMMARY =====
    log('\n=== PHASE 4 DEMO DATA CREATION COMPLETE ===', 'green');
    log('\nFacilities Created:', 'blue');
    log(`  ✓ Verified: ${verifiedHospital.name} (${verifiedHospital.facilityId})`, 'green');
    log(`  ✓ Pending: ${pendingHospital.name} (${pendingHospital.facilityId})`, 'yellow');
    log(`  ✓ Suspended: ${suspendedHospital.name} (${suspendedHospital.facilityId})`, 'red');

    log('\nProfessionals Created:', 'blue');
    log(`  ✓ Dr. Rajesh Sharma - Verified with Credentials (${prof1.professionalId})`, 'green');
    log(`  ✓ Dr. Anita Patel - Pending Verification (${prof2.professionalId})`, 'yellow');
    log(`  ✓ Dr. Suspended - Account Suspended (${prof3.professionalId})`, 'red');
    log(`  ✓ Nurse Amar Kumar - Verified (${prof4.professionalId})`, 'green');
    log(`  ✓ Lab Tech Priya Singh - Verified (${prof5.professionalId})`, 'green');

    log('\nStaff Associations Created:', 'blue');
    log('  ✓ Dr. Sharma as Hospital Admin at Verified Hospital', 'green');
    log('  ✓ Dr. Patel as Doctor (Pending) at Pending Hospital', 'yellow');
    log('  ✓ Nurse at Verified Hospital', 'green');
    log('  ✓ Lab Technician at Verified Hospital', 'green');
    log('  ✓ Dr. Sharma as Doctor at Pending Hospital (Multi-facility)', 'green');

    log('\nTest Accounts:', 'blue');
    log('  Admin: admin@jeevacare.demo / Demo@1234', 'green');
    log('  Dr. Sharma: dr.sharma@jeevacare.demo / Prof@1234', 'green');
    log('  Dr. Patel: dr.patel@jeevacare.demo / Prof@1234', 'green');
    log('  Nurse: nurse.kumar@jeevacare.demo / Prof@1234', 'green');
    log('  Lab Tech: labtech.singh@jeevacare.demo / Prof@1234', 'green');

    log('\nAuthorization Test Scenarios:', 'blue');
    log('  ✓ Dr. Sharma: Can create clinical records (verified, active facility, valid credentials)', 'green');
    log('  ✓ Dr. Patel: Cannot create records yet (pending verification)', 'yellow');
    log('  ✓ Suspended: Cannot perform clinical operations (account suspended)', 'red');
    log('  ✓ Nurse: Has limited permissions (view only, no clinical record creation)', 'green');
    log('  ✓ Multi-facility: Dr. Sharma has different permissions at each facility', 'green');

    await mongoose.connection.close();
    log('\n✓ Database connection closed', 'blue');
    process.exit(0);
  } catch (error) {
    log(`\n✗ Error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run seed
seedData();

