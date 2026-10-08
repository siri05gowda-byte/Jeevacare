/**
 * Test Database Configuration
 * Isolated test database setup using MongoDB Atlas
 * Uses TEST_MONGODB_URI environment variable pointing to jeevacare-test database
 * No local MongoDB fallback - explicitly fails if TEST_MONGODB_URI is not configured
 */

import mongoose from 'mongoose';
import logger from '../utils/logger.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Connect to test database (MongoDB Atlas - jeevacare-test)
 * Requires TEST_MONGODB_URI environment variable
 * Fails explicitly if not configured (no localhost fallback)
 */
export const connectTestDatabase = async () => {
  try {
    // Check if already connected
    if (mongoose.connection.readyState === 1) {
      logger.info('✓ Already connected to test database');
      return mongoose.connection;
    }

    // Get test database URI from environment
    const testUri = process.env.TEST_MONGODB_URI;
    
    if (!testUri) {
      const error = new Error(
        'TEST_MONGODB_URI environment variable is not configured. ' +
        'Add TEST_MONGODB_URI to server/.env pointing to jeevacare-test database. ' +
        'Format: mongodb+srv://username:password@cluster/jeevacare-test?retryWrites=true&w=majority'
      );
      logger.error(error.message);
      throw error;
    }

    // Verify it targets jeevacare-test database
    if (!testUri.includes('/jeevacare-test')) {
      const error = new Error(
        'TEST_MONGODB_URI must explicitly target jeevacare-test database. ' +
        'Ensure the URI contains "/jeevacare-test" as the database name.'
      );
      logger.error(error.message);
      throw error;
    }

    logger.info('Connecting to MongoDB Atlas test database (jeevacare-test)...');

    await mongoose.connect(testUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    logger.info('✓ Test database connected (MongoDB Atlas jeevacare-test)');
    return mongoose.connection;
  } catch (error) {
    logger.error(`Failed to connect test database: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from test database
 */
export const disconnectTestDatabase = async () => {
  try {
    await mongoose.disconnect();
    logger.info('✓ Test database disconnected');
  } catch (error) {
    logger.error(`Failed to disconnect test database: ${error.message}`);
    throw error;
  }
};

/**
 * Clear all test data
 * Deletes all documents from all collections
 * Uses proper serialization to avoid race conditions
 */
export const clearTestDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    const collectionNames = Object.keys(collections);
    
    // Clear collections serially to avoid race conditions
    for (const key of collectionNames) {
      const collection = collections[key];
      try {
        // Use deleteMany with explicit write concern for durability
        await collection.deleteMany({}, { writeConcern: { w: 1, wtimeout: 5000 } });
      } catch (deleteError) {
        // Log individual collection errors but continue with others
        logger.warn(`Failed to clear collection ${key}: ${deleteError.message}`);
      }
    }
    
    // Wait for MongoDB Atlas to propagate deletes and ensure clean state
    // This is crucial for shared database replication
    await new Promise(resolve => setTimeout(resolve, 200));
    
    logger.info('✓ Test database cleared');
  } catch (error) {
    logger.error(`Failed to clear test database: ${error.message}`);
    throw error;
  }
};

/**
 * Verify that a fixture was actually persisted
 * Re-fetches from database to ensure replication completed
 */
export const verifyFixturePersistence = async (Model, fixtureId, description) => {
  try {
    // Small delay to allow replication
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const persisted = await Model.findById(fixtureId);
    if (!persisted) {
      throw new Error(`Fixture not persisted: ${description} (ID: ${fixtureId})`);
    }
    return persisted;
  } catch (error) {
    throw new Error(`Failed to verify fixture ${description}: ${error.message}`);
  }
};

export default {
  connectTestDatabase,
  disconnectTestDatabase,
  clearTestDatabase,
};
