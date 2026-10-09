import config from '../config/index.js';
import PiperTTSAdapter from './PiperTTSAdapter.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

/**
 * TTSAdapter - Main TTS facade
 * Routes to appropriate provider based on configuration
 * Currently supports: Piper (local, free)
 */
class TTSAdapter {
  constructor() {
    this.provider = config.ttsService.provider || 'piper';
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
      case 'piper':
        this.adapter = PiperTTSAdapter;
        return !PiperTTSAdapter.isDemoMode();

      default:
        logger.warn(`Unknown TTS provider: ${this.provider}. Defaulting to demo mode.`);
        this.adapter = PiperTTSAdapter;
        return false;
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

      return await this.adapter.generateAudio(text, options);
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
    return config.piperTTS.supportedLanguages || ['en', 'hi', 'kn', 'te', 'ta', 'ml'];
  }

  /**
   * Check if adapter is in demo mode
   */
  isDemoMode() {
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
      adapterStatus: this.adapter?.getStatus?.(),
      supportedLanguages: this.getSupportedLanguages(),
    };
  }
}

export default new TTSAdapter();
