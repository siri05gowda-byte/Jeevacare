import mongoose from 'mongoose';
import User from '../models/User.js';
import { generateJeevaId } from '../utils/jeevaIdGenerator.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Backfill JeevaIds for existing users who don't have one
 * Safe to run multiple times - only updates users without jeevaId
 */
async function backfillJeevaIds() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n📊 Finding users without JeevaId...');
    const usersWithoutJeevaId = await User.find({
      $or: [
        { jeevaId: { $exists: false } },
        { jeevaId: null },
        { jeevaId: '' }
      ]
    }).select('_id email role profile.firstName profile.lastName');

    console.log(`Found ${usersWithoutJeevaId.length} users without JeevaId`);

    if (usersWithoutJeevaId.length === 0) {
      console.log('✅ All users already have JeevaIds!');
      await mongoose.disconnect();
      return;
    }

    console.log('\n🔄 Generating and assigning JeevaIds...');
    let successCount = 0;
    let failureCount = 0;

    for (const user of usersWithoutJeevaId) {
      try {
        const jeevaId = await generateJeevaId();
        
        await User.findByIdAndUpdate(user._id, { jeevaId });
        
        console.log(`✅ ${user.profile?.firstName || 'User'} ${user.profile?.lastName || ''} (${user.email}) -> ${jeevaId}`);
        successCount++;
      } catch (error) {
        console.error(`❌ Failed for user ${user.email}:`, error.message);
        failureCount++;
      }
    }

    console.log('\n📈 Backfill Summary:');
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Failed: ${failureCount}`);
    console.log(`   📊 Total: ${usersWithoutJeevaId.length}`);

    console.log('\n🔍 Verifying results...');
    const remainingWithoutJeevaId = await User.countDocuments({
      $or: [
        { jeevaId: { $exists: false } },
        { jeevaId: null },
        { jeevaId: '' }
      ]
    });

    if (remainingWithoutJeevaId === 0) {
      console.log('✅ All users now have JeevaIds!');
    } else {
      console.log(`⚠️  ${remainingWithoutJeevaId} users still without JeevaId`);
    }

    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  } catch (error) {
    console.error('💥 Backfill failed:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run the backfill
backfillJeevaIds();
