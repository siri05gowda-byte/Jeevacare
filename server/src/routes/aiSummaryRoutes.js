import express from 'express';
import AIHistorySummaryService from '../services/AIHistorySummaryService.js';
import ExplainSimplyService from '../services/ExplainSimplyService.js';
import TranslationService from '../services/TranslationService.js';
import TextToSpeechService from '../services/TextToSpeechService.js';
import { authMiddleware as authenticateUser } from '../middleware/authentication.js';
import logger from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/v1/patients/:patientId/ai-summary
 * Generate or retrieve cached AI medical history summary
 */
router.post('/:patientId/ai-summary', authenticateUser, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { language = 'en', regenerate = false } = req.body;
    const requesterId = req.user._id;

    logger.info(
      `AI summary request for patient ${patientId} by user ${requesterId} in language ${language}`
    );

    // Validate language
    if (!['en', 'hi', 'kn', 'te', 'ta', 'ml'].includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
        supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
      });
    }

    // Generate or retrieve summary
    const result = await AIHistorySummaryService.generateMedicalSummary(requesterId, patientId, {
      language,
      regenerate,
    });

    if (!result.success) {
      logger.warn(`AI summary generation failed for patient ${patientId}: ${result.error}`);
      return res.status(result.code === 'UNAUTHORIZED' ? 403 : 500).json({
        success: false,
        error: result.error,
        code: result.code,
      });
    }

    // Return summary (exclude sensitive internal fields)
    return res.json({
      success: true,
      summary: {
        _id: result.summary._id,
        patientId: result.summary.patientId,
        language: result.summary.language,
        generatedAt: result.summary.generatedAt,
        summaryContent: result.summary.summaryContent,
        disclaimers: result.summary.disclaimers,
        modelInfo: result.summary.modelInfo,
        cacheStatus: result.summary.cacheStatus,
        sourceRecordCount: result.summary.metadata?.sourceRecordCount || 0,
        fromCache: result.fromCache,
      },
      metadata: result.metadata,
    });
  } catch (error) {
    logger.error(`AI summary route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'SERVER_ERROR',
    });
  }
});

/**
 * GET /api/v1/patients/:patientId/ai-summary/status
 * Get summary status (generation time, cache status, staleness)
 */
router.get('/:patientId/ai-summary/status', authenticateUser, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { language = 'en' } = req.query;
    const requesterId = req.user._id;

    logger.info(
      `AI summary status request for patient ${patientId} by user ${requesterId} in language ${language}`
    );

    // Verify authorization to access patient records
    const { authorized } = await require('../utils/clinicalAuthorizationBoundary.js').default.canAccessPatientRecords(
      requesterId,
      patientId
    );

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access patient records',
      });
    }

    // Get status
    const status = await AIHistorySummaryService.getSummaryStatus(patientId, language);

    return res.json({
      success: true,
      status,
    });
  } catch (error) {
    logger.error(`AI summary status route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/patients/:patientId/ai-summary/:summaryId
 * Retrieve a specific summary by ID
 */
router.get('/:patientId/ai-summary/:summaryId', authenticateUser, async (req, res) => {
  try {
    const { patientId, summaryId } = req.params;
    const requesterId = req.user._id;

    logger.info(
      `Retrieving AI summary ${summaryId} for patient ${patientId} by user ${requesterId}`
    );

    const AIHistorySummary = require('../models/AIHistorySummary.js').default;

    // Verify authorization
    const { authorized } = await require('../utils/clinicalAuthorizationBoundary.js').default.canAccessPatientRecords(
      requesterId,
      patientId
    );

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized to access patient records',
      });
    }

    // Fetch summary
    const summary = await AIHistorySummary.findOne({
      _id: summaryId,
      patientId,
      status: 'active',
    });

    if (!summary) {
      return res.status(404).json({
        success: false,
        error: 'Summary not found',
      });
    }

    return res.json({
      success: true,
      summary: {
        _id: summary._id,
        patientId: summary.patientId,
        language: summary.language,
        generatedAt: summary.generatedAt,
        summaryContent: summary.summaryContent,
        disclaimers: summary.disclaimers,
        modelInfo: summary.modelInfo,
        cacheStatus: summary.cacheStatus,
        sourceRecordCount: summary.metadata?.sourceRecordCount || 0,
      },
    });
  } catch (error) {
    logger.error(`AI summary retrieval route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/patients/:patientId/ai-summary/:summaryId/explain
 * Generate patient-friendly explanation of summary
 */
router.post('/:patientId/ai-summary/:summaryId/explain', authenticateUser, async (req, res) => {
  try {
    const { patientId, summaryId } = req.params;
    const { language = 'en' } = req.body;
    const requesterId = req.user._id;

    logger.info(
      `Explain simply request for summary ${summaryId} in language ${language}`
    );

    // Validate language
    if (!['en', 'hi', 'kn', 'te', 'ta', 'ml'].includes(language)) {
      return res.status(400).json({
        success: false,
        error: 'Unsupported language',
      });
    }

    // Verify authorization
    const { authorized } = await require('../utils/clinicalAuthorizationBoundary.js').default.canAccessPatientRecords(
      requesterId,
      patientId
    );

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Generate explanation
    const result = await ExplainSimplyService.generateSimpleExplanation(
      summaryId,
      patientId,
      requesterId,
      language
    );

    if (!result.success) {
      return res.status(result.code === 'NOT_FOUND' ? 404 : 500).json(result);
    }

    return res.json(result);
  } catch (error) {
    logger.error(`Explain simply route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/patients/:patientId/ai-summary/:summaryId/translate
 * Translate summary to target language
 */
router.post('/:patientId/ai-summary/:summaryId/translate', authenticateUser, async (req, res) => {
  try {
    const { patientId, summaryId } = req.params;
    const { targetLanguage } = req.body;
    const requesterId = req.user._id;

    if (!targetLanguage) {
      return res.status(400).json({
        success: false,
        error: 'targetLanguage is required',
      });
    }

    logger.info(`Translation request for summary ${summaryId} to ${targetLanguage}`);

    // Verify authorization
    const { authorized } = await require('../utils/clinicalAuthorizationBoundary.js').default.canAccessPatientRecords(
      requesterId,
      patientId
    );

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Translate
    const result = await TranslationService.translateSummary(
      summaryId,
      patientId,
      requesterId,
      targetLanguage
    );

    if (!result.success) {
      return res.status(result.code === 'NOT_FOUND' ? 404 : 400).json(result);
    }

    return res.json(result);
  } catch (error) {
    logger.error(`Translation route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * POST /api/v1/patients/:patientId/ai-audio
 * Generate audio from explanation text
 */
router.post('/:patientId/ai-audio', authenticateUser, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { explanationText, language = 'en' } = req.body;
    const requesterId = req.user._id;

    if (!explanationText) {
      return res.status(400).json({
        success: false,
        error: 'explanationText is required',
      });
    }

    logger.info(`Audio generation request for patient ${patientId} in ${language}`);

    // Verify authorization
    const { authorized } = await require('../utils/clinicalAuthorizationBoundary.js').default.canAccessPatientRecords(
      requesterId,
      patientId
    );

    if (!authorized) {
      return res.status(403).json({
        success: false,
        error: 'Not authorized',
      });
    }

    // Generate audio
    const result = await TextToSpeechService.generateAudio(
      explanationText,
      language,
      patientId,
      requesterId
    );

    if (!result.success) {
      return res.status(400).json(result);
    }

    return res.json(result);
  } catch (error) {
    logger.error(`Audio generation route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

/**
 * GET /api/v1/patients/:patientId/ai-languages
 * Get supported languages
 */
router.get('/:patientId/ai-languages', authenticateUser, async (req, res) => {
  try {
    const languages = TranslationService.getSupportedLanguages();

    return res.json({
      success: true,
      languages,
    });
  } catch (error) {
    logger.error(`Languages route error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

export default router;
