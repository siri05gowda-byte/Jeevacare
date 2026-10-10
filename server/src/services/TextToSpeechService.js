import TTSAdapter from '../adapters/TTSAdapter.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

/**
 * Text-to-Speech Service
 * Converts patient-friendly explanations to audio
 * Supports 6 locked languages
 * Never exposes provider credentials to frontend
 */
class TextToSpeechService {
  static SUPPORTED_LANGUAGES = ['en', 'hi', 'ml'];

  /**
   * Generate audio for explanation
   * Text should be patient-friendly explanation, not raw medical record
   */
  static async generateAudio(explanationText, language, patientId, requesterId, options = {}) {
    try {
      // Validate language support
      if (!this.SUPPORTED_LANGUAGES.includes(language)) {
        await AuditService.logEvent({
          actor: requesterId,
          actorRole: 'SYSTEM',
          action: 'ai_audio_generated',
          patient: patientId,
          status: 'denied',
          statusMessage: `Unsupported language: ${language}`,
          sensitivityLevel: 'low',
        });

        return {
          success: false,
          error: `Language not supported: ${language}`,
          code: 'UNSUPPORTED_LANGUAGE',
          supportedLanguages: this.SUPPORTED_LANGUAGES,
        };
      }

      // Check if TTS is configured
      if (!TTSAdapter.isConfigured) {
        logger.warn('TTS adapter not configured - using demo mode');

        // Return demo audio metadata
        return {
          success: true,
          audio: {
            url: `https://demo.jeevacare.local/audio/${Date.now()}.mp3`,
            format: 'mp3',
            duration: Math.ceil(explanationText.length / 15), // Rough estimate
            language,
            isDemo: true,
            generatedAt: new Date(),
            disclaimer: 'Demo audio - not real TTS generation',
          },
        };
      }

      // Validate text length
      if (!explanationText || explanationText.length === 0) {
        return {
          success: false,
          error: 'Explanation text cannot be empty',
          code: 'INVALID_INPUT',
        };
      }

      if (explanationText.length > 5000) {
        return {
          success: false,
          error: 'Explanation text too long (max 5000 characters)',
          code: 'TEXT_TOO_LONG',
        };
      }

      logger.info(`Generating audio for explanation in ${language} (${explanationText.length} chars)`);

      // Call TTS adapter
      const audioResult = await TTSAdapter.generateAudio(explanationText, {
        language,
        gender: options.gender || 'neutral',
        speed: options.speed || 1.0,
      });

      // Audit audio generation
      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'PATIENT',
        action: 'ai_audio_generated',
        patient: patientId,
        status: 'success',
        details: {
          language,
          textLength: explanationText.length,
          duration: audioResult.duration,
          isDemo: audioResult.isDemo || false,
        },
        sensitivityLevel: 'low',
      });

      return {
        success: true,
        audio: {
          url: audioResult.audioUrl,
          format: audioResult.audioFormat || 'mp3',
          duration: audioResult.duration,
          language,
          generatedAt: audioResult.generatedAt,
          isDemo: audioResult.isDemo || false,
        },
      };
    } catch (error) {
      logger.error(`TTS generation error: ${error.message}`);

      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'SYSTEM',
        action: 'ai_audio_generated',
        patient: patientId,
        status: 'failure',
        statusMessage: error.message,
        sensitivityLevel: 'low',
      });

      return {
        success: false,
        error: 'Failed to generate audio',
        code: 'GENERATION_ERROR',
        details: error.message,
      };
    }
  }

  /**
   * Get available voices for language
   */
  static async getVoicesForLanguage(language) {
    try {
      if (!this.SUPPORTED_LANGUAGES.includes(language)) {
        return {
          success: false,
          error: `Unsupported language: ${language}`,
        };
      }

      logger.info(`Fetching voices for language: ${language}`);

      if (!TTSAdapter.isConfigured) {
        // Return demo voices
        return {
          success: true,
          voices: this.getDemoVoices(language),
          isDemo: true,
        };
      }

      const voices = await TTSAdapter.listVoices(language);

      return {
        success: true,
        voices,
        isDemo: false,
      };
    } catch (error) {
      logger.error(`Failed to fetch voices: ${error.message}`);

      return {
        success: false,
        error: 'Failed to fetch available voices',
        details: error.message,
      };
    }
  }

  /**
   * Get demo voices for testing
   */
  static getDemoVoices(language) {
    const demoVoices = {
      en: [
        { id: 'en-US-1', name: 'Amy', gender: 'female', language: 'en' },
        { id: 'en-US-2', name: 'Brian', gender: 'male', language: 'en' },
      ],
      hi: [
        { id: 'hi-IN-1', name: 'Pratham', gender: 'male', language: 'hi' },
      ],
      ml: [
        { id: 'ml-IN-1', name: 'Meera', gender: 'female', language: 'ml' },
      ],
    };

    return demoVoices[language] || demoVoices.en;
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return this.SUPPORTED_LANGUAGES;
  }

  /**
   * Check if language supported
   */
  static isLanguageSupported(language) {
    return this.SUPPORTED_LANGUAGES.includes(language);
  }

  /**
   * Get TTS status
   */
  static getStatus() {
    return {
      configured: TTSAdapter.isConfigured,
      provider: TTSAdapter.provider || 'unknown',
      supportedLanguages: this.SUPPORTED_LANGUAGES,
    };
  }
}

export default TextToSpeechService;
