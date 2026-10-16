/**
 * Migration Script: Update Patient Verification Status
 * 
 * Updates all existing PATIENT role users to have verificationStatus='verified'
 * since patients don't need hospital-admin approval to use their accounts.
 * 
 * Run with: node server/src/scripts/migratePatientVerificationStatus.js
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import User from '../models/User.js';
import logger from '../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

const runMigration = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jeevacare');
    logger.info('Connected to MongoDB');

    // Update all PATIENT role users with pending verification to verified
    const result = await User.updateMany(
      { 
        role: 'PATIENT',
        verificationStatus: 'pending'
      },
      { 
        $set: { verificationStatus: 'verified' }
      }
    );

    logger.info(`✅ Migration complete:`);
    logger.info(`   Matched: ${result.matchedCount} patient users`);
    logger.info(`   Modified: ${result.modifiedCount} patient users`);
    
    // Show current stats
    const patientStats = await User.aggregate([
      { $match: { role: 'PATIENT' } },
      { $group: { 
        _id: '$verificationStatus',
        count: { $sum: 1 }
      }}
    ]);

    logger.info(`\nCurrent patient verification status breakdown:`);
    patientStats.forEach(stat => {
      logger.info(`   ${stat._id}: ${stat.count}`);
    });

    await mongoose.disconnect();
    logger.info('\n✅ Disconnected from MongoDB');
    process.exit(0);
  } catch (error) {
    logger.error(`❌ Migration failed: ${error.message}`);
    process.exit(1);
  }
};

runMigration();
