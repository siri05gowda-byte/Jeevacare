import GroqAIAdapter from '../adapters/GroqAIAdapter.js';
import MockAIAdapter from '../adapters/MockAIAdapter.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

/**
 * AIService - Provider-agnostic abstraction layer
 * Routes AI requests to appropriate adapter (Groq or Mock)
 * Never exposes API keys to frontend
 * Validates structured responses
 */
class AIService {
  constructor() {
    this.adapter = null;
    this.initializeAdapter();
  }

  /**
   * Initialize appropriate adapter based on environment
   */
  initializeAdapter() {
    // Use Groq if configured, otherwise use Mock
    if (GroqAIAdapter.isReady()) {
      this.adapter = GroqAIAdapter;
      logger.info('AIService: Using GroqAIAdapter for real AI');
    } else {
      this.adapter = MockAIAdapter;
      logger.info('AIService: Using MockAIAdapter for testing/demo');
    }
  }

  /**
   * Generate medical history summary
   * Accepts normalized clinical data
   * Returns structured summary with disclaimers
   */
  async generateMedicalSummary(normalizedData, options = {}) {
    try {
      if (!this.adapter) {
        throw new Error('No AI adapter initialized');
      }

      logger.info(`AIService: Generating medical summary (${this.adapter.getStatus().provider})`);

      const result = await this.adapter.generateMedicalSummary(normalizedData, options);

      // Validate response structure
      this.validateMedicalSummary(result);

      return result;
    } catch (error) {
      logger.error(`AIService medical summary error: ${error.message}`);

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('AIService', error.message);
    }
  }

  /**
   * Generate simple patient-friendly explanation
   */
  async generateSimpleExplanation(medicalContent, options = {}) {
    try {
      if (!this.adapter) {
        throw new Error('No AI adapter initialized');
      }

      logger.info(`AIService: Generating simple explanation (${this.adapter.getStatus().provider})`);

      const result = await this.adapter.generateSimpleExplanation(medicalContent, options);

      // Validate response structure
      this.validateSimpleExplanation(result);

      return result;
    } catch (error) {
      logger.error(`AIService simple explanation error: ${error.message}`);

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('AIService', error.message);
    }
  }

  /**
   * Translate text between languages
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en', options = {}) {
    try {
      if (!this.adapter) {
        throw new Error('No AI adapter initialized');
      }

      logger.info(
        `AIService: Translating from ${sourceLanguage} to ${targetLanguage} (${this.adapter.getStatus().provider})`
      );

      const result = await this.adapter.translateText(text, targetLanguage, sourceLanguage);

      // Validate response structure
      this.validateTranslation(result);

      return result;
    } catch (error) {
      logger.error(`AIService translation error: ${error.message}`);

      if (error instanceof ExternalServiceError) {
        throw error;
      }

      throw new ExternalServiceError('AIService', error.message);
    }
  }

  /**
   * Validate medical summary structure
   */
  validateMedicalSummary(summary) {
    if (!summary || typeof summary !== 'object') {
      throw new Error('Invalid medical summary: not an object');
    }

    if (!summary.summary || typeof summary.summary !== 'string') {
      throw new Error('Invalid medical summary: missing or invalid summary field');
    }

    if (!Array.isArray(summary.disclaimers)) {
      throw new Error('Invalid medical summary: missing disclaimers');
    }

    if (summary.disclaimers.length === 0) {
      throw new Error('Invalid medical summary: disclaimers cannot be empty');
    }

    // Check for hallucination: "has no X" instead of "no X documented"
    const hallucinations = [
      'patient has no allergies',
      'patient has no medications',
      'patient has no conditions',
      'patient has no procedures',
    ];

    const summaryText = JSON.stringify(summary).toLowerCase();
    for (const hallucination of hallucinations) {
      if (summaryText.includes(hallucination)) {
        logger.warn(`Potential hallucination detected: "${hallucination}"`);
        throw new Error(`Invalid medical summary: ${hallucination} (missing "documented")`);
      }
    }

    return true;
  }

  /**
   * Validate simple explanation structure
   */
  validateSimpleExplanation(explanation) {
    if (!explanation || typeof explanation !== 'object') {
      throw new Error('Invalid explanation: not an object');
    }

    if (!explanation.explanation || typeof explanation.explanation !== 'string') {
      throw new Error('Invalid explanation: missing or invalid explanation field');
    }

    if (!Array.isArray(explanation.keyPoints)) {
      throw new Error('Invalid explanation: missing keyPoints array');
    }

    return true;
  }

  /**
   * Validate translation structure
   */
  validateTranslation(translation) {
    if (!translation || typeof translation !== 'object') {
      throw new Error('Invalid translation: not an object');
    }

    if (!translation.translated || typeof translation.translated !== 'string') {
      throw new Error('Invalid translation: missing or invalid translated field');
    }

    if (!translation.targetLanguage) {
      throw new Error('Invalid translation: missing targetLanguage');
    }

    return true;
  }

  /**
   * Get current adapter status
   */
  getStatus() {
    if (!this.adapter) {
      return { error: 'No adapter initialized' };
    }

    return this.adapter.getStatus();
  }

  /**
   * Check if AI service is ready
   */
  isReady() {
    return this.adapter && this.adapter.isReady();
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages() {
    return ['en', 'hi', 'kn', 'te', 'ta', 'ml'];
  }
}

export default new AIService();
