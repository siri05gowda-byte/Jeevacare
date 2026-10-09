/**
 * Test Cleanup Utilities
 * Handles cleanup between test files to prevent Mongoose model conflicts
 */

import mongoose from 'mongoose';

/**
 * Clear all Mongoose models and caches
 * Must be called between test files to prevent "Cannot overwrite" errors
 */
export const clearMongooseModels = async () => {
  try {
    // Delete all registered models
    Object.keys(mongoose.models).forEach(key => {
      delete mongoose.models[key];
    });
    
    // Delete all schemas
    Object.keys(mongoose.modelSchemas || {}).forEach(key => {
      delete mongoose.modelSchemas[key];
    });

    // Clear connection
    if (mongoose.connection.readyState !== 0) {
      // Don't actually disconnect, just clear the model cache
    }
    
    return true;
  } catch (error) {
    console.warn('Failed to clear Mongoose models:', error.message);
    return false;
  }
};

/**
 * Global cleanup function for vitest
 * Called after each test file
 */
export const cleanupAfterTests = async () => {
  await clearMongooseModels();
};

export default {
  clearMongooseModels,
  cleanupAfterTests,
};
