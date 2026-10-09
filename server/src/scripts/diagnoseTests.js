/**
 * Test Diagnostic Script
 * Identifies test execution issues without running full suite
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const testDir = path.join(__dirname, '../services');

console.log('🔍 TEST DIAGNOSTIC REPORT\n');
console.log('=' .repeat(60));

// 1. Find all test files
console.log('\n📝 TEST FILES DISCOVERED:\n');

const testFiles = fs.readdirSync(testDir)
  .filter(f => f.endsWith('.test.js'))
  .sort();

console.log(`Total: ${testFiles.length} test files\n`);
testFiles.forEach((file, i) => {
  const filepath = path.join(testDir, file);
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').length;
  const suites = (content.match(/describe\(/g) || []).length;
  const tests = (content.match(/it\(/g) || []).length;
  const skipped = (content.match(/it\.skip\(|skip\(/g) || []).length;
  
  console.log(`${i+1}. ${file}`);
  console.log(`   Lines: ${lines} | Suites: ${suites} | Tests: ${tests} | Skipped: ${skipped}`);
});

// 2. Check MongoDB connection config
console.log('\n🗄️  MONGODB CONFIGURATION:\n');

try {
  const dotenv = await import('dotenv');
  dotenv.config({ path: path.join(__dirname, '../../.env') });
  
  const mongoUri = process.env.MONGODB_URI;
  const testUri = process.env.TEST_MONGODB_URI;
  
  console.log(`MONGODB_URI: ${mongoUri ? '✓ Configured' : '✗ Missing'}`);
  console.log(`TEST_MONGODB_URI: ${testUri ? '✓ Configured' : '✗ Missing'}`);
  
  if (testUri) {
    const hasTestDb = testUri.includes('jeevacare-test');
    console.log(`  └─ Targets jeevacare-test: ${hasTestDb ? '✓ Yes' : '✗ No'}`);
  }
} catch (e) {
  console.error('✗ Failed to load .env:', e.message);
}

// 3. Check test infrastructure
console.log('\n⚙️  TEST INFRASTRUCTURE:\n');

try {
  const configPath = path.join(__dirname, '../config/testDatabase.js');
  const exists = fs.existsSync(configPath);
  console.log(`testDatabase.js: ${exists ? '✓ Exists' : '✗ Missing'}`);
  
  const viconfig = path.join(__dirname, '../../vitest.config.js');
  const vexists = fs.existsSync(viconfig);
  console.log(`vitest.config.js: ${vexists ? '✓ Exists' : '✗ Missing'}`);
} catch (e) {
  console.error('✗ Failed to check infrastructure:', e.message);
}

// 4. Summary statistics
console.log('\n📊 SUMMARY:\n');
const totalTests = testFiles.reduce((sum, f) => {
  const content = fs.readFileSync(path.join(testDir, f), 'utf-8');
  return sum + (content.match(/it\(/g) || []).length;
}, 0);

console.log(`Total test cases: ${totalTests}`);
console.log(`Test runner: Vitest 2.1.0+`);
console.log(`Environment: Node.js ES modules`);
console.log(`Database: MongoDB Atlas (jeevacare-test)`);

console.log('\n' + '='.repeat(60) + '\n');
console.log('✓ Diagnostic complete. See results above.\n');
process.exit(0);
