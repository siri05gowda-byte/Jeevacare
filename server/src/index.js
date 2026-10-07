import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import config from './config/index.js';
import { connectDatabase } from './config/database.js';
import logger from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

// Initialize Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors(config.cors));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.security.rateLimitWindowMs,
  max: config.security.rateLimitMaxRequests,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api/', limiter);

// Request logging middleware
app.use((req, res, next) => {
  logger.http(`${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'JeevaCare API is running',
    environment: config.environment,
    timestamp: new Date(),
  });
});

// API Routes
app.use('/api/v1/auth', (await import('./routes/authRoutes.js')).default);
app.use('/api/v1/health', (await import('./routes/healthRoutes.js')).default);

// 404 Not Found handler (must be after all routes)
app.use(notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Database connection and server startup
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDatabase();

    // Start server
    app.listen(config.port, () => {
      logger.info(`🚀 JeevaCare API Server running on port ${config.port}`);
      logger.info(`📚 Environment: ${config.environment}`);
      logger.info(`🗄️  Database: ${config.database.uri}`);
    });
  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down gracefully...');
  process.exit(0);
});

// Start the server
startServer();

export default app;
