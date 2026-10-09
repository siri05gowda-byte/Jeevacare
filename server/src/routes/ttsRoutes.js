import { Router } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import TextToSpeechService from '../services/TextToSpeechService.js';
import { authMiddleware } from '../middleware/authentication.js';
import fs from 'fs';
import path from 'path';
import logger from '../utils/logger.js';

const router = Router();

/**
 * TTS Routes - Text-to-Speech audio generation
 * Uses Piper (free, self-hosted) or demo mode
 */

/**
 * Generate audio for explanation text
 * POST /api/v1/tts/generate
 */
router.post(
  '/generate',
  authMiddleware,
  [
    body('explanationText')
      .trim()
      .notEmpty()
      .withMessage('Explanation text is required')
      .isLength({ max: 10000 })
      .withMessage('Text cannot exceed 10000 characters'),
    body('language')
      .trim()
      .optional()
      .isIn(['en', 'hi', 'kn', 'te', 'ta', 'ml'])
      .withMessage('Invalid language code'),
    body('patientId')
      .trim()
      .optional(),
  ],
  async (req, res) => {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { explanationText, language = 'en', patientId } = req.body;
      const requesterId = req.user._id;

      logger.info(`TTS request: ${language} (${explanationText.length} chars)`);

      // Generate audio
      const result = await TextToSpeechService.generateAudio(
        explanationText,
        language,
        patientId,
        requesterId
      );

      if (!result.success) {
        return res.status(400).json({
          success: false,
          error: result.error,
          code: result.code,
          supportedLanguages: result.supportedLanguages,
        });
      }

      res.json({
        success: true,
        audio: result.audio,
        audioPath: result.audioPath,
      });
    } catch (error) {
      logger.error(`TTS generation error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audio',
        details: error.message,
      });
    }
  }
);

/**
 * Stream generated audio file
 * GET /api/v1/tts/stream/:filename
 */
router.get(
  '/stream/:filename',
  authMiddleware,
  [param('filename').matches(/^[\w\-_.]+\.(wav|mp3)$/).withMessage('Invalid filename')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { filename } = req.params;
      const tempDir = path.join(process.cwd(), 'tmp', 'piper-tts');
      const filePath = path.join(tempDir, filename);

      // Security: Prevent path traversal
      if (!filePath.startsWith(tempDir)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        logger.warn(`Audio file not found: ${filePath}`);
        return res.status(404).json({ error: 'Audio file not found' });
      }

      // Set appropriate headers
      const contentType = filename.endsWith('.mp3') ? 'audio/mpeg' : 'audio/wav';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

      // Stream the file
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (error) => {
        logger.error(`Error streaming audio: ${error.message}`);
        res.status(500).json({ error: 'Failed to stream audio' });
      });

      fileStream.pipe(res);
    } catch (error) {
      logger.error(`Audio stream error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to stream audio',
        details: error.message,
      });
    }
  }
);

/**
 * Get supported languages and voice list
 * GET /api/v1/tts/languages
 */
router.get(
  '/languages',
  authMiddleware,
  async (req, res) => {
    try {
      const languages = TextToSpeechService.getSupportedLanguages();
      const status = TextToSpeechService.getStatus();

      res.json({
        success: true,
        languages,
        status,
      });
    } catch (error) {
      logger.error(`Failed to fetch languages: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch supported languages',
        details: error.message,
      });
    }
  }
);

/**
 * Get available voices for a language
 * GET /api/v1/tts/voices/:language
 */
router.get(
  '/voices/:language',
  authMiddleware,
  [param('language').isIn(['en', 'hi', 'kn', 'te', 'ta', 'ml']).withMessage('Invalid language code')],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { language } = req.params;
      const voices = await TextToSpeechService.getVoicesForLanguage(language);

      res.json(voices);
    } catch (error) {
      logger.error(`Failed to fetch voices: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch voices',
        details: error.message,
      });
    }
  }
);

/**
 * Get TTS service status
 * GET /api/v1/tts/status
 */
router.get(
  '/status',
  authMiddleware,
  async (req, res) => {
    try {
      const status = TextToSpeechService.getStatus();

      res.json({
        success: true,
        status,
      });
    } catch (error) {
      logger.error(`Failed to fetch TTS status: ${error.message}`);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch TTS status',
        details: error.message,
      });
    }
  }
);

export default router;
