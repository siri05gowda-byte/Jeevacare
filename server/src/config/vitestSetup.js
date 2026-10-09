/**
 * Vitest Global Setup
 * Utility functions for test cleanup and Mongoose model cache management
 * NOTE: Hooks (afterEach, afterAll) must be used in individual test files, not here
 */

import mongoose from 'mongoose';

/**
 * Clear Mongoose model cache
 * Prevents "Cannot overwrite" errors when same models are imported in multiple test files
 */
export const clearModelCache = () => {
  Object.keys(mongoose.models).forEach(key => {
    delete mongoose.models[key];
  });
};

/**
 * Cleanup function for test completion
 */
export const testCleanup = async () => {
  try {
    clearModelCache();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (error) {
    console.warn('Cleanup failed:', error.message);
  }
};

export default {
  clearModelCache,
  testCleanup,
};
