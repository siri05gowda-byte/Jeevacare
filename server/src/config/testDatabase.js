/**
 * Test Database Configuration
 * Isolated test database setup
 * Attempts to use MongoDB Memory Server; falls back to local MongoDB if not available
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';

let mongoServer;
let useMemoryServer = false;

/**
 * Connect to test database
 * Priority order:
 * 1. MongoDB Memory Server (if available)
 * 2. Local MongoDB at mongodb://localhost:27017/jeevacare-test
 */
export const connectTestDatabase = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('✓ Already connected to test database');
      return mongoose.connection;
    }

    // Try to use MongoDB Memory Server first
    try {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      mongoServer = await MongoMemoryServer.create();
      const mongoUri = mongoServer.getUri();
      useMemoryServer = true;

      logger.info(`Starting MongoDB Memory Server: ${mongoUri}`);

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      logger.info('✓ Test database connected (MongoDB Memory Server)');
      return mongoose.connection;
    } catch (memoryServerError) {
      // Fall back to local MongoDB
      logger.warn('MongoDB Memory Server not available, using local MongoDB');
      useMemoryServer = false;

      const testUri = 'mongodb://localhost:27017/jeevacare-test';
      logger.info(`Connecting to local test database: ${testUri}`);

      await mongoose.connect(testUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      logger.info('✓ Test database connected (Local MongoDB)');
      return mongoose.connection;
    }
  } catch (error) {
    logger.error(`Failed to connect test database: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from test database
 * Cleans up MongoDB Memory Server instance if used
 */
export const disconnectTestDatabase = async () => {
  try {
    await mongoose.disconnect();
    if (mongoServer && useMemoryServer) {
      await mongoServer.stop();
      logger.info('✓ MongoDB Memory Server stopped');
    }
    logger.info('✓ Test database disconnected');
  } catch (error) {
    logger.error(`Failed to disconnect test database: ${error.message}`);
    throw error;
  }
};

/**
 * Clear all test data
 * Deletes all documents from all collections
 */
export const clearTestDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    logger.info('✓ Test database cleared');
  } catch (error) {
    logger.error(`Failed to clear test database: ${error.message}`);
    throw error;
  }
};

export default {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
};
