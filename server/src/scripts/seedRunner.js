#!/usr/bin/env node

/**
 * Conditional Seed Runner for JeevaCare Demo Data
 * 
 * IMPORTANT:
 * - Only executes if explicitly triggered via RUN_SEED_DRY_RUN or RUN_SEED_ACTUAL environment variables
 * - Prevents accidental seeding on every deploy
 * - Validates TEST_MONGODB_URI targets exactly 'jeevacare-test' database
 * - Never falls back to production database
 * - Dry-run mode performs zero database writes
 * 
 * Usage:
 *   RUN_SEED_DRY_RUN=true node seedRunner.js    # Validate without writes
 *   RUN_SEED_ACTUAL=true node seedRunner.js     # Execute actual seed
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// VALIDATION AND MODE DETECTION
// ============================================================================

// Determine which mode to run
const dryRunEnv = process.env.RUN_SEED_DRY_RUN;
const actualEnv = process.env.RUN_SEED_ACTUAL;

// Reject ambiguous or both flags set
if (dryRunEnv && actualEnv) {
  console.error('❌ CONFIGURATION ERROR');
  console.error('   Both RUN_SEED_DRY_RUN and RUN_SEED_ACTUAL are set');
  console.error('   Set only ONE of these flags, not both');
  process.exit(1);
}

// Determine mode
const mode = dryRunEnv === 'true' ? 'DRY_RUN' : 
             actualEnv === 'true' ? 'ACTUAL' : 
             null;

if (!mode) {
  console.log('ℹ️  Seed runner: No seed operation triggered');
  console.log('   Set RUN_SEED_DRY_RUN=true or RUN_SEED_ACTUAL=true to enable');
  process.exit(0);
}

// Verify TEST_MONGODB_URI is configured
if (!process.env.TEST_MONGODB_URI) {
  console.log('ℹ️  TEST_MONGODB_URI environment variable is not set. Skipping seed runner.');
  process.exit(0);
}

// Extract and validate database name
const dbMatch = process.env.TEST_MONGODB_URI.match(/\/([a-zA-Z0-9_-]+)(?:\?|$)/);
const dbName = dbMatch ? dbMatch[1] : null;

if (!dbName) {
  console.log('ℹ️  Could not extract database name from TEST_MONGODB_URI. Skipping seed runner.');
  process.exit(0);
}

if (dbName !== 'jeevacare-test') {
  console.log(`ℹ️  Target database is ${dbName}, not jeevacare-test. Skipping seed runner.`);
  process.exit(0);
}

// ============================================================================
// SETUP AND EXECUTION
// ============================================================================

console.log('='.repeat(80));
console.log(`🌱 JeevaCare Seed Runner - ${mode} Mode`);
console.log('='.repeat(80));
console.log(`Database Target: ${dbName}`);
console.log(`Mode: ${mode === 'DRY_RUN' ? '📋 Validation (zero database writes)' : '✍️  Actual seeding'}`);
console.log(`Timestamp: ${new Date().toISOString()}`);
console.log('='.repeat(80));
console.log('');

// Prepare environment variables for seed script
const seedEnv = {
  ...process.env,
  SEED_DRY_RUN: mode === 'DRY_RUN' ? 'true' : '',
  NODE_ENV: 'development',  // Seed script requires non-production
};

// Resolve the seed script path
const seedScriptPath = path.join(__dirname, 'seedSyntheticData.js');

// Spawn the seed script as a child process with inherited stdio
const seedProcess = spawn('node', [seedScriptPath], {
  cwd: path.dirname(seedScriptPath),
  env: seedEnv,
  stdio: 'inherit'
});

// Handle process completion
seedProcess.on('exit', (code) => {
  console.log('');
  console.log('='.repeat(80));
  if (code === 0) {
    console.log(`✅ Seed operation completed successfully (exit code: ${code})`);
  } else {
    console.log(`⚠️  Seed operation completed with exit code: ${code}`);
  }
  console.log('='.repeat(80));
  console.log('');
  
  // Always exit 0 in pre-deploy runner to prevent blocking Render deployment
  process.exit(0);
});

// Handle spawn errors
seedProcess.on('error', (err) => {
  console.error('❌ Failed to start seed script');
  console.error(`   Error: ${err.message}`);
  process.exit(1);
});
