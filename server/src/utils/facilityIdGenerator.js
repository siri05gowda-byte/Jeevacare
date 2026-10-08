/**
 * Facility ID Generator
 * Generates unique JeevaCare Facility IDs
 * Format: FH-YYMMDD-XXXXX (e.g., FH-251007-A3K9M)
 */

import Hospital from '../models/Hospital.js';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a unique JeevaCare Facility ID
 * Format: FH-YYMMDD-XXXXX
 * FH = Facility Hospital
 * YYMMDD = Date of registration
 * XXXXX = Random Base36 string
 */
export async function generateFacilityId() {
  let id;
  let collision = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (collision && attempts < maxAttempts) {
    id = createFacilityId();

    // Check if ID already exists
    const existing = await Hospital.findOne({ facilityId: id });
    collision = !!existing;
    attempts++;
  }

  if (collision) {
    throw new Error('Failed to generate unique facility ID after multiple attempts');
  }

  return id;
}

/**
 * Create a facility ID with the pattern FH-YYMMDD-XXXXX
 */
function createFacilityId() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateString = `${year}${month}${day}`;

  // Generate 5 random characters
  let randomString = '';
  for (let i = 0; i < 5; i++) {
    randomString += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET.length));
  }

  return `FH-${dateString}-${randomString}`;
}

export default generateFacilityId;
