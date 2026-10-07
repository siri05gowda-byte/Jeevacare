import dotenv from 'dotenv';

dotenv.config();

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
    provider: process.env.TTS_SERVICE_PROVIDER || 'google',
    apiKey: process.env.TTS_API_KEY,
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

export default config;
