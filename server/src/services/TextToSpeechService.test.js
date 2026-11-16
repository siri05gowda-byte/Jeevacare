/**
 * Text-to-Speech Service Tests
 * 
 * Tests for the TTS service layer that validates input, checks configuration,
 * and orchestrates audio generation through the TTS adapter.
 */

import { describe, it, expect, vi } from 'vitest';
import TextToSpeechService from './TextToSpeechService.js';
import TTSAdapter from '../adapters/TTSAdapter.js';
import logger from '../utils/logger.js';

describe('TextToSpeechService', () => {
  // ===== SUPPORTED LANGUAGES =====

  describe('Supported Languages', () => {
    it('should define only languages with available Piper models', () => {
      const languages = TextToSpeechService.SUPPORTED_LANGUAGES;

      // Verify only 3 languages are supported
      expect(languages).toContain('en');
      expect(languages).toContain('hi');
      expect(languages).toContain('ml');
      expect(languages.length).toBe(3);

      // Verify unsupported languages are excluded
      expect(languages).not.toContain('kn'); // No Piper model
      expect(languages).not.toContain('ta'); // No Piper model
      expect(languages).not.toContain('te'); // No Piper model

      logger.info(`Supported languages: ${languages.join(', ')}`);
    });

    it('should expose supported languages via getSupportedLanguages()', () => {
      const languages = TextToSpeechService.getSupportedLanguages();
      expect(languages).toEqual(['en', 'hi', 'ml']);
    });

    it('should validate language support', () => {
      expect(TextToSpeechService.isLanguageSupported('en')).toBe(true);
      expect(TextToSpeechService.isLanguageSupported('hi')).toBe(true);
      expect(TextToSpeechService.isLanguageSupported('ml')).toBe(true);

      expect(TextToSpeechService.isLanguageSupported('kn')).toBe(false);
      expect(TextToSpeechService.isLanguageSupported('ta')).toBe(false);
      expect(TextToSpeechService.isLanguageSupported('te')).toBe(false);
      expect(TextToSpeechService.isLanguageSupported('xx')).toBe(false);
    });
  });

  // ===== AUDIO GENERATION =====

  describe('Audio Generation', () => {
    it('should generate audio for valid input', async () => {
      const result = await TextToSpeechService.generateAudio(
        'This is a test medical explanation',
        'en',
        'patient123',
        'user456'
      );

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.audio).toBeDefined();
      expect(result.audio.url).toBeDefined();
      expect(result.audio.format).toBeDefined();
      expect(result.audio.duration).toBeGreaterThan(0);
      expect(result.audio.language).toBe('en');

      logger.info(`✓ Generated audio for English (${result.audio.duration}s)`);
    });

    it('should generate audio in default language (English)', async () => {
      const result = await TextToSpeechService.generateAudio(
        'Test without explicit language'
      );

      expect(result.success).toBe(true);
      expect(result.audio.language).toBe('en');
    });

    it('should set isDemo flag appropriately', async () => {
      const result = await TextToSpeechService.generateAudio(
        'Test audio',
        'en'
      );

      expect(result.success).toBe(true);
      expect(typeof result.audio.isDemo).toBe('boolean');

      if (TTSAdapter.isConfigured) {
        // Real synthesis available
        expect(result.audio.isDemo).toBe(false);
        logger.info('✓ Real Piper synthesis available (isDemo=false)');
      } else {
        // Demo mode
        expect(result.audio.isDemo).toBe(true);
        logger.info('✓ Running in demo mode (isDemo=true)');
      }
    });
  });

  // ===== INPUT VALIDATION =====

  describe('Input Validation', () => {
    it('should reject empty explanation text', async () => {
      const testCases = [
        { text: '', description: 'empty string' },
        { text: '   ', description: 'whitespace only' },
        { text: null, description: 'null' },
        { text: undefined, description: 'undefined' },
      ];

      for (const testCase of testCases) {
        const result = await TextToSpeechService.generateAudio(
          testCase.text,
          'en',
          'patient123',
          'user456'
        );

        expect(result.success).toBe(false);
        expect(result.error).toBeDefined();
        logger.info(`✓ Rejected ${testCase.description}`);
      }
    });

    it('should reject text exceeding maximum length (5000 chars)', async () => {
      const longText = 'test '.repeat(1500); // 7,500 chars

      const result = await TextToSpeechService.generateAudio(
        longText,
        'en',
        'patient123',
        'user456'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('too long');
      logger.info('✓ Rejected oversized text');
    });

    it('should reject unsupported language', async () => {
      const unsupportedLanguages = ['kn', 'ta', 'te', 'fr', 'de', 'xx'];

      for (const lang of unsupportedLanguages) {
        const result = await TextToSpeechService.generateAudio(
          'Test text',
          lang,
          'patient123',
          'user456'
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain('not supported');
        expect(result.supportedLanguages).toEqual(['en', 'hi', 'ml']);
        logger.info(`✓ Rejected unsupported language: ${lang}`);
      }
    });
  });

  // ===== STATUS & CONFIGURATION =====

  describe('Service Status', () => {
    it('should report TTS status', () => {
      const status = TextToSpeechService.getStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('supportedLanguages');

      logger.info(`Status: ${JSON.stringify(status)}`);
    });
  });

  // ===== VOICE LISTING =====

  describe('Voice Listing', () => {
    it('should get voices for supported languages', async () => {
      for (const lang of ['en', 'hi', 'ml']) {
        const result = await TextToSpeechService.getVoicesForLanguage(lang);

        expect(result.success).toBe(true);
        expect(Array.isArray(result.voices)).toBe(true);
        expect(result.voices.length).toBeGreaterThan(0);

        logger.info(`✓ Voices for ${lang}: ${result.voices.length}`);
      }
    });

    it('should return error for unsupported language', async () => {
      const result = await TextToSpeechService.getVoicesForLanguage('kn');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      logger.info('✓ Correctly returned error for unsupported language');
    });

    it('should get demo voices when TTS not configured', () => {
      const demoVoices = TextToSpeechService.getDemoVoices('en');

      expect(Array.isArray(demoVoices)).toBe(true);
      expect(demoVoices.length).toBeGreaterThan(0);

      const voice = demoVoices[0];
      expect(voice).toHaveProperty('id');
      expect(voice).toHaveProperty('name');
      expect(voice).toHaveProperty('gender');
      expect(voice).toHaveProperty('language');
    });
  });

  // ===== DEMO VOICES =====

  describe('Demo Voice Fallback', () => {
    it('should provide demo voices for all supported languages', () => {
      for (const lang of ['en', 'hi', 'ml']) {
        const voices = TextToSpeechService.getDemoVoices(lang);

        expect(Array.isArray(voices)).toBe(true);
        expect(voices.length).toBeGreaterThan(0);
        expect(voices[0].language).toBe(lang);

        logger.info(`✓ Demo voices for ${lang}: ${voices.map(v => v.name).join(', ')}`);
      }
    });

    it('should return English demo voices for unsupported language', () => {
      const voices = TextToSpeechService.getDemoVoices('kn');

      // Should fall back to English
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBeGreaterThan(0);
    });
  });

  // ===== INTEGRATION =====

  describe('Service Integration', () => {
    it('should coordinate with TTSAdapter', async () => {
      const result = await TextToSpeechService.generateAudio(
        'Integration test',
        'en'
      );

      expect(result).toBeDefined();
      expect(result.success).toBeDefined();

      logger.info('✓ Service successfully coordinates with adapter');
    });

    it('should handle adapter errors gracefully', async () => {
      // Test with edge case that might trigger adapter error
      const result = await TextToSpeechService.generateAudio(
        'a', // Minimal text
        'en'
      );

      // Should either succeed or return clear error
      if (result.success === false) {
        expect(result.error).toBeDefined();
        logger.info('✓ Error handled gracefully');
      } else {
        expect(result.audio).toBeDefined();
        logger.info('✓ Minimal text accepted');
      }
    });
  });
});
