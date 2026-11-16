// Patients arrive in a few shapes (search results, assigned-patient lists, full profiles).
export function patientName(patient) {
  const identity = patient?.personalIdentity;
  const full = `${identity?.firstName || ''} ${identity?.lastName || ''}`.trim();
  return full || patient?.name || 'Unnamed patient';
}

export function patientInitials(patient) {
  return patientName(patient)
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('');
}

// The hospital an assigned patient is linked to, when the list says which one.
export function assignedFacilityId(patient, doctorId) {
  const links = (patient?.assignedDoctors || []).filter((a) => a.status === 'active');
  const mine = links.find((a) => String(a.doctorId?._id || a.doctorId) === String(doctorId)) || links[0];
  return mine?.facilityId?._id || mine?.facilityId || null;
}
