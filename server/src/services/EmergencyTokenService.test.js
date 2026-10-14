/**
 * Emergency Token Service Tests
 * Tests token generation, validation, revocation, and security
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import EmergencyTokenService from './EmergencyTokenService.js';
import EmergencyProfile from '../models/EmergencyProfile.js';
import Patient from '../models/Patient.js';

describe('EmergencyTokenService', () => {
  describe('Token Generation', () => {
    it('should generate valid emergency token with correct format', async () => {
      // Mock patient
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
        jeevaId: 'JC-TEST-001',
      };

      // Mock Patient.findById
      vi.spyOn(Patient, 'findById').mockResolvedValue(mockPatient);

      // Mock EmergencyProfile operations
      const mockProfile = {
        patientId: mockPatient._id,
        jeevaId: mockPatient.jeevaId,
        emergencyAccessToken: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(null);
      vi.spyOn(EmergencyProfile.prototype, 'constructor').mockImplementation(() => mockProfile);

      const result = await EmergencyTokenService.generateEmergencyToken(mockPatient._id);

      expect(result).toBeDefined();
      expect(result.token).toMatch(/^EAT-[a-f0-9]{12}-\d+-[a-f0-9]{32}$/);
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.qrCodeData).toBeDefined();
      expect(result.qrCodeData.type).toBe('jeevacare_emergency');
      expect(result.qrCodeData.token).toBe(result.token);
    });

    it('should reject token generation for non-existent patient', async () => {
      vi.spyOn(Patient, 'findById').mockResolvedValue(null);

      await expect(
        EmergencyTokenService.generateEmergencyToken('507f1f77bcf86cd799439011')
      ).rejects.toThrow('Patient not found');
    });

    it('should NOT include sensitive patient data in QR code', async () => {
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
        jeevaId: 'JC-TEST-001',
        personalIdentity: {
          firstName: 'John',
          lastName: 'Doe',
          phone: '+919876543210',
          aadhaar: '123456789012',
        },
      };

      vi.spyOn(Patient, 'findById').mockResolvedValue(mockPatient);

      const mockProfile = {
        patientId: mockPatient._id,
        emergencyAccessToken: null,
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(null);

      const result = await EmergencyTokenService.generateEmergencyToken(mockPatient._id);

      // QR code should ONLY contain token and jeevaId
      expect(result.qrCodeData).toHaveProperty('token');
      expect(result.qrCodeData).toHaveProperty('jeevaId');
      expect(result.qrCodeData).toHaveProperty('type');

      // Should NOT contain sensitive data
      expect(result.qrCodeData).not.toHaveProperty('firstName');
      expect(result.qrCodeData).not.toHaveProperty('lastName');
      expect(result.qrCodeData).not.toHaveProperty('phone');
      expect(result.qrCodeData).not.toHaveProperty('aadhaar');
      expect(result.qrCodeData).not.toHaveProperty('personalIdentity');
    });

    it('should revoke old token when generating new one', async () => {
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
        jeevaId: 'JC-TEST-001',
      };

      vi.spyOn(Patient, 'findById').mockResolvedValue(mockPatient);

      const oldToken = 'EAT-old123-1234567890-abc123';
      const mockProfile = {
        patientId: mockPatient._id,
        emergencyAccessToken: {
          token: oldToken,
          generatedAt: new Date(),
          isActive: true,
          revocationHistory: [],
        },
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(mockProfile);

      await EmergencyTokenService.generateEmergencyToken(mockPatient._id);

      expect(mockProfile.emergencyAccessToken.revocationHistory).toHaveLength(1);
      expect(mockProfile.emergencyAccessToken.revocationHistory[0].token).toBe(oldToken);
      expect(mockProfile.emergencyAccessToken.revocationHistory[0].reason).toBe('Token refreshed');
    });
  });

  describe('Token Validation', () => {
    it('should validate valid, active, non-expired token', async () => {
      const validToken = 'EAT-abc123456789-1234567890-def123';
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
        jeevaId: 'JC-TEST-001',
      };

      const mockProfile = {
        _id: '507f1f77bcf86cd799439012',
        patientId: mockPatient,
        jeevaId: 'JC-TEST-001',
        emergencyAccessToken: {
          token: validToken,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days future
          isActive: true,
        },
        visibility: {
          allowEmergencyAccess: true,
        },
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProfile),
      });

      const result = await EmergencyTokenService.validateEmergencyToken(validToken);

      expect(result.valid).toBe(true);
      expect(result.patientId).toEqual(mockPatient._id);
      expect(result.jeevaId).toBe('JC-TEST-001');
    });

    it('should reject token with invalid format', async () => {
      const result = await EmergencyTokenService.validateEmergencyToken('INVALID-TOKEN');

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid token format');
    });

    it('should reject expired token', async () => {
      const expiredToken = 'EAT-abc123456789-1234567890-def123';
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
      };

      const mockProfile = {
        patientId: mockPatient,
        emergencyAccessToken: {
          token: expiredToken,
          generatedAt: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
          isActive: true,
        },
        visibility: {
          allowEmergencyAccess: true,
        },
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProfile),
      });

      const result = await EmergencyTokenService.validateEmergencyToken(expiredToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token has expired');
    });

    it('should reject inactive/revoked token', async () => {
      const revokedToken = 'EAT-abc123456789-1234567890-def123';

      vi.spyOn(EmergencyProfile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(null),
      });

      const result = await EmergencyTokenService.validateEmergencyToken(revokedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token not found or inactive');
    });

    it('should reject token when emergency access is disabled', async () => {
      const token = 'EAT-abc123456789-1234567890-def123';
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
      };

      const mockProfile = {
        patientId: mockPatient,
        emergencyAccessToken: {
          token,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
        visibility: {
          allowEmergencyAccess: false, // Disabled by patient
        },
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(mockProfile),
      });

      const result = await EmergencyTokenService.validateEmergencyToken(token);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Emergency access disabled by patient');
    });
  });

  describe('Token Revocation', () => {
    it('should successfully revoke active token', async () => {
      const activeToken = 'EAT-abc123456789-1234567890-def123';
      const patientId = '507f1f77bcf86cd799439011';

      const mockProfile = {
        patientId,
        emergencyAccessToken: {
          token: activeToken,
          isActive: true,
          revocationHistory: [],
        },
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(mockProfile);

      const result = await EmergencyTokenService.revokeEmergencyToken(
        patientId,
        'User requested revocation'
      );

      expect(result.success).toBe(true);
      expect(mockProfile.emergencyAccessToken.isActive).toBe(false);
      expect(mockProfile.emergencyAccessToken.revocationHistory).toHaveLength(1);
      expect(mockProfile.save).toHaveBeenCalled();
    });

    it('should fail to revoke non-existent token', async () => {
      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(null);

      await expect(
        EmergencyTokenService.revokeEmergencyToken('507f1f77bcf86cd799439011', 'Test')
      ).rejects.toThrow('No active token found');
    });
  });

  describe('Token Status', () => {
    it('should return status for active token', async () => {
      const mockProfile = {
        emergencyAccessToken: {
          token: 'EAT-test',
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(mockProfile);

      const status = await EmergencyTokenService.getTokenStatus('507f1f77bcf86cd799439011');

      expect(status.hasToken).toBe(true);
      expect(status.isActive).toBe(true);
      expect(status.isExpired).toBe(false);
    });

    it('should return no token status when none exists', async () => {
      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(null);

      const status = await EmergencyTokenService.getTokenStatus('507f1f77bcf86cd799439011');

      expect(status.hasToken).toBe(false);
      expect(status.isActive).toBe(false);
    });

    it('should detect expired token in status', async () => {
      const mockProfile = {
        emergencyAccessToken: {
          token: 'EAT-test',
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() - 1000), // Expired
          isActive: true,
        },
      };

      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(mockProfile);

      const status = await EmergencyTokenService.getTokenStatus('507f1f77bcf86cd799439011');

      expect(status.hasToken).toBe(true);
      expect(status.isActive).toBe(false); // Should be false even though isActive=true
      expect(status.isExpired).toBe(true);
    });
  });

  describe('Security Tests', () => {
    it('should generate cryptographically secure random components', async () => {
      const mockPatient = {
        _id: '507f1f77bcf86cd799439011',
        jeevaId: 'JC-TEST-001',
      };

      vi.spyOn(Patient, 'findById').mockResolvedValue(mockPatient);
      vi.spyOn(EmergencyProfile, 'findOne').mockResolvedValue(null);

      const mockProfile = {
        patientId: mockPatient._id,
        save: vi.fn().mockResolvedValue(true),
      };

      // Generate multiple tokens
      const tokens = [];
      for (let i = 0; i < 5; i++) {
        const result = await EmergencyTokenService.generateEmergencyToken(mockPatient._id);
        tokens.push(result.token);
      }

      // All tokens should be unique
      const uniqueTokens = new Set(tokens);
      expect(uniqueTokens.size).toBe(tokens.length);

      // All should have proper format
      tokens.forEach((token) => {
        expect(token).toMatch(/^EAT-[a-f0-9]{12}-\d+-[a-f0-9]{32}$/);
      });
    });

    it('should not allow token reuse after revocation', async () => {
      const revokedToken = 'EAT-revoked123-1234567890-abc123';
      const patientId = '507f1f77bcf86cd799439011';

      const mockProfile = {
        patientId,
        emergencyAccessToken: {
          token: revokedToken,
          isActive: false, // Revoked
          revocationHistory: [
            {
              token: revokedToken,
              revokedAt: new Date(),
              reason: 'Test revocation',
            },
          ],
        },
      };

      // When trying to validate revoked token
      vi.spyOn(EmergencyProfile, 'findOne').mockReturnValue({
        populate: vi.fn().mockResolvedValue(null), // Will not find because isActive=false
      });

      const result = await EmergencyTokenService.validateEmergencyToken(revokedToken);

      expect(result.valid).toBe(false);
      expect(result.error).toBe('Token not found or inactive');
    });
  });
});
