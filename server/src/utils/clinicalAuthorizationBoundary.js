/**
 * Clinical Record Authorization Boundary
 * Comprehensive authorization checks for clinical record creation
 * 
 * Boundary enforces:
 * 1. USER: Authenticated, active account
 * 2. PROFESSIONAL: Verified profile, active account, non-expired verification
 * 3. FACILITY: Verified, active, not suspended
 * 4. STAFF: Active association, not suspended, not revoked
 * 5. ROLE: Has required clinical role
 * 6. PERMISSIONS: Has explicit permission to create clinical records
 * 7. CREDENTIALS: Has at least one valid, verified, non-expired credential
 * 8. PATIENT_ACCESS: User has access to patient's record
 * 9. PATIENT_VERIFICATION: Patient record is accessible (not restricted)
 */

import HealthcareProfessional from '../models/HealthcareProfessional.js';
import HospitalStaff from '../models/HospitalStaff.js';
import Hospital from '../models/Hospital.js';
import Patient from '../models/Patient.js';
import User from '../models/User.js';
import ProfessionalCredential from '../models/ProfessionalCredential.js';
import AuditService from '../services/AuditService.js';

class ClinicalAuthorizationBoundary {
  /**
   * Check if user can create official clinical records
   * Returns: { authorized: boolean, error?: string, details: {} }
   */
  static async canCreateOfficialClinicalRecord(
    userId,
    hospitalId,
    patientId,
    auditDetails = {}
  ) {
    try {
      const result = {
        authorized: false,
        checks: {},
        error: null,
      };

      // ===== CHECK 1: USER =====
      let user;
      try {
        user = await User.findById(userId);
      } catch (e) {
        result.checks.user = {
          passed: false,
          error: `Failed to look up user: ${e.message}`,
        };
        result.error = `Failed to look up user: ${e.message}`;
        return result;
      }

      if (!user) {
        result.checks.user = {
          passed: false,
          error: 'User not found',
        };
        result.error = 'User not found';
        return result;
      }

      if (user.status !== 'active') {
        result.checks.user = {
          passed: false,
          error: `User account is ${user.status}`,
        };
        result.error = `User account is ${user.status}`;
        return result;
      }

      result.checks.user = { passed: true };

      // ===== CHECK 2: PROFESSIONAL =====
      let professional;
      try {
        professional = await HealthcareProfessional.findOne({
          userId: userId,
        });
      } catch (e) {
        result.checks.professional = {
          passed: false,
          error: `Failed to look up professional profile: ${e.message}`,
        };
        result.error = `Failed to look up professional profile: ${e.message}`;
        return result;
      }

      if (!professional) {
        result.checks.professional = {
          passed: false,
          error: 'No professional profile found',
        };
        result.error = 'No professional profile found';
        return result;
      }

      if (professional.verificationStatus !== 'verified') {
        result.checks.professional = {
          passed: false,
          error: `Professional verification status is ${professional.verificationStatus}`,
        };
        result.error = `Professional verification status is ${professional.verificationStatus}`;
        return result;
      }

      if (professional.accountStatus !== 'active') {
        result.checks.professional = {
          passed: false,
          error: `Professional account is ${professional.accountStatus}`,
        };
        result.error = `Professional account is ${professional.accountStatus}`;
        return result;
      }

      // Check verification not expired
      if (
        professional.verification?.verificationExpiry &&
        new Date() > professional.verification.verificationExpiry
      ) {
        result.checks.professional = {
          passed: false,
          error: 'Professional verification has expired',
        };
        result.error = 'Professional verification has expired';
        return result;
      }

      result.checks.professional = {
        passed: true,
        professionalId: professional.professionalId,
      };

      // ===== CHECK 3: FACILITY =====
      let hospital;
      try {
        hospital = await Hospital.findById(hospitalId);
      } catch (e) {
        result.checks.facility = {
          passed: false,
          error: `Failed to look up facility: ${e.message}`,
        };
        result.error = `Failed to look up facility: ${e.message}`;
        return result;
      }

      if (!hospital) {
        result.checks.facility = {
          passed: false,
          error: 'Facility not found',
        };
        result.error = 'Facility not found';
        return result;
      }

      if (hospital.verificationStatus !== 'verified') {
        result.checks.facility = {
          passed: false,
          error: `Facility verification status is ${hospital.verificationStatus}`,
        };
        result.error = `Facility verification status is ${hospital.verificationStatus}`;
        return result;
      }

      if (hospital.status !== 'active') {
        result.checks.facility = {
          passed: false,
          error: `Facility is ${hospital.status}`,
        };
        result.error = `Facility is ${hospital.status}`;
        return result;
      }

      result.checks.facility = {
        passed: true,
        facilityId: hospital.facilityId,
      };

      // ===== CHECK 4: STAFF ASSOCIATION =====
      let staff;
      try {
        staff = await HospitalStaff.findOne({
          userId: userId,
          hospitalId: hospitalId,
          $or: [
            { endDate: { $exists: false } },
            { endDate: { $gte: new Date() } },
          ],
        });
      } catch (e) {
        result.checks.staff = {
          passed: false,
          error: `Failed to look up staff association: ${e.message}`,
        };
        result.error = `Failed to look up staff association: ${e.message}`;
        return result;
      }

      if (!staff) {
        result.checks.staff = {
          passed: false,
          error: 'No active staff association at facility',
        };
        result.error = 'No active staff association at facility';
        return result;
      }

      if (staff.associationStatus !== 'active') {
        result.checks.staff = {
          passed: false,
          error: `Staff association is ${staff.associationStatus}`,
        };
        result.error = `Staff association is ${staff.associationStatus}`;
        return result;
      }

      result.checks.staff = {
        passed: true,
        role: staff.role,
        staffId: staff._id,
      };

      // ===== CHECK 5: ROLE =====
      const clinicalRoles = [
        'doctor',
        'nurse',
        'pharmacist',
        'lab_technician',
        'radiology_technician',
      ];

      if (!clinicalRoles.includes(staff.role)) {
        result.checks.role = {
          passed: false,
          error: `Role ${staff.role} is not authorized for clinical records`,
        };
        result.error = `Role ${staff.role} is not authorized for clinical records`;
        return result;
      }

      result.checks.role = { passed: true, role: staff.role };

      // ===== CHECK 6: PERMISSIONS =====
      if (!staff.permissions || !staff.permissions.createClinicalRecords) {
        result.checks.permissions = {
          passed: false,
          error: 'Permission to create clinical records is not granted',
        };
        result.error = 'Permission to create clinical records is not granted';
        return result;
      }

      result.checks.permissions = { passed: true };

      // ===== CHECK 7: CREDENTIALS =====
      let validCredential;
      try {
        validCredential = await ProfessionalCredential.findOne({
          professionalId: professional._id,
          status: 'verified',
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: new Date() } },
          ],
        });
      } catch (e) {
        result.checks.credentials = {
          passed: false,
          error: `Failed to look up credentials: ${e.message}`,
        };
        result.error = `Failed to look up credentials: ${e.message}`;
        return result;
      }

      if (!validCredential) {
        result.checks.credentials = {
          passed: false,
          error: 'No valid verified professional credentials found',
        };
        result.error = 'No valid verified professional credentials found';
        return result;
      }

      result.checks.credentials = {
        passed: true,
        credentialType: validCredential.credentialType,
      };

      // ===== CHECK 8: PATIENT ACCESS =====
      let patient;
      try {
        patient = await Patient.findById(patientId);
      } catch (e) {
        result.checks.patientAccess = {
          passed: false,
          error: `Failed to look up patient: ${e.message}`,
        };
        result.error = `Failed to look up patient: ${e.message}`;
        return result;
      }

      if (!patient) {
        result.checks.patientAccess = {
          passed: false,
          error: 'Patient not found',
        };
        result.error = 'Patient not found';
        return result;
      }

      // Check if professional has access to patient
      // For now, this is facility-based: if patient is registered at this facility,
      // active staff at this facility can access
      const patientAtFacility = patient.facilities && Array.isArray(patient.facilities) && patient.facilities.some(
        (f) => f.facilityId?.toString() === hospitalId.toString()
      );

      if (!patientAtFacility) {
        result.checks.patientAccess = {
          passed: false,
          error: 'Patient is not registered at this facility',
        };
        result.error = 'Patient is not registered at this facility';
        return result;
      }

      result.checks.patientAccess = { passed: true };

      // ===== CHECK 9: PATIENT VERIFICATION =====
      if (patient.status === 'restricted' || patient.status === 'deleted') {
        result.checks.patientVerification = {
          passed: false,
          error: `Patient record is ${patient.status}`,
        };
        result.error = `Patient record is ${patient.status}`;
        return result;
      }

      result.checks.patientVerification = { passed: true };

      // ===== ALL CHECKS PASSED =====
      result.authorized = true;

      // Log authorization success
      await AuditService.logEvent({
        action: 'clinical_record_accessed',
        actor: userId,
        resource: 'ClinicalRecord',
        details: {
          patientId: patientId,
          hospitalId: hospital.facilityId,
          professionalId: professional.professionalId,
          role: staff.role,
          ...auditDetails,
        },
      });

      return result;
    } catch (error) {
      console.error(
        `Error in clinical authorization boundary: ${error.message}`
      );
      return {
        authorized: false,
        error: `Authorization check failed: ${error.message}`,
        checks: {},
      };
    }
  }

  /**
   * Get detailed authorization report (for debugging/audit)
   */
  static async getAuthorizationReport(userId, hospitalId, patientId) {
    const result = await this.canCreateOfficialClinicalRecord(
      userId,
      hospitalId,
      patientId
    );

    const report = {
      timestamp: new Date(),
      userId: userId,
      hospitalId: hospitalId,
      patientId: patientId,
      authorized: result.authorized,
      error: result.error,
      checks: result.checks,
      summary: {
        passedChecks: Object.values(result.checks).filter(
          (c) => c.passed === true
        ).length,
        totalChecks: Object.values(result.checks).length,
      },
    };

    return report;
  }

  /**
   * Require clinical authorization
   * Middleware wrapper
   */
  static requireClinicalAuthorization() {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({ error: 'Not authenticated' });
        }

        const { hospitalId, patientId } = req.body;

        if (!hospitalId || !patientId) {
          return res.status(400).json({
            error: 'hospitalId and patientId are required',
          });
        }

        const authResult = await this.canCreateOfficialClinicalRecord(
          req.user._id,
          hospitalId,
          patientId,
          {
            endpoint: req.path,
            method: req.method,
          }
        );

        if (!authResult.authorized) {
          return res.status(403).json({
            error: authResult.error,
            checks: authResult.checks,
          });
        }

        // Attach authorization result to request
        req.clinicalAuthorization = authResult;
        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Check if user can access a patient's records (for AI summaries, readings, etc.)
   * Less restrictive than creating clinical records - patient can access their own
   * Returns: { authorized: boolean, error?: string, user: userObject }
   */
  static async canAccessPatientRecords(userId, patientId) {
    try {
      // ===== CHECK 1: USER EXISTS AND IS ACTIVE =====
      let user;
      try {
        user = await User.findById(userId);
      } catch (e) {
        return {
          authorized: false,
          error: `Failed to look up user: ${e.message}`,
          user: null,
        };
      }

      if (!user) {
        return {
          authorized: false,
          error: 'User not found',
          user: null,
        };
      }

      if (user.status !== 'active') {
        return {
          authorized: false,
          error: `User account is ${user.status}`,
          user: null,
        };
      }

      // ===== CHECK 2: PATIENT EXISTS =====
      let patient;
      try {
        patient = await Patient.findById(patientId);
      } catch (e) {
        return {
          authorized: false,
          error: `Failed to look up patient: ${e.message}`,
          user,
        };
      }

      if (!patient) {
        return {
          authorized: false,
          error: 'Patient not found',
          user,
        };
      }

      if (patient.status === 'restricted' || patient.status === 'deleted') {
        return {
          authorized: false,
          error: `Patient record is ${patient.status}`,
          user,
        };
      }

      // ===== CHECK 3: ACCESS CONTROL =====
      // Case 1: Patient accessing their own records
      if (user._id.toString() === patient.userId?.toString()) {
        return {
          authorized: true,
          error: null,
          user,
          accessType: 'own_records',
        };
      }

      // Case 2: Guardian accessing dependent's records
      const GuardianRelationship = (await import('../models/GuardianRelationship.js')).default;
      const guardianRel = await GuardianRelationship.findOne({
        guardianId: userId,
        dependentPatientId: patientId,
        status: 'verified',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      if (guardianRel) {
        return {
          authorized: true,
          error: null,
          user,
          accessType: 'guardian_records',
        };
      }

      // Case 3: Healthcare professional at patient's facility
      try {
        const professional = await HealthcareProfessional.findOne({
          userId: userId,
          verificationStatus: 'verified',
          accountStatus: 'active',
        });

        if (!professional) {
          return {
            authorized: false,
            error: 'User is not a verified healthcare professional',
            user,
          };
        }

        // Check if professional has active credential
        const validCredential = await ProfessionalCredential.findOne({
          professionalId: professional._id,
          status: 'verified',
          $or: [
            { expiryDate: { $exists: false } },
            { expiryDate: { $gt: new Date() } },
          ],
        });

        if (!validCredential) {
          return {
            authorized: false,
            error: 'Professional does not have valid credentials',
            user,
          };
        }

        // Check if patient is registered at a facility where professional is active
        if (patient.facilities && Array.isArray(patient.facilities)) {
          let sharedFacility = false;
          
          for (const pf of patient.facilities) {
            const staffRecord = await HospitalStaff.findOne({
              userId: userId,
              hospitalId: pf.facilityId,
              associationStatus: 'active',
              $or: [
                { endDate: { $exists: false } },
                { endDate: { $gte: new Date() } },
              ],
            });

            if (staffRecord) {
              sharedFacility = true;
              break;
            }
          }

          if (sharedFacility) {
            return {
              authorized: true,
              error: null,
              user,
              accessType: 'professional_facility_records',
            };
          }
        }

        return {
          authorized: false,
          error: 'Professional and patient do not share a facility',
          user,
        };
      } catch (e) {
        return {
          authorized: false,
          error: `Failed to verify professional status: ${e.message}`,
          user,
        };
      }
    } catch (error) {
      return {
        authorized: false,
        error: `Authorization check failed: ${error.message}`,
        user: null,
      };
    }
  }
}

export default ClinicalAuthorizationBoundary;
