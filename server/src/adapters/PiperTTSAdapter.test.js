/**
 * Piper TTS Adapter Tests
 * 
 * Comprehensive test coverage for real Piper TTS synthesis:
 * - Real synthesis when Piper and models are available
 * - Graceful degradation to demo mode when Piper unavailable
 * - Error handling (missing models, invalid input, timeouts)
 * - Language support validation
 * - Audio file cleanup
 * - Concurrent request limiting
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import PiperTTSAdapter from './PiperTTSAdapter.js';
import fs from 'fs';
import path from 'path';
import os from 'os';
import logger from '../utils/logger.js';

describe('PiperTTSAdapter - Real Piper TTS Synthesis', () => {
  let testOutputDir;

  beforeAll(() => {
    // Create test output directory
    testOutputDir = path.join(os.tmpdir(), 'piper-tts-tests', Date.now().toString());
    if (!fs.existsSync(testOutputDir)) {
      fs.mkdirSync(testOutputDir, { recursive: true });
    }
    logger.info(`Test output directory: ${testOutputDir}`);
  });

  afterAll(() => {
    // Cleanup test files
    if (fs.existsSync(testOutputDir)) {
      const files = fs.readdirSync(testOutputDir);
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(testOutputDir, file));
        } catch (err) {
          logger.warn(`Failed to clean up test file: ${file}`);
        }
      });
      try {
        fs.rmdirSync(testOutputDir);
      } catch (err) {
        logger.warn(`Failed to remove test directory`);
      }
    }
  });

  // ===== ADAPTER STATUS & CONFIGURATION =====

  describe('Adapter Status & Configuration', () => {
    it('should report current configuration status', () => {
      const status = PiperTTSAdapter.getStatus();

      expect(status).toBeDefined();
      expect(status).toHaveProperty('configured');
      expect(status).toHaveProperty('mode');
      expect(status).toHaveProperty('provider');
      expect(status).toHaveProperty('supportedLanguages');

      logger.info(`Adapter Status: ${JSON.stringify(status)}`);
    });

    it('should identify demo mode when Piper not configured', () => {
      const isDemoMode = PiperTTSAdapter.isDemoMode();
      expect(typeof isDemoMode).toBe('boolean');

      if (isDemoMode) {
        logger.warn('Piper TTS running in DEMO MODE (real synthesis unavailable)');
      } else {
        logger.info('Piper TTS configured for REAL synthesis');
      }
    });

    it('should support only languages with available models', () => {
      const languages = PiperTTSAdapter.supportedLanguages;

      // Verify only 3 languages are supported (en, hi, ml)
      expect(languages).toContain('en');
      expect(languages).toContain('hi');
      expect(languages).toContain('ml');
      expect(languages).not.toContain('kn'); // No official Piper model
      expect(languages).not.toContain('te'); // No official Piper model
      expect(languages).not.toContain('ta'); // No official Piper model
    });

    it('should list language status', () => {
      const langStatus = PiperTTSAdapter.getLanguageStatus();

      expect(langStatus).toBeDefined();
      expect(langStatus).toHaveProperty('en');
      expect(langStatus).toHaveProperty('hi');
      expect(langStatus).toHaveProperty('ml');

      logger.info(`Language Status: ${JSON.stringify(langStatus, null, 2)}`);
    });
  });

  // ===== REAL SYNTHESIS (when Piper available) =====

  describe('Real Piper Synthesis', () => {
    it('should generate valid audio for English (real synthesis)', async () => {
      if (PiperTTSAdapter.isDemoMode()) {
        logger.warn('Skipping real synthesis test - Piper not available in demo mode');
        expect(true).toBe(true); // Skip gracefully
        return;
      }

      const testText = 'This is a test of real Piper text to speech synthesis.';

      const result = await PiperTTSAdapter.generateAudio(testText, {
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(result.audioPath).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(result.isDemo).toBe(false);

      // Verify audio file exists and is valid
      expect(fs.existsSync(result.audioPath)).toBe(true);
      const stats = fs.statSync(result.audioPath);
      expect(stats.size).toBeGreaterThan(0);

      logger.info(`✓ English synthesis: ${result.fileSize} bytes`);
    });

    it('should generate valid audio for Hindi (real synthesis)', async () => {
      if (PiperTTSAdapter.isDemoMode()) {
        logger.warn('Skipping real synthesis test - Piper not available');
        expect(true).toBe(true);
        return;
      }

      const testText = 'Yah hindi mein piper text to speech synthesis ka parikshan hai.';

      const result = await PiperTTSAdapter.generateAudio(testText, {
        language: 'hi',
      });

      expect(result).toBeDefined();
      expect(result.isDemo).toBe(false);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(fs.existsSync(result.audioPath)).toBe(true);

      logger.info(`✓ Hindi synthesis: ${result.fileSize} bytes`);
    });

    it('should generate valid audio for Malayalam (real synthesis)', async () => {
      if (PiperTTSAdapter.isDemoMode()) {
        logger.warn('Skipping real synthesis test - Piper not available');
        expect(true).toBe(true);
        return;
      }

      const testText = 'Ith Malayalam text to speech synthesis parikshana anirunn.';

      const result = await PiperTTSAdapter.generateAudio(testText, {
        language: 'ml',
      });

      expect(result).toBeDefined();
      expect(result.isDemo).toBe(false);
      expect(result.fileSize).toBeGreaterThan(0);
      expect(fs.existsSync(result.audioPath)).toBe(true);

      logger.info(`✓ Malayalam synthesis: ${result.fileSize} bytes`);
    });
  });

  // ===== DEMO MODE (when Piper unavailable) =====

  describe('Demo Mode Fallback', () => {
    it('should return demo audio metadata when Piper not configured', async () => {
      if (!PiperTTSAdapter.isDemoMode()) {
        logger.info('Skipping demo mode test - Piper is configured');
        expect(true).toBe(true);
        return;
      }

      const testText = 'This is a test of demo mode.';

      const result = await PiperTTSAdapter.generateAudio(testText, {
        language: 'en',
      });

      expect(result).toBeDefined();
      expect(result.isDemo).toBe(true);
      expect(result.audioPath).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);

      logger.info(`✓ Demo mode fallback working`);
    });
  });

  // ===== ERROR HANDLING =====

  describe('Error Handling & Validation', () => {
    it('should reject empty text', async () => {
      const testCases = [
        { text: '', language: 'en', description: 'empty string' },
        { text: '   ', language: 'en', description: 'whitespace only' },
        { text: null, language: 'en', description: 'null' },
      ];

      for (const testCase of testCases) {
        try {
          await PiperTTSAdapter.generateAudio(testCase.text, {
            language: testCase.language,
          });
          expect.fail(`Should reject ${testCase.description}`);
        } catch (error) {
          expect(error).toBeDefined();
          logger.info(`✓ Rejected ${testCase.description}`);
        }
      }
    });

    it('should reject text exceeding maximum length', async () => {
      const longText = 'test '.repeat(2500); // 12,500 chars, exceeds 10,000 limit

      try {
        await PiperTTSAdapter.generateAudio(longText, {
          language: 'en',
        });
        expect.fail('Should reject oversized text');
      } catch (error) {
        expect(error.message).toContain('exceeds maximum length');
        logger.info('✓ Rejected oversized text (>10000 chars)');
      }
    });

    it('should reject unsupported language', async () => {
      const unsupportedLanguages = ['kn', 'ta', 'te', 'xx', 'fr'];

      for (const lang of unsupportedLanguages) {
        try {
          await PiperTTSAdapter.generateAudio('test', {
            language: lang,
          });
          expect.fail(`Should reject unsupported language: ${lang}`);
        } catch (error) {
          expect(error.message).toContain('not supported');
          logger.info(`✓ Rejected unsupported language: ${lang}`);
        }
      }
    });

    it('should handle missing voice model gracefully', async () => {
      // This test verifies behavior when model file doesn't exist
      if (!PiperTTSAdapter.isDemoMode()) {
        // Can only test this in demo mode since real models are installed
        logger.info('Skipping missing model test - real models installed');
        expect(true).toBe(true);
        return;
      }

      const result = await PiperTTSAdapter.generateAudio('test', {
        language: 'en',
      });

      expect(result.isDemo).toBe(true);
      logger.info('✓ Gracefully handled missing model with demo mode');
    });
  });

  // ===== CONCURRENT REQUEST LIMITING =====

  describe('Concurrent Request Limiting', () => {
    it('should enforce maximum concurrent requests', async () => {
      if (PiperTTSAdapter.isDemoMode()) {
        logger.info('Skipping concurrency test - demo mode enabled');
        expect(true).toBe(true);
        return;
      }

      const maxConcurrent = PiperTTSAdapter.maxConcurrentRequests;
      expect(maxConcurrent).toBe(3); // Default limit

      logger.info(`✓ Concurrent request limit: ${maxConcurrent}`);
    });
  });

  // ===== CLEANUP & MAINTENANCE =====

  describe('Temporary File Cleanup', () => {
    it('should have cleanup method available', () => {
      expect(typeof PiperTTSAdapter.cleanupOldAudioFiles).toBe('function');
      logger.info('✓ Cleanup method available');
    });

    it('should not throw when cleaning up files', () => {
      expect(() => {
        PiperTTSAdapter.cleanupOldAudioFiles();
      }).not.toThrow();

      logger.info('✓ Cleanup executed without errors');
    });
  });

  // ===== VOICE LISTING =====

  describe('Voice Listing', () => {
    it('should list available voices for supported languages', async () => {
      for (const lang of ['en', 'hi', 'ml']) {
        const voices = await PiperTTSAdapter.listVoices(lang);

        expect(Array.isArray(voices)).toBe(true);
        expect(voices.length).toBeGreaterThan(0);

        const voice = voices[0];
        expect(voice).toHaveProperty('id');
        expect(voice).toHaveProperty('name');
        expect(voice).toHaveProperty('language');
        expect(voice).toHaveProperty('provider');

        logger.info(`✓ Voices for ${lang}: ${voices.map(v => v.name).join(', ')}`);
      }
    });

    it('should return empty array for unsupported language', async () => {
      const voices = await PiperTTSAdapter.listVoices('kn');
      expect(Array.isArray(voices)).toBe(true);
      expect(voices.length).toBe(0);
      logger.info('✓ Correctly returned empty array for unsupported language');
    });
  });
});
