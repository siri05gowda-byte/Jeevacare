import { describe, it, expect } from 'vitest';
import AIService from './AIService.js';
import TranslationService from './TranslationService.js';
import TextToSpeechService from './TextToSpeechService.js';

describe('Phase 7: AI Medical Summary + Multilingual + TTS Integration Tests', () => {
  // ===== AI SERVICE TESTS =====
  describe('AIService - Provider Routing', () => {
    it('should route to GroqAIAdapter when configured', () => {
      const status = AIService.getStatus();
      // Should be Groq if configured, Mock if not
      expect(['Groq', 'Mock']).toContain(status.provider);
      expect(status.provider).toBe('Groq'); // Verify Groq is configured
    });

    it('should return supported languages', () => {
      const languages = AIService.getSupportedLanguages();
      expect(languages).toEqual(['en', 'hi', 'kn', 'te', 'ta', 'ml']);
    });

    it('should be ready for AI operations', () => {
      expect(AIService.isReady()).toBe(true);
    });
  });

  // ===== TRANSLATION TESTS =====
  describe('Translation Service - Six Languages', () => {
    it('should support all six languages', () => {
      const supported = TranslationService.getSupportedLanguages();
      expect(supported).toContainEqual(expect.objectContaining({ code: 'en' }));
      expect(supported).toContainEqual(expect.objectContaining({ code: 'hi' }));
      expect(supported).toContainEqual(expect.objectContaining({ code: 'kn' }));
      expect(supported).toContainEqual(expect.objectContaining({ code: 'te' }));
      expect(supported).toContainEqual(expect.objectContaining({ code: 'ta' }));
      expect(supported).toContainEqual(expect.objectContaining({ code: 'ml' }));
    });

    it('should validate language support', () => {
      expect(TranslationService.isLanguageSupported('en')).toBe(true);
      expect(TranslationService.isLanguageSupported('xx')).toBe(false);
    });
  });

  // ===== TEXT-TO-SPEECH TESTS =====
  describe('Text-to-Speech Service', () => {
    it('should support all six languages for TTS', () => {
      const supported = TextToSpeechService.getSupportedLanguages();
      expect(supported).toEqual(['en', 'hi', 'kn', 'te', 'ta', 'ml']);
    });

    it('should validate language for TTS', () => {
      expect(TextToSpeechService.isLanguageSupported('en')).toBe(true);
      expect(TextToSpeechService.isLanguageSupported('xx')).toBe(false);
    });

    it('should reject unsupported language for audio', () => {
      expect(() => {
        TextToSpeechService.validateLanguage('xx');
      }).toThrow();
    });
  });

  // ===== AI ADAPTER TESTS =====
  describe('AI Adapter - Structured Response Validation', () => {
    it('should generate medical summary with proper structure', async () => {
      const testData = {
        recordCount: 1,
        vaccinations: [{ vaccineName: 'COVID-19' }],
        laboratoryResults: [],
        radiologyRecords: [],
        dischargeSummaries: [],
        encounters: [],
      };

      const result = await AIService.generateMedicalSummary(testData, { language: 'en' });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.disclaimers)).toBe(true);
      expect(result.disclaimers.length).toBeGreaterThan(0);
    });
  });

  // ===== TRANSLATION GENERATION TESTS =====
  describe('Translation Generation', () => {
    it('should translate text between languages', async () => {
      const text = 'This is a test medical summary';

      const result = await AIService.translateText(text, 'hi', 'en');

      expect(result).toBeDefined();
      expect(result.translated).toBeDefined();
      expect(result.targetLanguage).toBe('hi');
    });

    it('should generate simple explanations', async () => {
      const medicalContent = 'Patient has received COVID-19 vaccination on 2024-01-15';

      const result = await AIService.generateSimpleExplanation(medicalContent, { language: 'en' });

      expect(result).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
    });
  });
});
