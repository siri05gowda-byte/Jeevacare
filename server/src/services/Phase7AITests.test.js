import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import AIService from './AIService.js';
import TranslationService from './TranslationService.js';
import TextToSpeechService from './TextToSpeechService.js';
import GroqAIAdapter from '../adapters/GroqAIAdapter.js';

describe('Phase 7: AI Medical Summary + Multilingual + TTS Integration Tests', () => {
  afterEach(() => {
    // Restore all mocks after each test
    vi.restoreAllMocks();
  });

  // ===== UNIT TESTS (Mocked Groq API) =====
  describe('[UNIT] AIService - Provider Routing and Configuration', () => {
    it('should route to GroqAIAdapter when configured', () => {
      const status = AIService.getStatus();
      // Should be Groq if configured, Mock if not
      expect(['Groq', 'Mock']).toContain(status.provider);
    });

    it('should return supported languages', () => {
      const languages = AIService.getSupportedLanguages();
      expect(languages).toEqual(['en', 'hi', 'kn', 'te', 'ta', 'ml']);
    });

    it('should be ready for AI operations', () => {
      expect(AIService.isReady()).toBe(true);
    });
  });

  describe('[UNIT] Translation Service - Six Languages Configuration', () => {
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

  describe('[UNIT] Text-to-Speech Service - Language Support', () => {
    it('should support only languages with real Piper models', () => {
      const supported = TextToSpeechService.getSupportedLanguages();
      // Verified available models: English, Hindi, Malayalam
      // Kannada, Tamil, Telugu: No official Piper models (verified Oct 2026)
      expect(supported).toEqual(['en', 'hi', 'ml']);
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

  describe('[UNIT] AI Adapter - Response Structure Validation (Mocked)', () => {
    it('should generate medical summary with proper structure (mocked)', async () => {
      // Mock the Groq API call to avoid actual API usage - callGroqAPI returns PARSED content
      vi.spyOn(GroqAIAdapter, 'callGroqAPI').mockResolvedValue({
        summary: 'Mock medical summary for testing',
        majorConditions: ['COVID-19 vaccination completed'],
        currentMedications: [],
        recentProcedures: [],
        keyFindings: ['Patient is up to date with vaccinations'],
        disclaimers: [
          'This is an AI-generated summary',
          'Not a replacement for professional medical advice'
        ],
        language: 'en',
        generatedAt: new Date().toISOString()
      });

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
      // AIService adds additional disclaimers, so check that ours are included
      const hasAIDisclaimer = result.disclaimers.some(d => d.includes('AI-generated'));
      expect(hasAIDisclaimer).toBe(true);
    });

    it('should parse and validate Groq response structure (mocked)', async () => {
      // Mock the Groq API call - callGroqAPI returns PARSED content
      vi.spyOn(GroqAIAdapter, 'callGroqAPI').mockResolvedValue({
        summary: 'Mock medical summary',
        majorConditions: ['COVID-19 vaccination completed'],
        currentMedications: [],
        recentProcedures: [],
        keyFindings: [],
        disclaimers: ['This is an AI-generated summary'],
        language: 'en',
        generatedAt: new Date().toISOString()
      });

      const testData = {
        recordCount: 1,
        vaccinations: [{ vaccineName: 'COVID-19' }],
        laboratoryResults: [],
        radiologyRecords: [],
        dischargeSummaries: [],
        encounters: [],
      };

      const result = await AIService.generateMedicalSummary(testData, { language: 'en' });

      // Validate all required fields are present
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('majorConditions');
      expect(result).toHaveProperty('disclaimers');
      expect(Array.isArray(result.majorConditions)).toBe(true);
      expect(Array.isArray(result.disclaimers)).toBe(true);
    });
  });

  describe('[UNIT] Translation - Response Handling (Mocked)', () => {
    it('should translate text between languages (mocked)', async () => {
      // Mock translation response - callGroqAPI returns PARSED content
      vi.spyOn(GroqAIAdapter, 'callGroqAPI').mockResolvedValue({
        translated: 'यह एक परीक्षण चिकित्सा सारांश है',
        targetLanguage: 'hi'
      });

      const text = 'This is a test medical summary';
      const result = await AIService.translateText(text, 'hi', 'en');

      expect(result).toBeDefined();
      expect(result.translated).toBeDefined();
      expect(result.targetLanguage).toBe('hi');
    });
  });

  describe('[UNIT] Simple Explanation - Response Handling (Mocked)', () => {
    it('should generate simple explanations (mocked)', async () => {
      // Mock explanation response - callGroqAPI returns PARSED content
      vi.spyOn(GroqAIAdapter, 'callGroqAPI').mockResolvedValue({
        explanation: 'The patient received a COVID-19 vaccination to help protect against the coronavirus.',
        keyPoints: [
          'Vaccination helps build immunity',
          'Date: 2024-01-15',
          'Follow-up may be needed for booster doses'
        ],
        language: 'en',
        disclaimers: ['AI-generated explanation']
      });

      const medicalContent = 'Patient has received COVID-19 vaccination on 2024-01-15';
      const result = await AIService.generateSimpleExplanation(medicalContent, { language: 'en' });

      expect(result).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(Array.isArray(result.keyPoints)).toBe(true);
      expect(result.keyPoints.length).toBeGreaterThan(0);
    });
  });

  // ===== LIVE INTEGRATION TESTS (Requires Groq API) =====
  describe('[LIVE-INTEGRATION] Groq API - Real External Service Calls', () => {
    // Skip if GROQ_API_KEY not configured
    const groqConfigured = GroqAIAdapter.isReady && GroqAIAdapter.isReady();

    it('should generate real medical summary via Groq API', async () => {
      if (!groqConfigured) {
        console.log('[LIVE-INTEGRATION] Skipped: GROQ_API_KEY not configured');
        return;
      }

      const testData = {
        recordCount: 1,
        vaccinations: [{ vaccineName: 'COVID-19', date: '2024-01-15' }],
        laboratoryResults: [],
        radiologyRecords: [],
        dischargeSummaries: [],
        encounters: [],
      };

      // This WILL call the live Groq API
      const result = await AIService.generateMedicalSummary(testData, { language: 'en' });

      expect(result).toBeDefined();
      expect(result.summary).toBeDefined();
      expect(typeof result.summary).toBe('string');
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('should perform real translation via Groq API', async () => {
      if (!groqConfigured) {
        console.log('[LIVE-INTEGRATION] Skipped: GROQ_API_KEY not configured');
        return;
      }

      const text = 'Patient has completed COVID-19 vaccination';

      // This WILL call the live Groq API
      const result = await AIService.translateText(text, 'hi', 'en');

      expect(result).toBeDefined();
      expect(result.translated).toBeDefined();
      expect(typeof result.translated).toBe('string');
      expect(result.targetLanguage).toBe('hi');
    });

    it('should generate real simple explanation via Groq API', async () => {
      if (!groqConfigured) {
        console.log('[LIVE-INTEGRATION] Skipped: GROQ_API_KEY not configured');
        return;
      }

      const medicalContent = 'Patient has received COVID-19 vaccination on 2024-01-15';

      // This WILL call the live Groq API
      const result = await AIService.generateSimpleExplanation(medicalContent, { language: 'en' });

      expect(result).toBeDefined();
      expect(result.explanation).toBeDefined();
      expect(typeof result.explanation).toBe('string');
    });
  });
});
