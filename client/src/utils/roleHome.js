// Where each kind of account belongs after signing in, and when they wander onto a page that is not theirs.
export function homeFor(role) {
  switch (role) {
    case 'DOCTOR':
    case 'NURSE':
    case 'LAB_TECHNICIAN':
    case 'RADIOLOGY_TECHNICIAN':
      return '/provider';
    case 'HOSPITAL_ADMIN':
      return '/hospital/dashboard';
    case 'SYSTEM_ADMIN':
    case 'ADMIN':
      return '/integrated-dashboard';
    case 'EMERGENCY':
      return '/emergency';
    default:
      return '/dashboard';
  }
}

export const CLINICAL_ROLES = ['DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN'];
export const ADMIN_ROLES = ['HOSPITAL_ADMIN', 'SYSTEM_ADMIN', 'ADMIN'];
