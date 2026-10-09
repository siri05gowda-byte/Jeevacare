/**
 * Vitest Global Setup
 * Configured to run before all tests
 */

import { beforeAll, afterAll, afterEach } from 'vitest';
import mongoose from 'mongoose';

/**
 * Clear Mongoose model cache
 * Prevents "Cannot overwrite" errors when same models are imported in multiple test files
 */
const clearModelCache = () => {
  Object.keys(mongoose.models).forEach(key => {
    delete mongoose.models[key];
  });
};

// Clear cache after each test
afterEach(() => {
  clearModelCache();
});

// Ensure cleanup on test completion
afterAll(async () => {
  try {
    clearModelCache();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
  } catch (error) {
    console.warn('Cleanup failed:', error.message);
  }
});
