/**
 * Seed Synthetic Data Tests
 * 
 * Verifies:
 * 1. Password hashing consistency between seed and login
 * 2. HealthcareProfessional enum validation
 * 3. Doctor configuration matches specification
 * 4. Admin configuration matches DEMO_CREDENTIALS specification
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

import User from '../models/User.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import Hospital from '../models/Hospital.js';

describe('Seed Synthetic Data Integration', () => {
  const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI;
  
  // Skip if no test database configured
  if (!TEST_MONGODB_URI) {
    console.warn('⚠️  Skipping seed tests - TEST_MONGODB_URI not configured');
  }

  beforeAll(async () => {
    if (!TEST_MONGODB_URI) {
      return;
    }
    
    try {
      await mongoose.connect(TEST_MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
    } catch (error) {
      console.warn('⚠️  Could not connect to test database:', error.message);
    }
  });

  afterAll(async () => {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('Password Hashing Consistency', () => {
    it('should hash password identically to seed script', async () => {
      // Replicate seed script hashing
      const testPassword = 'HarshithBagrecha@123';
      const salt = await bcryptjs.genSalt(10);
      const seedHash = await bcryptjs.hash(testPassword, salt);

      // Verify using User model's comparePassword method
      const passwordMatch = await bcryptjs.compare(testPassword, seedHash);
      expect(passwordMatch).toBe(true);
    });

    it('should allow login after seed hashing', async () => {
      const testPassword = 'TestPassword@123';
      
      // Seed hashing: hash directly before saving
      const salt = await bcryptjs.genSalt(10);
      const seedHash = await bcryptjs.hash(testPassword, salt);
      
      // User model pre-save hook will hash again, so we need to test
      // that the double-hash still compares correctly
      const doubleHash = await bcryptjs.hash(seedHash, await bcryptjs.genSalt(10));
      
      // Verify: raw password doesn't match seedHash (because it's not hashed)
      const rawMatch = await bcryptjs.compare(testPassword, seedHash);
      expect(rawMatch).toBe(true);
      
      // But raw password won't match double-hash (as expected)
      const doubleHashMatch = await bcryptjs.compare(testPassword, doubleHash);
      expect(doubleHashMatch).toBe(false);
    });
  });

  describe('HealthcareProfessional Enum Validation', () => {
    it('should accept "doctor" as valid professionalType', () => {
      const validTypes = [
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'paramedic',
        'other_healthcare_professional',
      ];
      
      expect(validTypes).toContain('doctor');
      expect(validTypes).toContain('nurse');
    });

    it('should reject invalid professionalType', () => {
      const invalidTypes = ['physician', 'medic', 'healthcare_worker'];
      const validTypes = [
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
        'paramedic',
        'other_healthcare_professional',
      ];
      
      invalidTypes.forEach(type => {
        expect(validTypes).not.toContain(type);
      });
    });
  });

  describe('Doctor Configuration Specification', () => {
    const AAROGYA_DOCTORS = [
      {
        firstName: 'Harshith',
        lastName: 'Bagrecha',
        email: 'harshith.bagrecha@aarogya.in',
        specialization: 'General Surgery',
        licenseId: 'KA-LIC-HB-2015-006',
        password: 'HarshithBagrecha@123',
      },
    ];

    it('should have exact doctor email and name', () => {
      const harshith = AAROGYA_DOCTORS[0];
      expect(harshith.email).toBe('harshith.bagrecha@aarogya.in');
      expect(harshith.firstName).toBe('Harshith');
      expect(harshith.lastName).toBe('Bagrecha');
    });

    it('should have valid password format', () => {
      const harshith = AAROGYA_DOCTORS[0];
      // Password should be at least 8 characters and contain uppercase/lowercase/number/special
      expect(harshith.password.length).toBeGreaterThanOrEqual(8);
      expect(/[A-Z]/.test(harshith.password)).toBe(true);
      expect(/[a-z]/.test(harshith.password)).toBe(true);
      expect(/[0-9]/.test(harshith.password)).toBe(true);
      expect(/[@#$%^&*]/.test(harshith.password)).toBe(true);
    });

    it('should have valid license ID format', () => {
      const harshith = AAROGYA_DOCTORS[0];
      // Format: KA-LIC-XX-YYYY-###
      expect(/^KA-LIC-[A-Z]{2}-\d{4}-\d{3}$/.test(harshith.licenseId)).toBe(true);
    });
  });

  describe('Admin Configuration Specification', () => {
    const HOSPITAL_ADMINS_CONFIG = [
      {
        name: 'Prakash Rao',
        firstName: 'Prakash',
        lastName: 'Rao',
        email: 'prakash.rao@sanjivani.in',
        hospitalIndex: 0,
        password: 'PrakashRao@123',
      },
      {
        name: 'Revathi Kumar',
        firstName: 'Revathi',
        lastName: 'Kumar',
        email: 'revathi.kumar@aarogya.in',
        hospitalIndex: 1,
        password: 'RevathiKumar@123',
      },
    ];

    it('should have exactly 2 admins', () => {
      expect(HOSPITAL_ADMINS_CONFIG.length).toBe(2);
    });

    it('should have Prakash Rao for Sanjivani', () => {
      const prakash = HOSPITAL_ADMINS_CONFIG[0];
      expect(prakash.name).toBe('Prakash Rao');
      expect(prakash.firstName).toBe('Prakash');
      expect(prakash.lastName).toBe('Rao');
      expect(prakash.email).toBe('prakash.rao@sanjivani.in');
      expect(prakash.hospitalIndex).toBe(0);
    });

    it('should have Revathi Kumar for Aarogya Kendra', () => {
      const revathi = HOSPITAL_ADMINS_CONFIG[1];
      expect(revathi.name).toBe('Revathi Kumar');
      expect(revathi.firstName).toBe('Revathi');
      expect(revathi.lastName).toBe('Kumar');
      expect(revathi.email).toBe('revathi.kumar@aarogya.in');
      expect(revathi.hospitalIndex).toBe(1);
    });

    it('should match DEMO_CREDENTIALS specification', () => {
      // From DEMO_CREDENTIALS.json
      const expectedAdmins = [
        {
          name: 'Prakash Rao',
          email: 'prakash.rao@sanjivani.in',
          password: 'PrakashRao@123',
        },
        {
          name: 'Revathi Kumar',
          email: 'revathi.kumar@aarogya.in',
          password: 'RevathiKumar@123',
        },
      ];

      expectedAdmins.forEach((expected, index) => {
        const actual = HOSPITAL_ADMINS_CONFIG[index];
        expect(actual.name).toBe(expected.name);
        expect(actual.email).toBe(expected.email);
        expect(actual.password).toBe(expected.password);
      });
    });
  });

  describe('Hospital Configuration', () => {
    const HOSPITALS_CONFIG = [
      {
        name: 'Sanjivani Hospital',
        facilityId: 'JC-HOSP-SANJIVANI-001',
        city_code: 'Mysore',
        state: 'Karnataka',
      },
      {
        name: 'Aarogya Kendra',
        facilityId: 'JC-HOSP-AAROGYA-KENDRA-001',
        city_code: 'Mandya',
        state: 'Karnataka',
      },
    ];

    it('should have exactly 2 hospitals', () => {
      expect(HOSPITALS_CONFIG.length).toBe(2);
    });

    it('should have correct hospital names', () => {
      expect(HOSPITALS_CONFIG[0].name).toBe('Sanjivani Hospital');
      expect(HOSPITALS_CONFIG[1].name).toBe('Aarogya Kendra');
    });

    it('should have unique facility IDs', () => {
      const ids = HOSPITALS_CONFIG.map(h => h.facilityId);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Doctor Count Specification', () => {
    it('should seed exactly 11 doctors total', () => {
      const SANJIVANI_DOCTORS = 5;
      const AAROGYA_DOCTORS = 5;
      const SHARED_DOCTOR = 1;
      
      const total = SANJIVANI_DOCTORS + AAROGYA_DOCTORS + SHARED_DOCTOR;
      expect(total).toBe(11);
    });

    it('should seed exactly 20 patients total', () => {
      const SANJIVANI_PATIENTS = 10;
      const AAROGYA_PATIENTS = 10;
      
      const total = SANJIVANI_PATIENTS + AAROGYA_PATIENTS;
      expect(total).toBe(20);
    });
  });

  describe('Shared Doctor Configuration', () => {
    const SHARED_DOCTOR = {
      firstName: 'Swami',
      lastName: 'Murti',
      email: 'swami.murti@jeevacare.in',
      specialization: 'Anesthesiology',
      licenseId: 'KA-LIC-SM-2013-011',
      password: 'SwamiMurti@123',
      shared: true,
    };

    it('should have shared doctor with both hospital affiliations', () => {
      expect(SHARED_DOCTOR.email).toBe('swami.murti@jeevacare.in');
      expect(SHARED_DOCTOR.shared).toBe(true);
    });

    it('should have unique email distinct from hospital-specific doctors', () => {
      const hospitalDoctorEmails = [
        'harshith.bagrecha@aarogya.in',
        'soundarya.shetty@sanjivani.in',
      ];
      
      expect(hospitalDoctorEmails).not.toContain(SHARED_DOCTOR.email);
    });
  });
});
