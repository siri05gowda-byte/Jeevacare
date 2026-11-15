import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { ensureJeevaIds } from '../utils/jeevaIdBackfill.js';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../../.env') });

/**
 * Give every user a JeevaCare ID and make patients' accounts match their dashboard ID.
 * The server does this on every start; this is for running it by hand.
 *   node src/scripts/backfillJeevaIds.js
 */
async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is not set');
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to database "${mongoose.connection.db.databaseName}"`);
  try {
    const { usersUpdated, patientsUpdated } = await ensureJeevaIds();
    console.log(`Done: ${usersUpdated} users and ${patientsUpdated} patients updated.`);
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
