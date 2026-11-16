import AIService from './AIService.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

/**
 * Translation Service
 * Translates medical content to 6 supported languages
 * Preserves original source text, never overwrites clinical records
 * Translation is strictly a presentation layer
 */
class TranslationService {
  static SUPPORTED_LANGUAGES = ['en', 'hi', 'kn', 'te', 'ta', 'ml'];

  static LANGUAGE_NAMES = {
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    te: 'తెలుగు',
    ta: 'தமிழ்',
    ml: 'മലയാളം',
  };

  /**
   * Translate medical summary to target language
   * Source text remains unchanged
   */
  static async translateSummary(summaryId, patientId, requesterId, targetLanguage) {
    try {
      // Validate target language
      if (!this.SUPPORTED_LANGUAGES.includes(targetLanguage)) {
        return {
          success: false,
          error: `Unsupported language: ${targetLanguage}`,
          code: 'INVALID_LANGUAGE',
          supportedLanguages: this.SUPPORTED_LANGUAGES,
        };
      }

      // Get the summary
      const AIHistorySummary = (await import('../models/AIHistorySummary.js')).default;
      const summary = await AIHistorySummary.findOne({
        _id: summaryId,
        patientId,
        status: 'active',
      });

      if (!summary) {
        await AuditService.logEvent({
          actor: requesterId,
          actorRole: 'SYSTEM',
          action: 'ai_translation_generated',
          status: 'denied',
          statusMessage: 'Summary not found',
          sensitivityLevel: 'medium',
        });

        return {
          success: false,
          error: 'Summary not found',
          code: 'NOT_FOUND',
        };
      }

      // If source language matches target, return as-is
      if (summary.language === targetLanguage) {
        logger.info(`Summary already in ${targetLanguage}, returning original`);
        return {
          success: true,
          translation: {
            summaryId,
            sourceLanguage: summary.language,
            targetLanguage,
            isSameLanguage: true,
            content: summary.summaryContent,
            generatedAt: summary.generatedAt,
          },
        };
      }

      // Build content for translation
      const contentToTranslate = this.buildTranslationContent(summary);

      logger.info(
        `Translating summary ${summaryId} from ${summary.language} to ${targetLanguage}`
      );

      // Call AIService for translation
      const translation = await AIService.translateText(
        contentToTranslate,
        targetLanguage,
        summary.language
      );

      // Audit translation
      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'PATIENT',
        action: 'ai_translation_generated',
        resource: summaryId,
        resourceType: 'ai_summary',
        patient: patientId,
        status: 'success',
        details: {
          sourceLanguage: summary.language,
          targetLanguage,
          summaryId: summaryId.toString(),
          confidence: translation.confidence,
        },
        sensitivityLevel: 'low',
      });

      // Parse translated content
      let translatedContent = {};
      try {
        translatedContent = JSON.parse(translation.translated);
      } catch {
        // If not JSON, create structured response
        translatedContent = { translatedSummary: translation.translated };
      }

      return {
        success: true,
        translation: {
          summaryId,
          sourceLanguage: summary.language,
          targetLanguage,
          sourceName: this.LANGUAGE_NAMES[summary.language],
          targetName: this.LANGUAGE_NAMES[targetLanguage],
          content: translatedContent,
          confidence: translation.confidence,
          generatedAt: new Date(),
          disclaimer: `Translated from ${this.LANGUAGE_NAMES[summary.language]} to ${this.LANGUAGE_NAMES[targetLanguage]}. Original clinical records remain in ${this.LANGUAGE_NAMES[summary.language]}.`,
        },
      };
    } catch (error) {
      logger.error(`Translation error: ${error.message}`);

      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'SYSTEM',
        action: 'ai_translation_generated',
        status: 'failure',
        statusMessage: error.message,
        sensitivityLevel: 'medium',
      });

      return {
        success: false,
        error: 'Failed to translate',
        code: 'TRANSLATION_ERROR',
        details: error.message,
      };
    }
  }

  /**
   * Translate explanation text
   */
  static async translateExplanation(explanationText, sourceLanguage, targetLanguage, patientId, requesterId) {
    try {
      // Validate languages
      if (!this.SUPPORTED_LANGUAGES.includes(targetLanguage)) {
        return {
          success: false,
          error: `Unsupported language: ${targetLanguage}`,
          supportedLanguages: this.SUPPORTED_LANGUAGES,
        };
      }

      if (sourceLanguage === targetLanguage) {
        return {
          success: true,
          translation: {
            original: explanationText,
            translated: explanationText,
            sourceLanguage,
            targetLanguage,
            isSameLanguage: true,
          },
        };
      }

      logger.info(`Translating explanation from ${sourceLanguage} to ${targetLanguage}`);

      const translation = await AIService.translateText(
        explanationText,
        targetLanguage,
        sourceLanguage
      );

      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'PATIENT',
        action: 'ai_translation_generated',
        patient: patientId,
        status: 'success',
        details: {
          sourceLanguage,
          targetLanguage,
          type: 'explanation',
        },
        sensitivityLevel: 'low',
      });

      return {
        success: true,
        translation: {
          original: explanationText,
          translated: translation.translated,
          sourceLanguage,
          targetLanguage,
          confidence: translation.confidence,
        },
      };
    } catch (error) {
      logger.error(`Explanation translation error: ${error.message}`);

      return {
        success: false,
        error: 'Failed to translate explanation',
        details: error.message,
      };
    }
  }

  /**
   * Build content for translation
   * Extracts relevant fields from summary
   */
  static buildTranslationContent(summary) {
    const content = {
      summary: summary.summaryContent.overview?.patientName
        ? `Patient: ${summary.summaryContent.overview.patientName}`
        : 'Patient Medical Summary',
      majorConditions: summary.summaryContent.conditions?.active || [],
      medications: summary.summaryContent.currentMedications?.medications?.map((m) => m.name) || [],
      allergies: summary.summaryContent.allergies?.documented || [],
      recentLabs: summary.summaryContent.laboratoryInvestigations?.recent?.map((l) => l.testName) || [],
      recentImaging: summary.summaryContent.radiologyStudies?.recent?.map((r) => r.studyType) || [],
      recentVisits: summary.summaryContent.consultations?.recent?.length || 0,
    };

    return JSON.stringify(content, null, 2);
  }

  /**
   * Get supported languages
   */
  static getSupportedLanguages() {
    return this.SUPPORTED_LANGUAGES.map((code) => ({
      code,
      name: this.LANGUAGE_NAMES[code],
    }));
  }

  /**
   * Validate language code
   */
  static isLanguageSupported(languageCode) {
    return this.SUPPORTED_LANGUAGES.includes(languageCode);
  }
}

export default TranslationService;
