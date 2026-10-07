import config from '../config/index.js';
import logger from '../utils/logger.js';
import { ExternalServiceError } from '../utils/errors.js';

class AIServiceAdapter {
  constructor() {
    this.isConfigured = config.aiService.enabled;
    this.url = config.aiService.url;
    this.apiKey = config.aiService.apiKey;
    this.model = config.aiService.model;

    if (this.isConfigured) {
      logger.info(`AI service adapter initialized with model: ${this.model}`);
    } else {
      logger.warn('AI service adapter not enabled. Operating in demo mode.');
    }
  }

  /**
   * Generate medical history summary
   * Input: array of clinical records
   * Output: structured summary text
   */
  async generateMedicalSummary(clinicalRecords, patient, options = {}) {
    try {
      const language = options.language || 'en';

      if (!this.isConfigured) {
        return this.mockMedicalSummary(clinicalRecords, language);
      }

      // Real AI call would happen here
      return this.mockMedicalSummary(clinicalRecords, language);
    } catch (error) {
      logger.error(`AI medical summary error: ${error.message}`);
      throw new ExternalServiceError('AI Service', error.message);
    }
  }

  /**
   * Generate explanation for a medical report
   */
  async generateReportExplanation(report, options = {}) {
    try {
      const language = options.language || 'en';
      const reportType = options.reportType || 'general';

      if (!this.isConfigured) {
        return this.mockReportExplanation(report, language, reportType);
      }

      // Real AI call would happen here
      return this.mockReportExplanation(report, language, reportType);
    } catch (error) {
      logger.error(`AI report explanation error: ${error.message}`);
      throw new ExternalServiceError('AI Service', error.message);
    }
  }

  /**
   * Generate explanation for radiology report
   */
  async generateRadiologyExplanation(radiologyReport, options = {}) {
    try {
      const language = options.language || 'en';

      if (!this.isConfigured) {
        return this.mockRadiologyExplanation(radiologyReport, language);
      }

      // Real AI call would happen here
      return this.mockRadiologyExplanation(radiologyReport, language);
    } catch (error) {
      logger.error(`AI radiology explanation error: ${error.message}`);
      throw new ExternalServiceError('AI Service', error.message);
    }
  }

  /**
   * Translate text to another language
   */
  async translateText(text, targetLanguage, sourceLanguage = 'en') {
    try {
      if (!this.isConfigured) {
        return this.mockTranslation(text, targetLanguage);
      }

      // Real translation call would happen here
      return this.mockTranslation(text, targetLanguage);
    } catch (error) {
      logger.error(`AI translation error: ${error.message}`);
      throw new ExternalServiceError('AI Service', error.message);
    }
  }

  /**
   * Mock medical summary for development
   */
  mockMedicalSummary(records, language = 'en') {
    const summaries = {
      en: {
        summary: 'Based on available medical records, this patient has...',
        majorConditions: ['Hypertension', 'Type 2 Diabetes'],
        currentMedications: ['Metformin', 'Lisinopril'],
        recentHospitalizations: ['General medical management'],
        importantAlerts: ['Allergy to Penicillin'],
      },
      hi: {
        summary: 'उपलब्ध चिकित्सा रिकॉर्ड के आधार पर...',
        majorConditions: ['उच्च रक्तचाप', 'टाइप 2 मधुमेह'],
        currentMedications: ['मेटफॉर्मिन', 'लिसिनोप्रिल'],
      },
    };

    return {
      summary: summaries[language]?.summary || summaries.en.summary,
      majorConditions: summaries[language]?.majorConditions || [],
      currentMedications: summaries[language]?.currentMedications || [],
      sourceRecords: records.length,
      generatedAt: new Date(),
      isDemo: true,
      disclaimers: ['This is an AI-generated summary and not a substitute for professional medical advice'],
    };
  }

  /**
   * Mock report explanation
   */
  mockReportExplanation(report, language = 'en', reportType = 'general') {
    return {
      title: 'Medical Report Explanation',
      explanation: 'This report shows normal findings with no significant abnormalities detected.',
      keyFindings: ['Normal structure observed', 'No acute pathology'],
      recommendations: ['Continue regular follow-up', 'Maintain current management'],
      language,
      generatedAt: new Date(),
      isDemo: true,
      sourceReport: report._id?.toString(),
      disclaimers: ['This explanation is AI-generated and for informational purposes only'],
    };
  }

  /**
   * Mock radiology explanation
   */
  mockRadiologyExplanation(report, language = 'en') {
    return {
      title: 'Radiology Report Explanation',
      simplifiedFindings: 'The imaging shows normal anatomy without any concerning features.',
      technicalSummary: 'No acute pulmonary or cardiac abnormalities.',
      whatItMeans: 'Your imaging appears normal and does not show signs of disease.',
      nextSteps: 'Continue routine follow-up care as recommended by your physician.',
      language,
      generatedAt: new Date(),
      isDemo: true,
      sourceReport: report._id?.toString(),
      disclaimers: [
        'This is an AI-generated explanation and not a medical diagnosis',
        'Always consult with a qualified radiologist for definitive interpretation',
      ],
    };
  }

  /**
   * Mock translation
   */
  mockTranslation(text, targetLanguage) {
    // Simple mock translation (in production would use real translation service)
    const translations = {
      hi: '[Hindi translation: ' + text + ']',
      kn: '[Kannada translation: ' + text + ']',
      te: '[Telugu translation: ' + text + ']',
      ta: '[Tamil translation: ' + text + ']',
      ml: '[Malayalam translation: ' + text + ']',
    };

    return {
      original: text,
      translated: translations[targetLanguage] || text,
      targetLanguage,
      sourceLanguage: 'en',
      translatedAt: new Date(),
      isDemo: true,
    };
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
      provider: 'AI Service',
      model: this.model,
      url: this.url,
    };
  }
}

export default new AIServiceAdapter();
