import mongoose from 'mongoose';
import config from './index.js';
import logger from '../utils/logger.js';

const connectDatabase = async () => {
  try {
    logger.info('Connecting to MongoDB...');
    
    // Skip if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info(`✓ Already connected to MongoDB: ${config.database.uri}`);
      return mongoose.connection;
    }

    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info(`MongoDB connected: ${config.database.uri}`);
    return mongoose.connection;
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
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
