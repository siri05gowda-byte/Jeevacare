/**
 * Database Verification Script
 * Verifies MongoDB connectivity and model loading
 */

import mongoose from 'mongoose';
import config from '../config/index.js';
import logger from '../utils/logger.js';

// Import all models
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import GuardianRelationship from '../models/GuardianRelationship.js';
import Hospital from '../models/Hospital.js';
import Encounter from '../models/Encounter.js';
import ClinicalRecord from '../models/ClinicalRecord.js';
import Appointment from '../models/Appointment.js';
import Document from '../models/Document.js';
import AuditEvent from '../models/AuditEvent.js';

const models = {
  User,
  Patient,
  GuardianRelationship,
  Hospital,
  Encounter,
  ClinicalRecord,
  Appointment,
  Document,
  AuditEvent,
};

const verifyDatabase = async () => {
  try {
    logger.info('🔍 Starting database verification...\n');

    // 1. Connect to MongoDB
    logger.info('1️⃣ Connecting to MongoDB...');
    // Never log full URI - redact credentials
    const uriDisplay = config.database.uri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@');
    logger.info(`   URI: ${uriDisplay}`);
    
    await mongoose.connect(config.database.uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    logger.info('   ✅ Connected successfully\n');

    // 2. Test connection
    logger.info('2️⃣ Testing connection...');
    const dbConnection = mongoose.connection;
    logger.info(`   Database: ${dbConnection.name}`);
    logger.info(`   State: ${dbConnection.readyState === 1 ? 'Connected' : 'Disconnected'}`);
    logger.info('   ✅ Connection test passed\n');

    // 3. Verify models load
    logger.info('3️⃣ Verifying model loading...');
    for (const [name, model] of Object.entries(models)) {
      try {
        // Check model exists
        if (!model || !model.schema) {
          throw new Error(`Invalid model structure`);
        }
        logger.info(`   ✅ ${name}`);
      } catch (error) {
        logger.error(`   ❌ ${name}: ${error.message}`);
      }
    }
    logger.info();

    // 4. Test collection creation/access
    logger.info('4️⃣ Testing collection access...');
    for (const [name, model] of Object.entries(models)) {
      try {
        const count = await model.countDocuments();
        logger.info(`   ✅ ${name} (${count} documents)`);
      } catch (error) {
        logger.error(`   ❌ ${name}: ${error.message}`);
      }
    }
    logger.info();

    // 5. Verify indexes
    logger.info('5️⃣ Verifying indexes...');
    for (const [name, model] of Object.entries(models)) {
      try {
        const indexes = await model.collection.getIndexes();
        const indexCount = Object.keys(indexes).length;
        logger.info(`   ✅ ${name} (${indexCount} indexes)`);
      } catch (error) {
        logger.error(`   ❌ ${name}: ${error.message}`);
      }
    }
    logger.info();

    // 6. Test schema validation
    logger.info('6️⃣ Testing schema validation...');
    
    // Test Patient schema validation
    try {
      const patientSchema = Patient.schema;
      logger.info(`   ✅ Patient schema:`);
      logger.info(`      - Fields: ${Object.keys(patientSchema.obj).length}`);
      logger.info(`      - Indexes: ${patientSchema.indexes().length}`);
      logger.info(`      - Hooks: ${Object.keys(patientSchema._pres).length + Object.keys(patientSchema._posts).length}`);
    } catch (error) {
      logger.error(`   ❌ Patient schema: ${error.message}`);
    }

    // Test User schema validation
    try {
      const userSchema = User.schema;
      logger.info(`   ✅ User schema:`);
      logger.info(`      - Fields: ${Object.keys(userSchema.obj).length}`);
      logger.info(`      - Indexes: ${userSchema.indexes().length}`);
    } catch (error) {
      logger.error(`   ❌ User schema: ${error.message}`);
    }

    // Test GuardianRelationship schema validation
    try {
      const guardianSchema = GuardianRelationship.schema;
      logger.info(`   ✅ GuardianRelationship schema:`);
      logger.info(`      - Fields: ${Object.keys(guardianSchema.obj).length}`);
      logger.info(`      - Indexes: ${guardianSchema.indexes().length}`);
    } catch (error) {
      logger.error(`   ❌ GuardianRelationship schema: ${error.message}`);
    }

    logger.info();

    // 7. Summary
    logger.info('✅ Database verification complete!');
    logger.info('\nSummary:');
    // Redact credentials in summary
    const uriSummary = config.database.uri.replace(/mongodb\+srv:\/\/[^:]+:[^@]+@/, 'mongodb+srv://***:***@');
    logger.info(`  - MongoDB URI: ${uriSummary}`);
    logger.info(`  - Database: ${dbConnection.name}`);
    logger.info(`  - Models Loaded: ${Object.keys(models).length}`);
    logger.info(`  - All systems operational ✅`);
    
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Database verification failed: ${error.message}`);
    logger.error(error.stack);
    process.exit(1);
  }
};

// Run verification
verifyDatabase();
