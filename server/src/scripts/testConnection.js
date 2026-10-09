/**
 * Test MongoDB Connection Directly
 * Diagnoses connection issues without running full test suite
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

const testUri = process.env.TEST_MONGODB_URI;

console.log('🔌 MongoDB Connection Test\n');
console.log('=' .repeat(60));
console.log(`URI: ${testUri ? testUri.substring(0, 80) + '...' : 'NOT CONFIGURED'}`);
console.log('=' .repeat(60) + '\n');

if (!testUri) {
  console.error('❌ TEST_MONGODB_URI not configured in .env');
  process.exit(1);
}

const startTime = Date.now();

mongoose.connect(testUri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000,  // 5 second timeout
  connectTimeoutMS: 10000,
  socketTimeoutMS: 45000,
})
  .then(() => {
    const duration = Date.now() - startTime;
    console.log(`✅ Connected successfully in ${duration}ms`);
    console.log(`Connection state: ${mongoose.connection.readyState} (1=connected)`);
    console.log(`Host: ${mongoose.connection.host}`);
    return mongoose.connection.close();
  })
  .then(() => {
    console.log(`✅ Disconnected successfully\n`);
    process.exit(0);
  })
  .catch((error) => {
    const duration = Date.now() - startTime;
    console.error(`❌ Connection failed after ${duration}ms`);
    console.error(`Error: ${error.message}\n`);
    
    if (error.message.includes('timeout')) {
      console.error('📍 Issue: Connection timeout');
      console.error('   Possible causes:');
      console.error('   - Network connectivity to MongoDB Atlas');
      console.error('   - IP whitelist not allowing this connection');
      console.error('   - Invalid credentials in connection string');
      console.error('   - MongoDB Atlas cluster not running');
    } else if (error.message.includes('authentication')) {
      console.error('📍 Issue: Authentication failed');
      console.error('   Check username and password in TEST_MONGODB_URI');
    } else if (error.message.includes('jeevacare-test')) {
      console.error('📍 Issue: Database does not exist or is not accessible');
      console.error('   Ensure jeevacare-test database exists in MongoDB Atlas');
    }
    
    process.exit(1);
  });

// Timeout safety
setTimeout(() => {
  console.error('❌ Test timed out (no response after 30 seconds)');
  process.exit(1);
}, 30000);
