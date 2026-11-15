/**
 * Gives every user a JeevaCare ID, and makes a patient's account and patient record share one ID.
 *
 * The patient dashboard shows the ID on the patient record; Settings shows the ID on the user account.
 * They must be the same number. When they disagree, the patient record wins: that is the ID the
 * patient has already seen. Safe to run on every start: it only changes what is missing or different.
 */
import User from '../models/User.js';
import Patient from '../models/Patient.js';
import { generateJeevaId } from './jeevaIdGenerator.js';
import logger from './logger.js';

const isMissing = (id) => !id || !String(id).trim();

export async function ensureJeevaIds() {
  let usersUpdated = 0;
  let patientsUpdated = 0;

  const setUserId = async (userId, jeevaId) => {
    try {
      await User.updateOne({ _id: userId }, { $set: { jeevaId } });
      usersUpdated++;
    } catch (error) {
      // Another account already holds this ID: leave it alone rather than break the run.
      logger.warn(`JeevaCare ID ${jeevaId} could not be set on user ${userId}: ${error.message}`);
    }
  };
  const setPatientId = async (patientId, jeevaId) => {
    try {
      await Patient.updateOne({ _id: patientId }, { $set: { jeevaId } });
      patientsUpdated++;
    } catch (error) {
      logger.warn(`JeevaCare ID ${jeevaId} could not be set on patient ${patientId}: ${error.message}`);
    }
  };

  // 1. Patients that have an account: one shared ID.
  const patients = await Patient.find({ userId: { $exists: true, $ne: null } }).select('userId jeevaId').lean();
  for (const patient of patients) {
    const user = await User.findById(patient.userId).select('jeevaId').lean();
    if (!user) continue;
    if (!isMissing(patient.jeevaId)) {
      if (user.jeevaId !== patient.jeevaId) await setUserId(user._id, patient.jeevaId);
    } else if (!isMissing(user.jeevaId)) {
      await setPatientId(patient._id, user.jeevaId);
    } else {
      const jeevaId = await generateJeevaId();
      await setUserId(user._id, jeevaId);
      await setPatientId(patient._id, jeevaId);
    }
  }

  // 2. Everyone else without an ID: doctors, admins, staff, patients with no patient record yet.
  const withoutId = await User.find({
    $or: [{ jeevaId: { $exists: false } }, { jeevaId: null }, { jeevaId: '' }],
  }).select('_id').lean();
  for (const user of withoutId) await setUserId(user._id, await generateJeevaId());

  return { usersUpdated, patientsUpdated };
}

export default ensureJeevaIds;
