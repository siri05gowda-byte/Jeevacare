import AIHistorySummary from '../models/AIHistorySummary.js';
import AIService from './AIService.js';
import AuditService from './AuditService.js';
import ClinicalAuthorizationBoundary from '../utils/clinicalAuthorizationBoundary.js';
import VaccinationService from './VaccinationService.js';
import LaboratoryService from './LaboratoryService.js';
import RadiologyService from './RadiologyService.js';
import DischargeSummaryService from './DischargeSummaryService.js';
import EncounterService from './EncounterService.js';
import logger from '../utils/logger.js';

class AIHistorySummaryService {
  /**
   * Generate AI medical history summary for authorized patient
   * Respects authorization boundary
   */
  static async generateMedicalSummary(requesterId, patientId, options = {}) {
    try {
      // ===== STEP 1: AUTHORIZATION =====
      const authResult = await ClinicalAuthorizationBoundary.canAccessPatientRecords(requesterId, patientId);

      if (!authResult.authorized) {
        await AuditService.logEvent({
          actor: requesterId,
          actorRole: 'SYSTEM',
          action: 'ai_summary_generated',
          resource: patientId,
          resourceType: 'patient',
          patient: patientId,
          status: 'denied',
          statusMessage: `Authorization failed: ${authResult.error}`,
          sensitivityLevel: 'high',
          details: {
            failedCheck: authResult.error,
          },
        });

        return {
          success: false,
          error: 'Not authorized to access patient records',
          code: 'UNAUTHORIZED',
        };
      }

      const requester = authResult.user;
      const language = options.language || 'en';

      // ===== STEP 2: CHECK FOR CACHED SUMMARY =====
      if (!options.regenerate) {
        const cached = await AIHistorySummary.findOne({
          patientId,
          language,
          cacheStatus: 'fresh',
          expiresAt: { $gt: new Date() },
          status: 'active',
        }).sort({ generatedAt: -1 });

        if (cached) {
          logger.info(
            `Returning cached AI summary for patient ${patientId} in language ${language}`
          );

          await AuditService.logEvent({
            actor: requesterId,
            actorRole: requester.role || 'PATIENT',
            action: 'ai_summary_accessed',
            resource: cached._id.toString(),
            resourceType: 'ai_summary',
            patient: patientId,
            status: 'success',
            details: {
              cached: true,
              language,
              sourceRecordCount: cached.metadata?.sourceRecordCount || 0,
            },
            sensitivityLevel: 'medium',
          });

          return {
            success: true,
            summary: cached,
            fromCache: true,
          };
        }
      }

      // ===== STEP 3: RETRIEVE AUTHORIZED CLINICAL RECORDS =====
      logger.info(`Retrieving authorized clinical records for patient ${patientId}`);

      const [vaccinations, labResults, radiologyRecords, dischargeSummaries, encounters] = await Promise.all([
        VaccinationService.getPatientVaccinations(patientId),
        LaboratoryService.getPatientLaboratoryResults(patientId),
        RadiologyService.getPatientRadiologyRecords(patientId),
        DischargeSummaryService.getPatientDischargeSummaries(patientId),
        EncounterService.getPatientEncounters(patientId),
      ]);

      // ===== STEP 4: NORMALIZE RECORDS INTO STRUCTURED FORMAT =====
      const sourceRecords = this.normalizeSourceRecords(
        vaccinations,
        labResults,
        radiologyRecords,
        dischargeSummaries,
        encounters
      );

      const normalizedData = this.buildNormalizedClinicalData(
        sourceRecords,
        vaccinations,
        labResults,
        radiologyRecords,
        dischargeSummaries,
        encounters
      );

      // ===== STEP 5: BUILD CONSTRAINED AI INPUT =====
      const aiInput = this.buildAIPrompt(normalizedData, language);

      // ===== STEP 6: CALL AI ADAPTER =====
      logger.info(`Calling AI service to generate summary for patient ${patientId}`);

      const generationStartTime = Date.now();

      const aiResponse = await AIService.generateMedicalSummary(normalizedData, {
        language,
      });

      const generationDuration = Date.now() - generationStartTime;

      // ===== STEP 7: VALIDATE AI RESPONSE STRUCTURE =====
      const validation = this.validateAIResponse(aiResponse);

      if (!validation.valid) {
        logger.error(
          `AI response validation failed for patient ${patientId}: ${validation.error}`
        );

        // Log failed generation
        await AuditService.logEvent({
          actor: requesterId,
          actorRole: requester.role || 'PATIENT',
          action: 'ai_summary_generated',
          resource: patientId,
          resourceType: 'patient',
          patient: patientId,
          status: 'failure',
          statusMessage: `AI response validation failed: ${validation.error}`,
          sensitivityLevel: 'medium',
          details: {
            validationError: validation.error,
            sourceRecordCount: sourceRecords.length,
          },
        });

        return {
          success: false,
          error: 'Failed to validate AI response',
          code: 'VALIDATION_ERROR',
        };
      }

      // ===== STEP 8: ATTACH SOURCE REFERENCES =====
      const summaryWithSources = this.attachSourceReferences(aiResponse, sourceRecords);

      // ===== STEP 9: CREATE SUMMARY DOCUMENT =====
      const summary = new AIHistorySummary({
        patientId,
        requestedBy: requesterId,
        requestedByRole: requester.role || 'PATIENT',
        language,
        summaryType: 'medical_summary',
        sourceRecordIds: sourceRecords,
        sourceDataVersion: new Date(),
        summaryContent: summaryWithSources,
        cacheStatus: 'fresh',
        generationStatus: 'success',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        modelInfo: {
          provider: AIService.getStatus().provider,
          model: AIService.getStatus().model,
          isDemo: AIService.getStatus().provider === 'Mock',
        },
        metadata: {
          sourceRecordCount: sourceRecords.length,
          sourceRecordTypes: [...new Set(sourceRecords.map((r) => r.recordType))],
          generationDurationMs: generationDuration,
          tokenEstimate: aiInput.split(' ').length * 1.3, // Rough estimate
        },
      });

      await summary.save();

      // ===== STEP 10: AUDIT GENERATION =====
      const auditEvent = await AuditService.logEvent({
        actor: requesterId,
        actorRole: requester.role || 'PATIENT',
        action: 'ai_summary_generated',
        resource: summary._id.toString(),
        resourceType: 'ai_summary',
        patient: patientId,
        status: 'success',
        details: {
          language,
          sourceRecordCount: sourceRecords.length,
          sourceRecordTypes: [...new Set(sourceRecords.map((r) => r.recordType))],
          generationDurationMs: generationDuration,
          isDemo: summary.modelInfo.isDemo,
        },
        sensitivityLevel: 'medium',
      });

      // Link audit event to summary
      summary.auditEventId = auditEvent._id;
      await summary.save();

      logger.info(`Successfully generated AI summary for patient ${patientId}`);

      // ===== STEP 11: RETURN STRUCTURED RESULT =====
      return {
        success: true,
        summary,
        fromCache: false,
        metadata: {
          sourceRecordCount: sourceRecords.length,
          generationDurationMs: generationDuration,
          isDemo: summary.modelInfo.isDemo,
        },
      };
    } catch (error) {
      logger.error(`AI summary generation error for patient ${patientId}: ${error.message}`);

      // Log error
      await AuditService.logEvent({
        actor: requesterId,
        actorRole: 'SYSTEM',
        action: 'ai_summary_generated',
        resource: patientId,
        resourceType: 'patient',
        patient: patientId,
        status: 'failure',
        statusMessage: `Exception: ${error.message}`,
        sensitivityLevel: 'medium',
        details: {
          error: error.message,
        },
      });

      return {
        success: false,
        error: 'Failed to generate AI summary',
        code: 'GENERATION_ERROR',
        details: error.message,
      };
    }
  }

  /**
   * Normalize source records into structured array with metadata
   */
  static normalizeSourceRecords(vaccinations, labResults, radiologyRecords, dischargeSummaries, encounters) {
    const sources = [];

    // Add vaccinations
    if (vaccinations && vaccinations.length > 0) {
      vaccinations.forEach((v) => {
        sources.push({
          recordId: v._id,
          recordType: 'vaccination',
          recordTimestamp: v.administeredDate || v.createdAt,
        });
      });
    }

    // Add lab results
    if (labResults && labResults.length > 0) {
      labResults.forEach((l) => {
        sources.push({
          recordId: l._id,
          recordType: 'laboratory_result',
          recordTimestamp: l.testDate || l.createdAt,
        });
      });
    }

    // Add radiology records
    if (radiologyRecords && radiologyRecords.length > 0) {
      radiologyRecords.forEach((r) => {
        sources.push({
          recordId: r._id,
          recordType: 'radiology_record',
          recordTimestamp: r.studyDate || r.createdAt,
        });
      });
    }

    // Add discharge summaries
    if (dischargeSummaries && dischargeSummaries.length > 0) {
      dischargeSummaries.forEach((d) => {
        sources.push({
          recordId: d._id,
          recordType: 'discharge_summary',
          recordTimestamp: d.dischargeDate || d.createdAt,
        });
      });
    }

    // Add encounters
    if (encounters && encounters.length > 0) {
      encounters.forEach((e) => {
        sources.push({
          recordId: e._id,
          recordType: 'encounter',
          recordTimestamp: e.date || e.createdAt,
        });
      });
    }

    // Sort by timestamp descending
    sources.sort((a, b) => (b.recordTimestamp || new Date(0)) - (a.recordTimestamp || new Date(0)));

    return sources;
  }

  /**
   * Build normalized clinical data structure for AI processing
   */
  static buildNormalizedClinicalData(sourceRecords, vaccinations, labResults, radiologyRecords, dischargeSummaries, encounters) {
    return {
      sourceRecords,
      vaccinations: vaccinations || [],
      laboratoryResults: labResults || [],
      radiologyRecords: radiologyRecords || [],
      dischargeSummaries: dischargeSummaries || [],
      encounters: encounters || [],
      recordCount: sourceRecords.length,
      recordTypes: [...new Set(sourceRecords.map((r) => r.recordType))],
    };
  }

  /**
   * Build AI prompt from normalized data
   */
  static buildAIPrompt(normalizedData, language) {
    const languageInstruction = language !== 'en' ? `Provide the summary in ${language}. ` : '';

    return `${languageInstruction}Generate a structured medical history summary based on the following clinical records. 
    
CRITICAL SAFETY GUIDELINES:
- Only summarize information that is explicitly documented in the records.
- Do NOT invent, fabricate, or assume any medical information.
- Do NOT create or suggest diagnoses.
- Do NOT recommend treatments or medications.
- If information is missing or unclear, explicitly state that it is not documented.
- Always indicate data sources when summarizing specific findings.
- Include disclaimers that this is an AI-generated summary for information only.

Records: ${JSON.stringify(normalizedData, null, 2)}

Organize the summary into these sections:
- Overview (basic patient information)
- Allergies (documented only)
- Current Medications
- Major Conditions (diagnosed, documented)
- Vaccination History
- Recent Laboratory Investigations
- Recent Radiology Studies
- Previous Procedures/Surgeries
- Hospitalizations
- Recent Consultations
- Discharge/Follow-up Information
- Important Events
- Missing Information (fields with no documentation)

Format as structured JSON.`;
  }

  /**
   * Validate AI response structure
   */
  static validateAIResponse(aiResponse) {
    if (!aiResponse) {
      return { valid: false, error: 'No response from AI service' };
    }

    // Check if response is object
    if (typeof aiResponse !== 'object') {
      return { valid: false, error: 'AI response is not an object' };
    }

    // Check for required fields
    if (!aiResponse.summary && !aiResponse.majorConditions) {
      return { valid: false, error: 'AI response missing expected fields' };
    }

    // Check for suspicious content
    if (aiResponse.summary && typeof aiResponse.summary.toLowerCase().includes('diagnosis:')) {
      logger.warn('AI response contains potential diagnosis statement');
    }

    return { valid: true };
  }

  /**
   * Attach source references to AI response
   */
  static attachSourceReferences(aiResponse, sourceRecords) {
    // Preserve original structure and add source references
    return {
      ...aiResponse,
      sourceRecords: sourceRecords.map((s) => ({
        recordId: s.recordId,
        recordType: s.recordType,
        timestamp: s.recordTimestamp,
      })),
    };
  }

  /**
   * Get cached summary or generate new one
   */
  static async getSummary(requesterId, patientId, language = 'en', regenerate = false) {
    if (regenerate) {
      return this.generateMedicalSummary(requesterId, patientId, { language, regenerate: true });
    }

    // Try to get cached summary
    const cached = await AIHistorySummary.findOne({
      patientId,
      language,
      cacheStatus: 'fresh',
      expiresAt: { $gt: new Date() },
      status: 'active',
    }).sort({ generatedAt: -1 });

    if (cached) {
      return {
        success: true,
        summary: cached,
        fromCache: true,
      };
    }

    // Generate new summary
    return this.generateMedicalSummary(requesterId, patientId, { language });
  }

  /**
   * Mark summary as stale when source records change
   */
  static async markSummariesAsStale(patientId) {
    const updated = await AIHistorySummary.updateMany(
      {
        patientId,
        cacheStatus: 'fresh',
        status: 'active',
      },
      {
        cacheStatus: 'stale',
        expiresAt: new Date(),
      }
    );

    logger.info(
      `Marked ${updated.modifiedCount} AI summaries as stale for patient ${patientId}`
    );

    return updated;
  }

  /**
   * Get summary status for UI
   */
  static async getSummaryStatus(patientId, language = 'en') {
    const summary = await AIHistorySummary.findOne({
      patientId,
      language,
      status: 'active',
    }).sort({ generatedAt: -1 });

    if (!summary) {
      return {
        hasSummary: false,
        isFresh: false,
        cacheStatus: 'none',
      };
    }

    return {
      hasSummary: true,
      isFresh: summary.cacheStatus === 'fresh' && summary.expiresAt > new Date(),
      cacheStatus: summary.cacheStatus,
      generatedAt: summary.generatedAt,
      expiresAt: summary.expiresAt,
      language: summary.language,
      sourceRecordCount: summary.metadata?.sourceRecordCount || 0,
    };
  }
}

export default AIHistorySummaryService;
