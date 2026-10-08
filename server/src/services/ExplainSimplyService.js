import AIService from './AIService.js';
import AuditService from './AuditService.js';
import logger from '../utils/logger.js';

/**
 * Explain Simply Service
 * Converts medical summaries into patient-friendly language
 * Maintains clinical accuracy while improving readability
 */
class ExplainSimplyService {
  /**
   * Generate simple explanation for medical summary
   */
  static async generateSimpleExplanation(summaryId, patientId, requesterId, language = 'en') {
    try {
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
          action: 'ai_explanation_generated',
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

      // Build medical content for explanation
      const medicalContent = this.buildExplainationInput(summary);

      // Call AIService for simple explanation
      logger.info(`Generating simple explanation for summary ${summaryId} in language ${language}`);

      const explanation = await AIService.generateSimpleExplanation(medicalContent, {
        language,
      });

      // Audit the explanation generation
      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'PATIENT',
        action: 'ai_explanation_generated',
        resource: summaryId,
        resourceType: 'ai_summary',
        patient: patientId,
        status: 'success',
        details: {
          language,
          summaryId: summaryId.toString(),
        },
        sensitivityLevel: 'medium',
      });

      return {
        success: true,
        explanation: {
          summaryId,
          patientId,
          language,
          generatedAt: new Date(),
          explanation: explanation.explanation,
          keyPoints: explanation.keyPoints,
          uncertainties: explanation.uncertainties,
          disclaimers: [
            'This is an AI-generated simple explanation of your medical information.',
            'It is intended to help you understand your health situation.',
            'Always consult your healthcare provider for medical decisions.',
          ],
        },
      };
    } catch (error) {
      logger.error(`Explain simply error: ${error.message}`);

      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'SYSTEM',
        action: 'ai_explanation_generated',
        status: 'failure',
        statusMessage: error.message,
        sensitivityLevel: 'medium',
      });

      return {
        success: false,
        error: 'Failed to generate explanation',
        code: 'GENERATION_ERROR',
        details: error.message,
      };
    }
  }

  /**
   * Build explanation input from summary content
   */
  static buildExplainationInput(summary) {
    const content = {
      overview: summary.summaryContent.overview,
      majorConditions: summary.summaryContent.conditions?.active || [],
      medications: summary.summaryContent.currentMedications?.medications || [],
      allergies: summary.summaryContent.allergies?.documented || [],
      recentFindings: [
        ...(summary.summaryContent.laboratoryInvestigations?.recent?.map((l) => `Lab: ${l.testName}`) || []),
        ...(summary.summaryContent.radiologyStudies?.recent?.map((r) => `Imaging: ${r.studyType}`) || []),
      ],
      vaccinationStatus: summary.summaryContent.vaccinations?.completed?.length || 0,
    };

    return JSON.stringify(content, null, 2);
  }

  /**
   * Get or generate explanation with caching
   */
  static async getOrGenerateExplanation(summaryId, patientId, requesterId, language = 'en') {
    // For now, always generate fresh explanations
    // In future, could cache per summary+language combination
    return this.generateSimpleExplanation(summaryId, patientId, requesterId, language);
  }
}

export default ExplainSimplyService;
