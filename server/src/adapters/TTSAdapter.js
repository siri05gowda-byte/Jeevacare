import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

class TTSAdapter {
  constructor() {
    this.isConfigured = config.ttsService.enabled;
    this.provider = config.ttsService.provider;
    this.apiKey = config.ttsService.apiKey;

    if (this.isConfigured) {
      logger.info(`TTS adapter initialized with provider: ${this.provider}`);
    } else {
      logger.warn('TTS adapter not configured. Operating in demo mode.');
    }
  }

  /**
   * Generate audio from text
   */
  async generateAudio(text, options = {}) {
    try {
      const language = options.language || 'en';
      const gender = options.gender || 'neutral';
      const speed = options.speed || 1.0;

      if (!this.isConfigured) {
        return this.mockAudioGeneration(text, language);
      }

      // Real TTS generation would happen here
      return this.mockAudioGeneration(text, language);
    } catch (error) {
      logger.error(`TTS generation error: ${error.message}`);
      throw new ExternalServiceError('TTS Service', error.message);
    }
  }

  /**
   * List available voices
   */
  async listVoices(language = 'en') {
    try {
      if (!this.isConfigured) {
        return this.mockVoiceList(language);
      }

      // Real voice list would be fetched here
      return this.mockVoiceList(language);
    } catch (error) {
      logger.error(`Failed to list voices: ${error.message}`);
      throw new ExternalServiceError('TTS Service', error.message);
    }
  }

  /**
   * Check supported languages
   */
  getSupportedLanguages() {
    return ['en', 'hi', 'kn', 'te', 'ta', 'ml'];
  }

  /**
   * Mock audio generation
   */
  mockAudioGeneration(text, language = 'en') {
    return {
      audioUrl: `https://demo.jeevacare.local/audio/${Date.now()}.mp3`,
      audioFormat: 'mp3',
      duration: Math.ceil(text.length / 15), // Rough estimate: ~15 chars per second
      language,
      generatedAt: new Date(),
      isDemo: true,
      warnings: ['This is demo audio output for development purposes'],
    };
  }

  /**
   * Mock voice list
   */
  mockVoiceList(language = 'en') {
    const voicesByLanguage = {
      en: [
        { id: 'en-US-1', name: 'Amy', gender: 'female', language: 'en' },
        { id: 'en-US-2', name: 'Brian', gender: 'male', language: 'en' },
      ],
      hi: [
        { id: 'hi-IN-1', name: 'Kavya', gender: 'female', language: 'hi' },
        { id: 'hi-IN-2', name: 'Arjun', gender: 'male', language: 'hi' },
      ],
      kn: [
        { id: 'kn-IN-1', name: 'Priya', gender: 'female', language: 'kn' },
      ],
      te: [
        { id: 'te-IN-1', name: 'Lakshmi', gender: 'female', language: 'te' },
      ],
      ta: [
        { id: 'ta-IN-1', name: 'Meera', gender: 'female', language: 'ta' },
      ],
      ml: [
        { id: 'ml-IN-1', name: 'Nandini', gender: 'female', language: 'ml' },
      ],
    };

    return voicesByLanguage[language] || voicesByLanguage.en;
  }

  /**
   * Check if adapter is in demo mode
   */
  isDemoMode() {
    return !this.isConfigured;
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? 'production' : 'demo',
      provider: 'TTS Service',
      ttsProvider: this.provider,
      supportedLanguages: this.getSupportedLanguages(),
    };
  }
}

export default new TTSAdapter();
