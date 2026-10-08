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
      readPreference: 'primary',  // Always read from primary during tests
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      waitQueueTimeoutMS: 10000,
      // Apply write concern at connection level
      writeConcern: { w: "majority", wtimeout: 10000 },
      readConcern: { level: "majority" }
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
    // Close all connections to clear connection pool state
    if (mongoose.connection) {
      await mongoose.connection.close();
      logger.info('✓ Test database disconnected and connection pool cleared');
    }
  } catch (error) {
    logger.error(`Failed to disconnect test database: ${error.message}`);
    throw error;
  }
};

/**
 * Clear all test data
 * Deletes all documents from all collections
 * Uses proper serialization and write concern to ensure MongoDB Atlas consistency
 */
export const clearTestDatabase = async () => {
  try {
    const collections = mongoose.connection.collections;
    const collectionNames = Object.keys(collections);
    
    // Clear collections serially with majority write concern for Atlas consistency
    for (const key of collectionNames) {
      const collection = collections[key];
      try {
        // Use w: "majority" to ensure deletion is replicated across MongoDB Atlas replica set
        // This prevents race conditions where secondary replicas retain stale data
        await collection.deleteMany({}, { 
          writeConcern: { w: "majority", wtimeout: 10000 },
          maxTimeMS: 15000
        });
      } catch (deleteError) {
        logger.warn(`Failed to clear collection ${key}: ${deleteError.message}`);
      }
    }
    
    // Additional confirmation wait for full propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    
    logger.info('✓ Test database cleared (with majority write concern)');
  } catch (error) {
    logger.error(`Failed to clear test database: ${error.message}`);
    throw error;
  }
};

/**
 * Verify all collections are empty
 * Ensures cleanup completed before test starts
 */
export const verifyTestDatabaseEmpty = async () => {
  try {
    const collections = mongoose.connection.collections;
    
    for (const key of Object.keys(collections)) {
      const collection = collections[key];
      const count = await collection.countDocuments();
      if (count > 0) {
        logger.warn(`Collection ${key} still has ${count} documents before test started`);
        // Force additional cleanup if needed
        await collection.deleteMany({}, { writeConcern: { w: "majority", wtimeout: 10000 } });
      }
    }
    
    logger.info('✓ Test database verified empty');
  } catch (error) {
    logger.error(`Failed to verify empty test database: ${error.message}`);
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
  verifyTestDatabaseEmpty,
  verifyFixturePersistence,
};
