/**
 * Emergency Token Service
 * Generates and validates secure, revocable emergency access tokens for QR codes
 */

import crypto from 'crypto';
import EmergencyProfile from '../models/EmergencyProfile.js';
import Patient from '../models/Patient.js';
import logger from '../utils/logger.js';

const TOKEN_SECRET = process.env.EMERGENCY_TOKEN_SECRET || 'dev-emergency-secret-change-in-production';
const TOKEN_EXPIRY_DAYS = parseInt(process.env.EMERGENCY_TOKEN_EXPIRY_DAYS || '365', 10);

class EmergencyTokenService {
  /**
   * Generate a secure emergency access token for a patient
   * Token format: EAT-{patientId-hash}-{timestamp}-{random}
   */
  static async generateEmergencyToken(patientId) {
    try {
      // Verify patient exists
      const patient = await Patient.findById(patientId);
      if (!patient) {
        throw new Error('Patient not found');
      }

      // Generate token components
      const timestamp = Date.now();
      const randomBytes = crypto.randomBytes(16).toString('hex');
      const patientHash = crypto
        .createHash('sha256')
        .update(patientId.toString() + TOKEN_SECRET)
        .digest('hex')
        .substring(0, 12);

      const token = `EAT-${patientHash}-${timestamp}-${randomBytes}`;

      // Create or update emergency profile with token
      let profile = await EmergencyProfile.findOne({ patientId });
      
      if (!profile) {
        profile = new EmergencyProfile({
          patientId,
          jeevaId: patient.jeevaId,
          emergencyAccessToken: {
            token,
            generatedAt: new Date(),
            expiresAt: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
            isActive: true,
            revocationHistory: [],
          },
          visibility: {
            allowEmergencyAccess: true,
          },
        });
      } else {
        // Revoke old token if exists
        if (profile.emergencyAccessToken?.token) {
          if (!profile.emergencyAccessToken.revocationHistory) {
            profile.emergencyAccessToken.revocationHistory = [];
          }
          profile.emergencyAccessToken.revocationHistory.push({
            token: profile.emergencyAccessToken.token,
            revokedAt: new Date(),
            reason: 'Token refreshed',
          });
        }

        profile.emergencyAccessToken = {
          token,
          generatedAt: new Date(),
          expiresAt: new Date(Date.now() + TOKEN_EXPIRY_DAYS * 24 * 60 * 60 * 1000),
          isActive: true,
          revocationHistory: profile.emergencyAccessToken?.revocationHistory || [],
        };
      }

      await profile.save();

      logger.info(`Emergency token generated for patient ${patientId}`);

      return {
        token,
        expiresAt: profile.emergencyAccessToken.expiresAt,
        qrCodeData: this.generateQRCodeData(token, patient),
      };
    } catch (error) {
      logger.error(`Failed to generate emergency token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate QR code data (URL-safe, no sensitive data embedded)
   */
  static generateQRCodeData(token, patient) {
    // Only include token and minimal identifier
    // Full data retrieved via backend API after token validation
    return {
      type: 'jeevacare_emergency',
      token,
      jeevaId: patient.jeevaId,
      // Do NOT include: name, phone, medical data, Aadhaar
    };
  }

  /**
   * Validate an emergency access token
   */
  static async validateEmergencyToken(token) {
    try {
      if (!token || !token.startsWith('EAT-')) {
        throw new Error('Invalid token format');
      }

      // Find emergency profile with this token
      const profile = await EmergencyProfile.findOne({
        'emergencyAccessToken.token': token,
        'emergencyAccessToken.isActive': true,
      }).populate('patientId');

      if (!profile) {
        throw new Error('Token not found or inactive');
      }

      // Check expiration
      if (profile.emergencyAccessToken.expiresAt < new Date()) {
        throw new Error('Token has expired');
      }

      // Check if emergency access is allowed
      if (!profile.visibility?.allowEmergencyAccess) {
        throw new Error('Emergency access disabled by patient');
      }

      logger.info(`Emergency token validated for patient ${profile.patientId._id}`);

      return {
        valid: true,
        patientId: profile.patientId._id,
        profileId: profile._id,
        jeevaId: profile.jeevaId,
        expiresAt: profile.emergencyAccessToken.expiresAt,
      };
    } catch (error) {
      logger.warn(`Token validation failed: ${error.message}`);
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Revoke an emergency token
   */
  static async revokeEmergencyToken(patientId, reason = 'Revoked by patient') {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      
      if (!profile || !profile.emergencyAccessToken?.token) {
        throw new Error('No active token found');
      }

      // Add to revocation history
      if (!profile.emergencyAccessToken.revocationHistory) {
        profile.emergencyAccessToken.revocationHistory = [];
      }
      
      profile.emergencyAccessToken.revocationHistory.push({
        token: profile.emergencyAccessToken.token,
        revokedAt: new Date(),
        reason,
      });

      profile.emergencyAccessToken.isActive = false;
      await profile.save();

      logger.info(`Emergency token revoked for patient ${patientId}`);

      return {
        success: true,
        message: 'Token revoked successfully',
      };
    } catch (error) {
      logger.error(`Failed to revoke token: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get emergency token status
   */
  static async getTokenStatus(patientId) {
    try {
      const profile = await EmergencyProfile.findOne({ patientId });
      
      if (!profile || !profile.emergencyAccessToken?.token) {
        return {
          hasToken: false,
          isActive: false,
        };
      }

      const isExpired = profile.emergencyAccessToken.expiresAt < new Date();

      return {
        hasToken: true,
        isActive: profile.emergencyAccessToken.isActive && !isExpired,
        expiresAt: profile.emergencyAccessToken.expiresAt,
        generatedAt: profile.emergencyAccessToken.generatedAt,
        isExpired,
      };
    } catch (error) {
      logger.error(`Failed to get token status: ${error.message}`);
      throw error;
    }
  }
}

export default EmergencyTokenService;
