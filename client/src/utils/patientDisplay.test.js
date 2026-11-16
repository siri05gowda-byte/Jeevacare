import { describe, expect, it } from 'vitest';
import { assignedFacilityId, patientInitials, patientName } from './patientDisplay';

describe('patientDisplay', () => {
  it('names a patient from any of the shapes the app receives', () => {
    expect(patientName({ personalIdentity: { firstName: 'Divya', lastName: 'Sharma' } })).toBe('Divya Sharma');
    expect(patientName({ name: 'Meera Singh' })).toBe('Meera Singh');
    expect(patientName({})).toBe('Unnamed patient');
  });

  it('makes initials', () => {
    expect(patientInitials({ name: 'Meera Singh' })).toBe('MS');
  });

  it('finds the hospital an assigned patient is linked to for this doctor', () => {
    const patient = {
      assignedDoctors: [
        { status: 'inactive', doctorId: 'd1', facilityId: { _id: 'old' } },
        { status: 'active', doctorId: { _id: 'd1' }, facilityId: { _id: 'h1' } },
      ],
    };
    expect(assignedFacilityId(patient, 'd1')).toBe('h1');
    expect(assignedFacilityId({}, 'd1')).toBeNull();
  });
});
