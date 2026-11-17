import HospitalStaff from '../models/HospitalStaff.js';

/**
 * The hospitals an admin looks after: those on their staff records and on their profile.
 * A system admin looks after all of them, which is returned as null (no restriction).
 */
export async function adminFacilityIds(user) {
  if (user.role === 'SYSTEM_ADMIN') return null;
  const records = await HospitalStaff.find({
    userId: user._id,
    role: 'hospital_admin',
    associationStatus: 'active',
  }).select('hospitalId');
  return [...records.map((r) => r.hospitalId), user.facilityId, user.profile?.hospitalId].filter(Boolean);
}
