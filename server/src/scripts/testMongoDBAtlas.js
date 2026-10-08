/**
 * MongoDB Atlas Connectivity Test
 * 
 * Tests:
 * 1. Connection to MongoDB Atlas via MONGODB_URI env variable
 * 2. Read operation (safe, no modification)
 * 3. Write operation (create test document)
 * 4. Read back the test document
 * 5. Delete the test document (cleanup)
 * 
 * Run: node src/scripts/testMongoDBAtlas.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

// Debug: log what we got
console.log('DEBUG: MONGODB_URI env var check');
console.log(`  process.env.MONGODB_URI exists: ${!!MONGODB_URI}`);
if (MONGODB_URI) {
  // Don't print the actual URI, just verify it looks like a MongoDB connection string
  console.log(`  Starts with "mongodb": ${MONGODB_URI.startsWith('mongodb')}`);
  console.log(`  Length: ${MONGODB_URI.length} characters`);
}

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable is not defined');
  console.error('   Please set MONGODB_URI in server/.env');
  process.exit(1);
}

console.log('🔍 MongoDB Atlas Connectivity Test');
console.log('─'.repeat(50));

async function runTest() {
  try {
    // Step 1: Connect to MongoDB
    console.log('\n[1] Connecting to MongoDB Atlas...');
    console.log('   Attempting connection...');
    
    const connectOptions = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000,
    };
    
    await mongoose.connect(MONGODB_URI, connectOptions);
    console.log('✅ Connected successfully');
    console.log(`   Connection state: ${mongoose.connection.readyState} (1=connected)`);
    console.log(`   Database: ${mongoose.connection.db.getName()}`);

    // Step 2: Get database info
    console.log('\n[2] Verifying database access...');
    const adminDb = mongoose.connection.db.admin();
    const status = await adminDb.ping();
    console.log('✅ Database ping successful');
    console.log(`   Response: ${JSON.stringify(status)}`);

    // Step 3: Get collection list (safe read)
    console.log('\n[3] Testing read access...');
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Read successful (${collections.length} existing collections)`);
    if (collections.length > 0) {
      console.log(`   Sample collections: ${collections.slice(0, 3).map(c => c.name).join(', ')}`);
    }

    // Step 4: Create a test document
    console.log('\n[4] Testing write access (creating test document)...');
    const testCollection = mongoose.connection.db.collection('connectivity_test');
    const testData = {
      test_id: `test_${Date.now()}`,
      timestamp: new Date(),
      message: 'MongoDB Atlas connectivity test',
      environment: process.env.NODE_ENV || 'test',
    };
    const insertResult = await testCollection.insertOne(testData);
    console.log('✅ Write successful');
    console.log(`   Inserted document ID: ${insertResult.insertedId}`);

    // Step 5: Read back the test document
    console.log('\n[5] Reading back test document...');
    const foundDocument = await testCollection.findOne({ test_id: testData.test_id });
    console.log('✅ Read back successful');
    console.log(`   Found document: ${JSON.stringify(foundDocument, null, 2)}`);

    // Step 6: Delete the test document (cleanup)
    console.log('\n[6] Cleaning up (deleting test document)...');
    const deleteResult = await testCollection.deleteOne({ test_id: testData.test_id });
    console.log('✅ Cleanup successful');
    console.log(`   Deleted ${deleteResult.deletedCount} document(s)`);

    // Verify deletion
    console.log('\n[7] Verifying deletion...');
    const verifyDeleted = await testCollection.findOne({ test_id: testData.test_id });
    if (verifyDeleted === null) {
      console.log('✅ Verification successful (test document no longer exists)');
    } else {
      console.warn('⚠️  Document still exists after deletion');
    }

    console.log('\n' + '─'.repeat(50));
    console.log('🎉 All connectivity tests PASSED');
    console.log('─'.repeat(50));

  } catch (error) {
    console.error('\n❌ Test failed:');
    console.error(`   Error: ${error.message}`);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    
    // Additional diagnostics
    console.error('\n📋 Diagnostic Information:');
    console.error(`   Error name: ${error.name}`);
    
    if (error.message.includes('auth')) {
      console.error('\n⚠️  Authentication Error Detected');
      console.error('   Possible causes:');
      console.error('   1. Incorrect username or password in MONGODB_URI');
      console.error('   2. IP address not in MongoDB Atlas IP Allowlist');
      console.error('   3. Database user does not have permissions for the database');
      console.error('\n   To fix:');
      console.error('   - Verify username/password in the connection string');
      console.error('   - Add your IP to MongoDB Atlas Network Access whitelist');
      console.error('   - Ensure the database user has appropriate roles');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('\n⚠️  Connection Refused');
      console.error('   The connection string appears valid but the server is unreachable');
      console.error('   This may indicate network/firewall issues');
    }
    
    process.exit(1);
  } finally {
    // Disconnect
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n📴 Disconnected from MongoDB');
    }
  }
}

runTest();
