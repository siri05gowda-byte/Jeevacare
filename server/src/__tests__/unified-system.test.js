/**
 * Unified JeevaCare System Tests
 * Tests for JeevaId, expanded registration, notifications, and staff management
 */

import mongoose from 'mongoose';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import HospitalStaff from '../models/Hospital.js';
import { generateJeevaId, validateJeevaIdFormat } from '../utils/jeevaIdGenerator.js';

describe('Unified JeevaCare System', () => {
  beforeAll(async () => {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/jeevacare-test');
    }
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  describe('JeevaId Generation', () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    it('should generate valid JeevaId format', async () => {
      const jeevaId = await generateJeevaId();
      
      expect(jeevaId).toBeDefined();
      expect(typeof jeevaId).toBe('string');
      expect(validateJeevaIdFormat(jeevaId)).toBe(true);
      
      // Format: JJYY-XXXXX
      expect(jeevaId).toMatch(/^JJ\d{2}-[0-9A-Z]{5}$/);
    });

    it('should generate unique JeevaIds', async () => {
      const ids = new Set();
      const iterations = 10;

      for (let i = 0; i < iterations; i++) {
        const jeevaId = await generateJeevaId();
        ids.add(jeevaId);
      }

      expect(ids.size).toBe(iterations);
    });

    it('should include current year in JeevaId', async () => {
      const jeevaId = await generateJeevaId();
      const currentYear = new Date().getFullYear().toString().slice(-2);
      
      expect(jeevaId.substring(2, 4)).toBe(currentYear);
    });

    it('should not include confusing characters', async () => {
      const jeevaId = await generateJeevaId();
      const randomPart = jeevaId.split('-')[1];
      
      // Should not contain I, L, O, U
      expect(randomPart).not.toMatch(/[ILOU]/);
    });
  });

  describe('Expanded Registration', () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    it('should allow PATIENT registration with auto-verify', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'patient@test.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
        jeevaId,
        verificationStatus: 'verified',
        profile: {
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      await user.save();
      
      expect(user.role).toBe('PATIENT');
      expect(user.verificationStatus).toBe('verified');
      expect(user.jeevaId).toBe(jeevaId);
    });

    it('should allow DOCTOR registration with pending verification', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'doctor@test.com',
        passwordHash: 'hashedPassword',
        role: 'DOCTOR',
        jeevaId,
        verificationStatus: 'pending',
        profile: {
          firstName: 'Dr',
          lastName: 'Smith',
        },
      });

      await user.save();
      
      expect(user.role).toBe('DOCTOR');
      expect(user.verificationStatus).toBe('pending');
    });

    it('should allow all staff roles to register', async () => {
      const staffRoles = [
        'NURSE',
        'LAB_TECHNICIAN',
        'RADIOLOGY_TECHNICIAN',
        'PHARMACIST',
        'PARAMEDIC',
        'RECEPTION_STAFF',
      ];

      for (const role of staffRoles) {
        const jeevaId = await generateJeevaId();
        const user = new User({
          email: `${role.toLowerCase()}@test.com`,
          passwordHash: 'hashedPassword',
          role,
          jeevaId,
          verificationStatus: 'pending',
          profile: {
            firstName: 'Test',
            lastName: role,
          },
        });

        await user.save();
        expect(user.role).toBe(role);
        expect(user.jeevaId).toBeDefined();
      }
    });

    it('should enforce unique JeevaIds', async () => {
      const jeevaId = await generateJeevaId();
      
      const user1 = new User({
        email: 'user1@test.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
        jeevaId,
        profile: { firstName: 'User', lastName: 'One' },
      });
      await user1.save();

      const user2 = new User({
        email: 'user2@test.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
        jeevaId, // Same ID
        profile: { firstName: 'User', lastName: 'Two' },
      });

      await expect(user2.save()).rejects.toThrow();
    });
  });

  describe('Notification System', () => {
    let testUser;

    beforeEach(async () => {
      await User.deleteMany({});
      await Notification.deleteMany({});

      testUser = new User({
        email: 'notif-test@test.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
        jeevaId: await generateJeevaId(),
        profile: { firstName: 'Test', lastName: 'User' },
      });
      await testUser.save();
    });

    it('should create notification', async () => {
      const notification = await Notification.createNotification({
        userId: testUser._id,
        type: 'staff_invitation',
        title: 'Test Notification',
        message: 'This is a test message',
        link: '/test',
      });

      expect(notification).toBeDefined();
      expect(notification.userId.toString()).toBe(testUser._id.toString());
      expect(notification.read).toBe(false);
    });

    it('should mark notification as read', async () => {
      const notification = await Notification.createNotification({
        userId: testUser._id,
        type: 'system_announcement',
        title: 'Test',
        message: 'Test message',
      });

      await notification.markAsRead();

      expect(notification.read).toBe(true);
      expect(notification.readAt).toBeDefined();
    });

    it('should get unread count', async () => {
      await Notification.createNotification({
        userId: testUser._id,
        type: 'staff_invitation',
        title: 'Test 1',
        message: 'Message 1',
      });

      await Notification.createNotification({
        userId: testUser._id,
        type: 'staff_approval',
        title: 'Test 2',
        message: 'Message 2',
      });

      const count = await Notification.getUnreadCount(testUser._id);
      expect(count).toBe(2);
    });

    it('should mark all as read', async () => {
      await Notification.createNotification({
        userId: testUser._id,
        type: 'staff_invitation',
        title: 'Test 1',
        message: 'Message 1',
      });

      await Notification.createNotification({
        userId: testUser._id,
        type: 'document_uploaded',
        title: 'Test 2',
        message: 'Message 2',
      });

      await Notification.markAllAsRead(testUser._id);

      const count = await Notification.getUnreadCount(testUser._id);
      expect(count).toBe(0);
    });

    it('should support all notification types', async () => {
      const types = [
        'staff_invitation',
        'staff_approval',
        'staff_rejection',
        'document_uploaded',
        'appointment_created',
        'appointment_updated',
        'appointment_cancelled',
        'lab_result_ready',
        'prescription_ready',
        'system_announcement',
        'verification_required',
      ];

      for (const type of types) {
        const notification = await Notification.createNotification({
          userId: testUser._id,
          type,
          title: `Test ${type}`,
          message: `Testing ${type}`,
        });

        expect(notification.type).toBe(type);
      }
    });
  });

  describe('User Model Integration', () => {
    beforeEach(async () => {
      await User.deleteMany({});
    });

    it('should save user with JeevaId', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'integration@test.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
        jeevaId,
        profile: { firstName: 'Integration', lastName: 'Test' },
      });

      await user.save();

      const found = await User.findOne({ jeevaId });
      expect(found).toBeDefined();
      expect(found.email).toBe('integration@test.com');
    });

    it('should allow users without JeevaId (sparse index)', async () => {
      const user = new User({
        email: 'legacy@test.com',
        passwordHash: 'hashedPassword',
        role: 'PATIENT',
        profile: { firstName: 'Legacy', lastName: 'User' },
      });

      await user.save();
      expect(user.jeevaId).toBeUndefined();
    });

    it('should find users by JeevaId', async () => {
      const jeevaId = await generateJeevaId();
      const user = new User({
        email: 'findme@test.com',
        passwordHash: 'hashedPassword',
        role: 'NURSE',
        jeevaId,
        verificationStatus: 'pending',
        profile: { firstName: 'Find', lastName: 'Me' },
      });

      await user.save();

      const found = await User.findOne({ jeevaId });
      expect(found).toBeDefined();
      expect(found.email).toBe('findme@test.com');
      expect(found.role).toBe('NURSE');
    });
  });
});
