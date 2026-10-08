/**
 * Professional ID Generator
 * Generates unique JeevaCare Professional IDs
 * Format: HP-YYMMDD-XXXXX (e.g., HP-251007-D7L4P)
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generate a unique JeevaCare Professional ID
 * Format: HP-YYMMDD-XXXXX
 * HP = Healthcare Professional
 * YYMMDD = Date of registration
 * XXXXX = Random Base36 string
 */
export async function generateProfessionalId() {
  let id;
  let collision = true;
  let attempts = 0;
  const maxAttempts = 10;

  while (collision && attempts < maxAttempts) {
    id = createProfessionalId();

    // Lazy import to avoid circular dependency
    const { default: HealthcareProfessional } = await import('../models/HealthcareProfessional.js');

    // Check if ID already exists
    const existing = await HealthcareProfessional.findOne({ professionalId: id });
    collision = !!existing;
    attempts++;
  }

  if (collision) {
    throw new Error('Failed to generate unique professional ID after multiple attempts');
  }

  return id;
}

/**
 * Create a professional ID with the pattern HP-YYMMDD-XXXXX
 */
function createProfessionalId() {
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

  return `HP-${dateString}-${randomString}`;
}

export default generateProfessionalId;
