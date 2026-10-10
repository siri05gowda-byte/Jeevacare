import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Explicitly load from server/.env relative to server/src/config directory
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/**
 * Validate JWT secret for non-development environments
 * Fail-safe: Strong, unique secrets required for staging/production
 */
const validateJWTSecret = (secret, secretName, environment) => {
  // Allow dev defaults in development and test environments
  if (environment === 'development' || environment === 'test') {
    return;
  }

  // For staging/production: enforce strong secrets
  if (!secret || secret.includes('dev-') || secret.includes('development') || secret.length < 32) {
    throw new Error(
      `[SECURITY FAIL-SAFE] ${secretName} is not secure for ${environment} environment.\n` +
      `Requirement: ${secretName} must be:\n` +
      `  • At least 32 characters long (preferably 64+)\n` +
      `  • Cryptographically random\n` +
      `  • NOT contain 'dev-' or 'development' keywords\n` +
      `Current value contains insecure pattern or is too short.\n` +
      `Generate with: openssl rand -base64 48\n` +
      `Then add to environment variables (never commit to git).`
    );
  }
};

const config = {
  environment: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // Database
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/jeevacare',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    expiration: process.env.JWT_EXPIRATION || '24h',
    refreshSecret: process.env.REFRESH_TOKEN_SECRET || 'dev-refresh-secret',
    refreshExpiration: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  },

  // OTP
  otp: {
    enabled: process.env.OTP_ENABLED === 'true',
    provider: process.env.OTP_PROVIDER || 'console',
    smsApiKey: process.env.SMS_API_KEY,
    smsApiUrl: process.env.SMS_API_URL,
    emailApiKey: process.env.EMAIL_API_KEY,
    emailApiUrl: process.env.EMAIL_API_URL,
  },

  // Cloudinary
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },

  // AI Service
  aiService: {
    enabled: process.env.AI_SERVICE_ENABLED === 'true',
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    apiKey: process.env.AI_SERVICE_API_KEY,
    model: process.env.AI_MODEL || 'llama-2',
  },

  // OCR Service
  ocrService: {
    enabled: process.env.OCR_SERVICE_ENABLED === 'true',
    url: process.env.OCR_SERVICE_URL || 'http://localhost:8080',
  },

  // TTS Service
  ttsService: {
    enabled: process.env.TTS_SERVICE_ENABLED === 'true',
    provider: process.env.TTS_SERVICE_PROVIDER || 'piper',
    apiKey: process.env.TTS_API_KEY,
  },

  // Piper TTS (Local, Self-Hosted)
  // Language support verification (October 2026):
  // ✓ English (en): en_US-amy-medium.onnx - Available, tested
  // ✓ Hindi (hi): hi_IN-pratham-medium.onnx - Available, tested
  // ✓ Malayalam (ml): ml_IN-meera-medium.onnx - Available, tested
  // ✗ Kannada (kn): NO official model in Piper catalogue
  // ✗ Tamil (ta): NO official model in Piper catalogue
  // ✗ Telugu (te): NO official model in Piper catalogue
  piperTTS: {
    enabled: process.env.PIPER_TTS_ENABLED === 'true',
    // Note: On Windows with Python, piper is accessible via 'python -m piper' or direct command
    // On Linux/Docker with pip install piper-tts, use 'piper' directly
    binaryPath: process.env.PIPER_BINARY_PATH || 'piper',
    modelsPath: process.env.PIPER_MODELS_PATH || (process.platform === 'win32' 
      ? 'C:\\Users\\user\\piper-models'
      : '/usr/share/piper-tts/models'),
    defaultVoice: process.env.PIPER_DEFAULT_VOICE || 'en',
    // Supported languages with verified Piper models
    supportedLanguages: ['en', 'hi', 'ml'],
    // Voice model configuration - ONLY includes languages with available models
    voiceModels: {
      en: { model: 'en_US-amy-medium.onnx', speaker: 0, status: 'READY' },
      hi: { model: 'hi_IN-pratham-medium.onnx', speaker: 0, status: 'READY' },
      ml: { model: 'ml_IN-meera-medium.onnx', speaker: 0, status: 'READY' },
      // Note: kn, ta, te removed - no official Piper models available as of Oct 2026
    },
  },

  // Groq AI Service
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model: process.env.GROQ_MODEL || 'mixtral-8x7b-32768',
  },

  // DigiLocker
  digiLocker: {
    enabled: process.env.DIGILOCKER_ENABLED === 'true',
    clientId: process.env.DIGILOCKER_CLIENT_ID,
    clientSecret: process.env.DIGILOCKER_CLIENT_SECRET,
    redirectUri: process.env.DIGILOCKER_REDIRECT_URI,
  },

  // CORS
  cors: {
    origin: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(','),
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    format: process.env.LOG_FORMAT || 'combined',
  },

  // Security
  security: {
    rateLimitWindowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100,
  },

  // Supported Languages (LOCKED - per Build_spec.md)
  supportedLanguages: ['en', 'hi', 'kn', 'te', 'ta', 'ml'],
  languageNames: {
    en: 'English',
    hi: 'हिन्दी',
    kn: 'ಕನ್ನಡ',
    te: 'తెలుగు',
    ta: 'தமிழ்',
    ml: 'മലയാളം',
  },
};

// Validate JWT secrets for non-development/test environments
if (config.environment !== 'development' && config.environment !== 'test') {
  validateJWTSecret(config.jwt.secret, 'JWT_SECRET', config.environment);
  validateJWTSecret(config.jwt.refreshSecret, 'REFRESH_TOKEN_SECRET', config.environment);
  
  // Verify secrets are different
  if (config.jwt.secret === config.jwt.refreshSecret) {
    throw new Error(
      '[SECURITY] JWT_SECRET and REFRESH_TOKEN_SECRET must be different. ' +
      'Generate separate random secrets using: openssl rand -base64 48'
    );
  }
}

export default config;
