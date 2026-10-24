import express from 'express';
import cloudinaryAdapter from '../adapters/CloudinaryAdapter.js';
import aiServiceAdapter from '../adapters/AIServiceAdapter.js';
import ocrAdapter from '../adapters/OCRAdapter.js';
import ttsAdapter from '../adapters/TTSAdapter.js';
import config from '../config/index.js';

const router = express.Router();

/**
 * GET /api/v1/health
 * Basic API v1 health check
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'JeevaCare API v1 is healthy',
    timestamp: new Date(),
  });
});

/**
 * GET /api/v1/health/services
 * Check status of all external service adapters
 */
router.get('/services', (req, res) => {
  try {
    res.json({
      success: true,
      services: {
        cloudinary: cloudinaryAdapter.getStatus(),
        aiService: aiServiceAdapter.getStatus(),
        ocr: ocrAdapter.getStatus(),
        tts: ttsAdapter.getStatus(),
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/health/config
 * Get configuration summary (non-sensitive)
 * Returns runtime configuration including supported languages
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        environment: config.environment,
        port: config.port,
        supportedLanguages: config.supportedLanguages,
        piperTtsSupported: config.piperTTS?.supportedLanguages || [],
        corsOrigins: Array.isArray(config.cors.origin) 
          ? config.cors.origin 
          : [config.cors.origin],
      },
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/health/sheets
 * Diagnostic endpoint for Google Sheets integration status
 */
router.get('/sheets', async (req, res) => {
  try {
    const GoogleSheetsService = (await import('../services/GoogleSheetsService.js')).default;
    res.json({
      success: true,
      sheets: GoogleSheetsService.getStatus(),
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/health/bootstrap-demo
 * Idempotently bootstrap or verify demo hospitals, clinicians, and patients
 */
router.post('/bootstrap-demo', async (req, res) => {
  try {
    const { bootstrapDemoHospitalsAndAccounts } = await import('../utils/bootstrapDemoData.js');
    const result = await bootstrapDemoHospitalsAndAccounts();
    res.json({
      success: result.success,
      result,
      timestamp: new Date(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
