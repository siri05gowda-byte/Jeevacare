import config from '../config/index.js';
import PiperTTSAdapter from './PiperTTSAdapter.js';
import BhashiniTTSAdapter from './BhashiniTTSAdapter.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

/**
 * TTSAdapter - Main TTS facade
 * Routes to appropriate provider based on configuration
 * Currently supports: Bhashini (Indian multilingual), Piper (local fallback)
 */
class TTSAdapter {
  constructor() {
    this.provider = config.ttsService.provider || 'bhashini';
    this.isConfigured = this.initializeProvider();

    if (this.isConfigured) {
      logger.info(`✓ TTS adapter initialized with provider: ${this.provider}`);
    } else {
      logger.warn('⚠ TTS adapter not configured. Operating in demo mode.');
    }
  }

  /**
   * Initialize the appropriate TTS provider
   */
  initializeProvider() {
    switch (this.provider) {
      case 'bhashini':
        this.adapter = BhashiniTTSAdapter;
        return BhashiniTTSAdapter.isConfigured();

      case 'piper':
        this.adapter = PiperTTSAdapter;
        return !PiperTTSAdapter.isDemoMode();

      default:
        logger.warn(`Unknown TTS provider: ${this.provider}. Defaulting to Bhashini with Piper fallback.`);
        this.adapter = BhashiniTTSAdapter;
        return BhashiniTTSAdapter.isConfigured();
    }
  }

  /**
   * Generate audio from text
   */
  async generateAudio(text, options = {}) {
    try {
      if (!this.adapter) {
        throw new Error('No TTS adapter configured');
      }

      // Try primary provider (Bhashini)
      if (this.provider === 'bhashini' && BhashiniTTSAdapter.isConfigured()) {
        try {
          const audioBuffer = await BhashiniTTSAdapter.textToSpeech(
            text,
            options.language || 'en',
            options
          );
          return audioBuffer;
        } catch (bhashiniError) {
          logger.warn(`Bhashini TTS failed, falling back to Piper: ${bhashiniError.message}`);
          // Fall through to Piper fallback
        }
      }

      // Fallback to Piper
      return await PiperTTSAdapter.generateAudio(text, options);
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
      if (!this.adapter) {
        return [];
      }

      if (this.provider === 'bhashini') {
        return BhashiniTTSAdapter.getSupportedVoices(language);
      }

      return await this.adapter.listVoices(language);
    } catch (error) {
      logger.error(`Failed to list voices: ${error.message}`);
      throw new ExternalServiceError('TTS Service', error.message);
    }
  }

  /**
   * Check supported languages
   */
  getSupportedLanguages() {
    if (this.provider === 'bhashini') {
      return BhashiniTTSAdapter.getSupportedLanguages();
    }
    return config.piperTTS.supportedLanguages || ['en', 'hi', 'kn', 'te', 'ta', 'ml'];
  }

  /**
   * Check if adapter is in demo mode
   */
  isDemoMode() {
    if (this.provider === 'bhashini') {
      return !BhashiniTTSAdapter.isConfigured();
    }
    return this.adapter?.isDemoMode?.() || !this.isConfigured;
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      configured: this.isConfigured,
      mode: this.isConfigured ? 'LIVE' : 'DEMO',
      provider: this.provider,
      bhashiniConfigured: BhashiniTTSAdapter.isConfigured(),
      piperAvailable: !PiperTTSAdapter.isDemoMode(),
      adapterStatus: this.adapter?.getStatus?.(),
      supportedLanguages: this.getSupportedLanguages(),
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (this.provider === 'bhashini') {
      return await BhashiniTTSAdapter.healthCheck();
    }
    return this.isConfigured;
  }
}

export default new TTSAdapter();
