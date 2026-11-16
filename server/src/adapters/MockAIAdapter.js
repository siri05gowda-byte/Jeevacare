import logger from '../utils/logger.js';

/**
 * Mock AI Adapter for deterministic testing
 * Returns consistent, predictable responses based on input
 * NOT for production use - strictly for automated tests
 */
class MockAIAdapter {
  constructor() {
    logger.info('MockAIAdapter initialized - FOR TESTING ONLY');
  }

  /**
   * Generate deterministic medical summary for testing
   */
  async generateMedicalSummary(normalizedData, options = {}) {
    const language = options.language || 'en';

    // Deterministic response based on input
    const conditions = normalizedData.laboratoryResults?.length > 0
      ? ['Documented laboratory abnormality']
      : [];

    const medications = normalizedData.laboratoryResults?.length > 0
      ? ['Test medication from lab results']
      : [];

    const summary = this.getLocalizedText(
      'Medical summary based on documented records',
      language
    );

    return {
      summary,
      majorConditions: conditions,
      currentMedications: medications,
      allergies: normalizedData.recordCount > 0 ? ['No allergies documented'] : [],
      vaccinations: [],
      laboratoryFindings: normalizedData.laboratoryResults?.map((l) => l.testName) || [],
      radiologyFindings: normalizedData.radiologyRecords?.map((r) => r.studyType) || [],
      procedures: [],
      importantEvents: [],
      missingInformation: [
        'Complete surgical history',
        'Current symptom status',
      ],
      warnings: [
        'This is a mock AI response for testing only',
      ],
      disclaimers: [
        'Mock AI-generated summary for testing',
        'Not for production use',
      ],
    };
  }

  /**
   * Generate deterministic simple explanation
   */
  async generateSimpleExplanation(medicalContent, options = {}) {
    const language = options.language || 'en';

    const explanation = this.getLocalizedText(
      'This is a simplified explanation of the medical information.',
      language
    );

    return {
      explanation,
      keyPoints: [
        'Important medical information has been documented',
        'Consult a healthcare professional for interpretation',
      ],
      uncertainties: [
        'Some clinical details may require professional review',
      ],
    };
  }

  /**
   * Deterministic translation
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    // Deterministic mock translation
    const translations = {
      en: text,
      hi: `[Hindi] ${text}`,
      kn: `[Kannada] ${text}`,
      te: `[Telugu] ${text}`,
      ta: `[Tamil] ${text}`,
      ml: `[Malayalam] ${text}`,
    };

    return {
      original: text,
      translated: translations[targetLanguage] || text,
      targetLanguage,
      sourceLanguage,
      confidence: 0.95,
    };
  }

  /**
   * Helper to get localized text for testing
   */
  getLocalizedText(englishText, language) {
    const localizations = {
      en: englishText,
      hi: `[Hindi] ${englishText}`,
      kn: `[Kannada] ${englishText}`,
      te: `[Telugu] ${englishText}`,
      ta: `[Tamil] ${englishText}`,
      ml: `[Malayalam] ${englishText}`,
    };

    return localizations[language] || englishText;
  }

  /**
   * Check if ready
   */
  isReady() {
    return true; // Always ready for testing
  }

  /**
   * Get status
   */
  getStatus() {
    return {
      configured: true,
      provider: 'Mock',
      model: 'mock-test',
      isTest: true,
    };
  }
}

export default new MockAIAdapter();
