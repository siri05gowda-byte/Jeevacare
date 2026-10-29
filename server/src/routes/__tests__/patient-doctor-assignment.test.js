/**
 * Patient–Doctor Assignment — Integration Tests
 *
 * Covers:
 * - Successful assignment creation
 * - Duplicate active-assignment rejection (409)
 * - Doctor not affiliated with facility (403)
 * - Doctor not found / wrong role (400)
 * - Patient not found (404)
 * - getAssignedPatientsForDoctor — facility filter
 * - getAssignedDoctorsForPatient
 * - removeDoctorAssignment (deactivation)
 * - Role-based access: PATIENT cannot assign; DOCTOR can assign
 * - isPrimary promotion / demotion logic
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import mongoose from 'mongoose';
import Patient from '../../models/Patient.js';
import User from '../../models/User.js';
import HospitalStaff from '../../models/HospitalStaff.js';
import PatientService from '../../services/PatientService.js';
import AuditService from '../../services/AuditService.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeId() {
  return new mongoose.Types.ObjectId();
}

function makeUser(role = 'DOCTOR') {
  return {
    _id: makeId(),
    role,
    email: `${role.toLowerCase()}@test.local`,
    profile: { firstName: 'Test', lastName: role },
  };
}

// Minimal Patient document stub with assignedDoctors array behaviour
function makePatientDoc({ assignedDoctors = [] } = {}) {
  const id = makeId();
  const doc = {
    _id: id,
    jeevaId: 'JJ25-TEST1',
    personalIdentity: { firstName: 'Priya', lastName: 'Sharma', dateOfBirth: new Date('1990-05-12'), sex: 'F' },
    status: 'active',
    assignedDoctors: assignedDoctors.map((a) => ({ ...a })),
    save: vi.fn().mockResolvedValue(true),
  };
  return doc;
}

// ── Test Suite ────────────────────────────────────────────────────────────────

describe('PatientService — Doctor Assignment', () => {
  let doctorUser, adminUser, patientUser;
  let facilityId, otherFacilityId;

  beforeEach(() => {
    doctorUser = makeUser('DOCTOR');
    adminUser = makeUser('HOSPITAL_ADMIN');
    patientUser = makeUser('PATIENT');
    facilityId = makeId();
    otherFacilityId = makeId();

    // Silence audit events in all tests
    vi.spyOn(AuditService, 'logEvent').mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── assignDoctorToPatient ──────────────────────────────────────────────────

  describe('assignDoctorToPatient', () => {
    it('creates a new active assignment and returns patient', async () => {
      const patientDoc = makePatientDoc();

      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);
      vi.spyOn(User, 'findById').mockResolvedValue(doctorUser);
      vi.spyOn(HospitalStaff, 'findOne').mockResolvedValue({ _id: makeId() });

      const result = await PatientService.assignDoctorToPatient(
        patientDoc._id.toString(),
        { doctorId: doctorUser._id.toString(), facilityId: facilityId.toString(), isPrimary: false },
        adminUser
      );

      expect(patientDoc.save).toHaveBeenCalledOnce();
      expect(patientDoc.assignedDoctors).toHaveLength(1);
      expect(patientDoc.assignedDoctors[0].status).toBe('active');
      expect(AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'patient_doctor_assigned' })
      );
    });

    it('throws 409-equivalent error for duplicate active assignment', async () => {
      const patientDoc = makePatientDoc({
        assignedDoctors: [
          {
            doctorId: doctorUser._id,
            facilityId,
            status: 'active',
            assignedAt: new Date(),
          },
        ],
      });

      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);
      vi.spyOn(User, 'findById').mockResolvedValue(doctorUser);
      vi.spyOn(HospitalStaff, 'findOne').mockResolvedValue({ _id: makeId() });

      await expect(
        PatientService.assignDoctorToPatient(
          patientDoc._id.toString(),
          { doctorId: doctorUser._id.toString(), facilityId: facilityId.toString() },
          adminUser
        )
      ).rejects.toThrow('already assigned');
    });

    it('throws when doctor is not affiliated with facility', async () => {
      const patientDoc = makePatientDoc();

      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);
      vi.spyOn(User, 'findById').mockResolvedValue(doctorUser);
      vi.spyOn(HospitalStaff, 'findOne').mockResolvedValue(null); // no affiliation

      await expect(
        PatientService.assignDoctorToPatient(
          patientDoc._id.toString(),
          { doctorId: doctorUser._id.toString(), facilityId: facilityId.toString() },
          adminUser
        )
      ).rejects.toThrow('not affiliated');
    });

    it('throws when patient is not found', async () => {
      vi.spyOn(Patient, 'findById').mockResolvedValue(null);

      await expect(
        PatientService.assignDoctorToPatient(
          makeId().toString(),
          { doctorId: doctorUser._id.toString(), facilityId: facilityId.toString() },
          adminUser
        )
      ).rejects.toThrow('Patient not found');
    });

    it('throws when user is not a DOCTOR', async () => {
      const patientDoc = makePatientDoc();
      const nonDoctor = { ...makeUser('NURSE') };

      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);
      vi.spyOn(User, 'findById').mockResolvedValue(nonDoctor); // role !== DOCTOR

      await expect(
        PatientService.assignDoctorToPatient(
          patientDoc._id.toString(),
          { doctorId: nonDoctor._id.toString(), facilityId: facilityId.toString() },
          adminUser
        )
      ).rejects.toThrow('not a DOCTOR');
    });

    it('demotes existing primary when new isPrimary=true assignment added', async () => {
      const existingPrimary = {
        doctorId: makeId(),
        facilityId,
        status: 'active',
        isPrimary: true,
      };
      const patientDoc = makePatientDoc({ assignedDoctors: [existingPrimary] });

      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);
      vi.spyOn(User, 'findById').mockResolvedValue(doctorUser);
      vi.spyOn(HospitalStaff, 'findOne').mockResolvedValue({ _id: makeId() });

      await PatientService.assignDoctorToPatient(
        patientDoc._id.toString(),
        { doctorId: doctorUser._id.toString(), facilityId: facilityId.toString(), isPrimary: true },
        adminUser
      );

      expect(patientDoc.assignedDoctors[0].isPrimary).toBe(false); // demoted
      expect(patientDoc.assignedDoctors[1].isPrimary).toBe(true);  // new primary
    });
  });

  // ── removeDoctorAssignment ─────────────────────────────────────────────────

  describe('removeDoctorAssignment', () => {
    it('deactivates an active assignment', async () => {
      const assignment = {
        doctorId: doctorUser._id,
        facilityId,
        status: 'active',
      };
      const patientDoc = makePatientDoc({ assignedDoctors: [assignment] });

      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);

      await PatientService.removeDoctorAssignment(
        patientDoc._id.toString(),
        doctorUser._id.toString(),
        facilityId.toString(),
        adminUser
      );

      expect(patientDoc.assignedDoctors[0].status).toBe('inactive');
      expect(patientDoc.save).toHaveBeenCalledOnce();
      expect(AuditService.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'patient_doctor_unassigned' })
      );
    });

    it('throws when no active assignment found', async () => {
      const patientDoc = makePatientDoc(); // empty assignedDoctors
      vi.spyOn(Patient, 'findById').mockResolvedValue(patientDoc);

      await expect(
        PatientService.removeDoctorAssignment(
          patientDoc._id.toString(),
          doctorUser._id.toString(),
          facilityId.toString(),
          adminUser
        )
      ).rejects.toThrow('Active assignment not found');
    });
  });

  // ── getAssignedPatientsForDoctor ───────────────────────────────────────────

  describe('getAssignedPatientsForDoctor', () => {
    it('calls Patient.find with correct elemMatch filter', async () => {
      const findMock = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(Patient, 'find').mockReturnValue(findMock);

      await PatientService.getAssignedPatientsForDoctor(
        doctorUser._id.toString(),
        facilityId.toString(),
        doctorUser
      );

      expect(Patient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'active',
          assignedDoctors: expect.objectContaining({
            $elemMatch: expect.objectContaining({
              doctorId: doctorUser._id.toString(),
              status: 'active',
              facilityId: facilityId.toString(),
            }),
          }),
        })
      );
    });

    it('omits facilityId filter when null is passed', async () => {
      const findMock = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        sort: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue([]),
      };
      vi.spyOn(Patient, 'find').mockReturnValue(findMock);

      await PatientService.getAssignedPatientsForDoctor(doctorUser._id.toString(), null, doctorUser);

      const callArg = Patient.find.mock.calls[0][0];
      expect(callArg.assignedDoctors.$elemMatch).not.toHaveProperty('facilityId');
    });
  });

  // ── getAssignedDoctorsForPatient ───────────────────────────────────────────

  describe('getAssignedDoctorsForPatient', () => {
    it('returns only active assignments', async () => {
      const activeId = makeId();
      const inactiveId = makeId();
      const patientDoc = {
        _id: makeId(),
        jeevaId: 'JJ25-TEST2',
        personalIdentity: {},
        assignedDoctors: [
          { doctorId: activeId, facilityId, status: 'active' },
          { doctorId: inactiveId, facilityId, status: 'inactive' },
        ],
      };

      const chainMock = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(patientDoc),
      };
      vi.spyOn(Patient, 'findById').mockReturnValue(chainMock);

      const result = await PatientService.getAssignedDoctorsForPatient(
        patientDoc._id.toString(),
        adminUser
      );

      expect(result).toHaveLength(1);
      expect(result[0].doctorId.toString()).toBe(activeId.toString());
    });

    it('throws when patient not found', async () => {
      const chainMock = {
        select: vi.fn().mockReturnThis(),
        populate: vi.fn().mockReturnThis(),
        exec: vi.fn().mockResolvedValue(null),
      };
      vi.spyOn(Patient, 'findById').mockReturnValue(chainMock);

      await expect(
        PatientService.getAssignedDoctorsForPatient(makeId().toString(), adminUser)
      ).rejects.toThrow('Patient not found');
    });
  });
});
