import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

const connectDatabase = async () => {
  try {
    logger.info('Connecting to MongoDB...');

    // Skip if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('✓ Already connected to MongoDB');
      return mongoose.connection;
    }

    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('✓ MongoDB connected successfully');
    return mongoose.connection;
  } catch (error) {
    // Redact any connection details from error before logging
    const safeMessage = error.message?.replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@/gi, 'mongodb$1://***:***@') || 'Unknown error';
    logger.error(`MongoDB connection error: ${safeMessage}`);

    // Only exit if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error(`MongoDB disconnection error: ${error.message}`);
    // Only exit if not in test environment
    if (process.env.NODE_ENV !== 'test') {
      process.exit(1);
    }
    throw error;
  }
};

export { connectDatabase, disconnectDatabase };
