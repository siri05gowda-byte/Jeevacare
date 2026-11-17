import HospitalStaff from '../models/HospitalStaff.js';
import User from '../models/User.js';
import StaffRegistrationRequest from '../models/StaffRegistrationRequest.js';

/**
 * Deletes staff records and registration requests whose account no longer exists.
 * They point at nobody, so they only show up as blank rows. Nothing else is touched:
 * a record is removed only when its user is confirmed missing from the database.
 */
export async function removeOrphanedStaffRecords({ logger } = {}) {
  const removed = { staff: 0, requests: 0 };

  for (const [Model, key] of [
    [HospitalStaff, 'staff'],
    [StaffRegistrationRequest, 'requests'],
  ]) {
    const referenced = await Model.distinct('userId');
    if (referenced.length === 0) continue;

    const present = await User.find({ _id: { $in: referenced } }).select('_id');
    const presentIds = new Set(present.map((u) => String(u._id)));
    const missing = referenced.filter((id) => id && !presentIds.has(String(id)));
    if (missing.length === 0) continue;

    const result = await Model.deleteMany({ userId: { $in: missing } });
    removed[key] = result.deletedCount || 0;
    logger?.info(`Removed ${removed[key]} ${key === 'staff' ? 'staff record(s)' : 'registration request(s)'} for ${missing.length} deleted account(s)`);
  }
  return removed;
}

export default removeOrphanedStaffRecords;
