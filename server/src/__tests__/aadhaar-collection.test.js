/**
 * Aadhaar Collection Tests
 * Tests Aadhaar number collection during registration for all roles
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { generateJeevaId } from '../utils/jeevaIdGenerator.js';

// Test configuration
const TEST_MONGODB_URI = process.env.TEST_MONGODB_URI;

describe('Aadhaar Collection Tests', () => {
  // Skip tests if no test database configured
  if (!TEST_MONGODB_URI) {
    console.warn('⚠️  Skipping Aadhaar tests - TEST_MONGODB_URI not configured');
    return;
  }

  beforeAll(async () => {
    await mongoose.connect(TEST_MONGODB_URI);
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  beforeEach(async () => {
    // Clean up test data
    await User.deleteMany({ email: /test-aadhaar/ });
    await Patient.deleteMany({});
  });

  describe('User Model Aadhaar Field', () => {
    it('should allow valid 12-digit Aadhaar number', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-valid@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '123456789012',
        },
      });

      await user.save();
      expect(user.profile.aadhaarNumber).toBe('123456789012');
    });

    it('should reject Aadhaar with less than 12 digits', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-short@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '12345678901', // 11 digits
        },
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should reject Aadhaar with more than 12 digits', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-long@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '1234567890123', // 13 digits
        },
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should reject Aadhaar with non-numeric characters', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-alpha@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '12345678901A',
        },
      });

      await expect(user.save()).rejects.toThrow();
    });

    it('should allow missing Aadhaar number', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-missing@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
        },
      });

      await user.save();
      expect(user.profile.aadhaarNumber).toBeUndefined();
    });

    it('should not return Aadhaar by default (select: false)', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-select@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '123456789012',
        },
      });

      await user.save();
      
      // Query without explicit select
      const queriedUser = await User.findOne({ email: 'test-aadhaar-select@example.com' });
      expect(queriedUser.profile.aadhaarNumber).toBeUndefined();
    });

    it('should return Aadhaar when explicitly selected', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-explicit@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '123456789012',
        },
      });

      await user.save();
      
      // Query with explicit select
      const queriedUser = await User.findOne({ email: 'test-aadhaar-explicit@example.com' })
        .select('+profile.aadhaarNumber');
      expect(queriedUser.profile.aadhaarNumber).toBe('123456789012');
    });

    it('should mask Aadhaar in toJSON output', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-json@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '123456789012',
        },
      });

      await user.save();
      
      // Get user with Aadhaar
      const queriedUser = await User.findOne({ email: 'test-aadhaar-json@example.com' })
        .select('+profile.aadhaarNumber');
      
      const jsonOutput = queriedUser.toJSON();
      expect(jsonOutput.profile.aadhaarNumber).toBe('XXXX XXXX 9012');
      expect(jsonOutput.profile.aadhaarNumber).not.toBe('123456789012');
    });
  });

  describe('Aadhaar Collection for All Roles', () => {
    const testRoles = [
      'PATIENT',
      'GUARDIAN',
      'DOCTOR',
      'NURSE',
      'LAB_TECHNICIAN',
      'RADIOLOGY_TECHNICIAN',
      'PHARMACIST',
      'PARAMEDIC',
      'RECEPTION_STAFF',
      'OTHER_STAFF',
    ];

    testRoles.forEach((role) => {
      it(`should allow Aadhaar collection for ${role}`, async () => {
        const jeevaId = await generateJeevaId();
        const user = new User({
          email: `test-aadhaar-${role.toLowerCase()}@example.com`,
          passwordHash: 'hashedpassword123',
          role,
          jeevaId,
          verificationStatus: ['PATIENT', 'GUARDIAN'].includes(role) ? 'verified' : 'pending',
          profile: {
            firstName: 'Test',
            lastName: role,
            aadhaarNumber: '999888777666',
          },
        });

        await user.save();
        
        const queriedUser = await User.findOne({ 
          email: `test-aadhaar-${role.toLowerCase()}@example.com` 
        }).select('+profile.aadhaarNumber');
        
        expect(queriedUser.profile.aadhaarNumber).toBe('999888777666');
        expect(queriedUser.role).toBe(role);
      });
    });
  });

  describe('Aadhaar Security and Privacy', () => {
    it('should not include Aadhaar in default User queries', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-security@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          phone: '+919876543210',
          aadhaarNumber: '111222333444',
        },
      });

      await user.save();
      
      // Default query should not include Aadhaar
      const queriedUser = await User.findById(user._id);
      expect(queriedUser.profile.phone).toBe('+919876543210');
      expect(queriedUser.profile.aadhaarNumber).toBeUndefined();
    });

    it('should allow updating profile without overwriting Aadhaar', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-update@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          phone: '+919876543210',
          aadhaarNumber: '555666777888',
        },
      });

      await user.save();
      
      // Update phone without touching Aadhaar
      user.profile.phone = '+919999999999';
      await user.save();
      
      // Verify Aadhaar still exists
      const updatedUser = await User.findById(user._id).select('+profile.aadhaarNumber');
      expect(updatedUser.profile.phone).toBe('+919999999999');
      expect(updatedUser.profile.aadhaarNumber).toBe('555666777888');
    });

    it('should handle empty string as missing Aadhaar', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-empty@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'Test',
          lastName: 'User',
          aadhaarNumber: '',
        },
      });

      await user.save();
      
      const queriedUser = await User.findById(user._id).select('+profile.aadhaarNumber');
      // Empty string should be stored as-is or undefined based on schema behavior
      expect(queriedUser.profile.aadhaarNumber).toBeFalsy();
    });

    it('should not expose Aadhaar through patient search', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'test-aadhaar-search@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId,
        profile: {
          firstName: 'SearchTest',
          lastName: 'User',
          aadhaarNumber: '777888999000',
        },
      });

      await user.save();
      
      // Search by name (common search pattern)
      const searchResults = await User.find({ 
        'profile.firstName': /SearchTest/i 
      });
      
      expect(searchResults.length).toBeGreaterThan(0);
      searchResults.forEach(result => {
        expect(result.profile.aadhaarNumber).toBeUndefined();
      });
    });
  });

  describe('Duplicate Aadhaar Handling', () => {
    it('should allow duplicate Aadhaar numbers (sparse index)', async () => {
      const jeevaId1 = await generateJeevaId();
      const user1 = new User({
        email: 'test-aadhaar-dup1@example.com',
        passwordHash: 'hashedpassword123',
        role: 'PATIENT',
        jeevaId: jeevaId1,
        profile: {
          firstName: 'User',
          lastName: 'One',
          aadhaarNumber: '123123123123',
        },
      });

      await user1.save();
      
      const jeevaId2 = await generateJeevaId();
      const user2 = new User({
        email: 'test-aadhaar-dup2@example.com',
        passwordHash: 'hashedpassword123',
        role: 'GUARDIAN',
        jeevaId: jeevaId2,
        profile: {
          firstName: 'User',
          lastName: 'Two',
          aadhaarNumber: '123123123123', // Same Aadhaar
        },
      });

      // Should not throw due to sparse index
      await expect(user2.save()).resolves.toBeDefined();
    });
  });
});
