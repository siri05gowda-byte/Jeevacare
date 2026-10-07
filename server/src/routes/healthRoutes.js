import express from 'express';
import cloudinaryAdapter from '../adapters/CloudinaryAdapter.js';
import aiServiceAdapter from '../adapters/AIServiceAdapter.js';
import ocrAdapter from '../adapters/OCRAdapter.js';
import ttsAdapter from '../adapters/TTSAdapter.js';

const router = express.Router();

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
 */
router.get('/config', (req, res) => {
  try {
    res.json({
      success: true,
      config: {
        environment: process.env.NODE_ENV || 'development',
        port: process.env.PORT || 5000,
        supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
        cors: process.env.CORS_ORIGIN || 'http://localhost:5173',
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

export default router;
