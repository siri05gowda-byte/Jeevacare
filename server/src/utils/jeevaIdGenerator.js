import Patient from '../models/Patient.js';

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Base32 without I, L, O, U
const ALPHABET_SIZE = ALPHABET.length;

/**
 * Generates a unique JeevaId for a patient
 * Format: JJYY-XXXXX (where JJYY is JeevaCare year prefix and XXXXX is random Base32)
 * Example: JJ25-H7K2M
 */
export const generateJeevaId = async () => {
  let jeevaId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;

  while (!isUnique && attempts < maxAttempts) {
    const timestamp = Date.now();
    const year = new Date().getFullYear().toString().slice(-2);
    
    // Generate 5 random characters in Base32
    let randomPart = '';
    for (let i = 0; i < 5; i++) {
      randomPart += ALPHABET.charAt(Math.floor(Math.random() * ALPHABET_SIZE));
    }

    jeevaId = `JJ${year}-${randomPart}`;

    // Check if this ID already exists
    const existingPatient = await Patient.findOne({ jeevaId });
    if (!existingPatient) {
      isUnique = true;
    }

    attempts++;
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique JeevaId after maximum attempts');
  }

  return jeevaId;
};

/**
 * Validates JeevaId format
 */
export const validateJeevaIdFormat = (jeevaId) => {
  const pattern = /^JJ\d{2}-[0-9A-Z]{5}$/;
  return pattern.test(jeevaId);
};

/**
 * Extracts year from JeevaId
 */
export const extractYearFromJeevaId = (jeevaId) => {
  if (!validateJeevaIdFormat(jeevaId)) {
    return null;
  }
  const year = jeevaId.substring(2, 4);
  const currentCentury = new Date().getFullYear().toString().slice(0, 2);
  return `${currentCentury}${year}`;
};
