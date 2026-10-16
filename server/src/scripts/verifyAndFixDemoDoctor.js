/**
 * Verification and Fix Script for Demo Doctor HospitalStaff Association
 * 
 * This script:
 * 1. Verifies demo doctor exists
 * 2. Checks for active HospitalStaff association
 * 3. If missing, creates the association
 * 4. Validates the fix
 * 
 * Run with: node server/src/scripts/verifyAndFixDemoDoctor.js
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import HospitalStaff from '../models/HospitalStaff.js';
import Hospital from '../models/Hospital.js';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Demo doctor email (update if different)
const DEMO_DOCTOR_EMAIL = 'doctor@demo.com';

async function verifyAndFix() {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    logger.info('✓ Connected to MongoDB');

    // STEP 1: Find demo doctor
    logger.info(`\n--- STEP 1: Finding demo doctor (${DEMO_DOCTOR_EMAIL}) ---`);
    const doctor = await User.findOne({ email: DEMO_DOCTOR_EMAIL });
    
    if (!doctor) {
      logger.error(`✗ Demo doctor not found with email: ${DEMO_DOCTOR_EMAIL}`);
      logger.info('Please verify the demo doctor email and try again.');
      process.exit(1);
    }
    
    logger.info(`✓ Found doctor:`);
    logger.info(`  - User ID: ${doctor._id}`);
    logger.info(`  - Email: ${doctor.email}`);
    logger.info(`  - Role: ${doctor.role}`);
    logger.info(`  - Name: ${doctor.profile?.firstName} ${doctor.profile?.lastName}`);

    // STEP 2: Check for existing HospitalStaff association
    logger.info(`\n--- STEP 2: Checking HospitalStaff association ---`);
    const existingStaff = await HospitalStaff.findOne({
      userId: doctor._id,
      associationStatus: 'active',
      employmentStatus: 'active',
    });

    if (existingStaff) {
      logger.info('✓ Active HospitalStaff association found:');
      logger.info(`  - Staff ID: ${existingStaff._id}`);
      logger.info(`  - Hospital ID: ${existingStaff.hospitalId}`);
      logger.info(`  - Department: ${existingStaff.department || 'Not specified'}`);
      logger.info(`  - Specialization: ${existingStaff.specialization || 'Not specified'}`);
      logger.info(`  - Start Date: ${existingStaff.startDate}`);
      logger.info(`  - Permissions: ${existingStaff.permissions?.join(', ') || 'None'}`);
      
      // Verify hospital exists
      const hospital = await Hospital.findById(existingStaff.hospitalId);
      if (hospital) {
        logger.info(`  - Hospital Name: ${hospital.name}`);
        logger.info(`  - Hospital Status: ${hospital.verificationStatus}`);
      } else {
        logger.warn(`  ⚠ WARNING: Hospital not found for ID: ${existingStaff.hospitalId}`);
      }
      
      logger.info('\n✓ No action needed - association already exists and is active');
      process.exit(0);
    }

    logger.info('✗ No active HospitalStaff association found');

    // STEP 3: Find a demo/test hospital
    logger.info(`\n--- STEP 3: Finding demo hospital ---`);
    
    // Try to find demo hospital by name
    let hospital = await Hospital.findOne({
      name: { $regex: /demo|test/i },
      verificationStatus: 'verified'
    });

    // If no demo hospital, get the first verified hospital
    if (!hospital) {
      logger.info('No demo hospital found, looking for any verified hospital...');
      hospital = await Hospital.findOne({ verificationStatus: 'verified' });
    }

    if (!hospital) {
      logger.error('✗ No verified hospital found in database');
      logger.info('Please create a verified hospital first:');
      logger.info('  1. Create a hospital via admin panel or seeding script');
      logger.info('  2. Set verificationStatus to "verified"');
      logger.info('  3. Run this script again');
      process.exit(1);
    }

    logger.info(`✓ Found hospital:`);
    logger.info(`  - Hospital ID: ${hospital._id}`);
    logger.info(`  - Name: ${hospital.name}`);
    logger.info(`  - Facility ID: ${hospital.facilityId || 'Not set'}`);
    logger.info(`  - Verification Status: ${hospital.verificationStatus}`);

    // STEP 4: Create HospitalStaff association
    logger.info(`\n--- STEP 4: Creating HospitalStaff association ---`);
    
    const staffData = {
      userId: doctor._id,
      hospitalId: hospital._id,
      associationStatus: 'active',
      employmentStatus: 'active',
      startDate: new Date(),
      role: 'DOCTOR',
      department: 'General Medicine',
      specialization: 'General Practitioner',
      permissions: [
        'VIEW_PATIENTS',
        'MANAGE_APPOINTMENTS',
        'VIEW_CLINICAL_RECORDS',
        'CREATE_CLINICAL_RECORDS',
        'UPDATE_CLINICAL_RECORDS',
        'VIEW_DOCUMENTS',
        'UPLOAD_DOCUMENTS',
        'VIEW_LAB_RESULTS',
        'ORDER_TESTS',
      ],
    };

    const newStaff = new HospitalStaff(staffData);
    await newStaff.save();

    logger.info('✓ HospitalStaff association created successfully:');
    logger.info(`  - Staff ID: ${newStaff._id}`);
    logger.info(`  - User ID: ${newStaff.userId}`);
    logger.info(`  - Hospital ID: ${newStaff.hospitalId}`);
    logger.info(`  - Department: ${newStaff.department}`);
    logger.info(`  - Specialization: ${newStaff.specialization}`);
    logger.info(`  - Status: ${newStaff.associationStatus} / ${newStaff.employmentStatus}`);
    logger.info(`  - Permissions: ${newStaff.permissions.join(', ')}`);

    // STEP 5: Verify the fix
    logger.info(`\n--- STEP 5: Verifying fix ---`);
    
    const verifyStaff = await HospitalStaff.findOne({
      userId: doctor._id,
      associationStatus: 'active',
      employmentStatus: 'active',
    }).populate('hospitalId', 'name facilityId verificationStatus');

    if (verifyStaff && verifyStaff.hospitalId) {
      logger.info('✓ Verification successful!');
      logger.info(`  - Doctor ${doctor.email} is now associated with ${verifyStaff.hospitalId.name}`);
      logger.info(`  - Authentication middleware will resolve facilityId automatically`);
      logger.info(`  - Doctor dashboard features should now work`);
      
      logger.info('\n✓ ALL STEPS COMPLETED SUCCESSFULLY');
      logger.info('\nNext steps:');
      logger.info('1. Test doctor login');
      logger.info('2. Navigate to /hospital/appointments');
      logger.info('3. Navigate to /hospital/schedule');
      logger.info('4. Navigate to /hospital/patients');
      logger.info('5. Try document upload');
    } else {
      logger.error('✗ Verification failed - could not find newly created association');
      process.exit(1);
    }

  } catch (error) {
    logger.error('Error during verification/fix:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    logger.info('\n✓ Database connection closed');
  }
}

// Run the script
verifyAndFix();
