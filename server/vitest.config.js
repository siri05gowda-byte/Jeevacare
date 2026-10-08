import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

// Load .env from server directory
const serverDir = path.resolve(new URL(import.meta.url).pathname, '..');
dotenv.config({ path: path.join(serverDir, '.env') });

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    include: ['src/**/*.test.js'],
    exclude: ['node_modules/**'],
    threads: false,
    singleThread: true,
  },
});
