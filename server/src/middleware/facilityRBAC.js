/**
 * Facility-Scoped RBAC Middleware
 * Enforces role-based access control at the facility level
 * Prevents access to suspended facilities
 * Verifies professional and staff authorization
 */

import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import StaffService from '../services/StaffService.js';
import FacilityService from '../services/FacilityService.js';
import AuditService from '../services/AuditService.js';

/**
 * Middleware: Block access to suspended facilities
 * Usage: app.use(blockSuspendedFacilities)
 */
export const blockSuspendedFacilities = async (req, res, next) => {
  try {
    // Check if request specifies a facility
    const facilityId = req.params.facilityId || req.body.facilityId;

    if (!facilityId) {
      return next(); // No facility specified, continue
    }

    const hospital = await Hospital.findById(facilityId);

    if (!hospital) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    // Block if suspended
    if (hospital.status === 'suspended') {
      await AuditService.logEvent({
        action: 'FACILITY_ACCESS_BLOCKED_SUSPENDED',
        actor: req.user?._id,
        resource: 'Hospital',
        resourceId: facilityId,
        details: {
          facilityId: hospital.facilityId,
          reason: 'Facility is suspended',
        },
      });

      return res.status(403).json({
        error: 'Facility access is currently suspended',
      });
    }

    // Warn if not verified
    if (hospital.verificationStatus !== 'verified') {
      res.locals.facilityVerificationWarning = {
        status: hospital.verificationStatus,
        message: 'Facility verification is pending',
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Require specific role at facility
 * Usage: app.use(requireFacilityRole('doctor'))
 */
export const requireFacilityRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const facilityId = req.params.facilityId || req.body.facilityId;

      if (!facilityId) {
        return res.status(400).json({
          error: 'Facility ID is required',
        });
      }

      // Normalize roles to array
      const roles = Array.isArray(allowedRoles)
        ? allowedRoles
        : [allowedRoles];

      // Check facility exists and is not suspended
      const hospital = await Hospital.findById(facilityId);

      if (!hospital) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      if (hospital.status === 'suspended') {
        return res.status(403).json({
          error: 'Facility access is suspended',
        });
      }

      // Check user has required role at facility
      const staff = await HospitalStaff.findOne({
        userId: req.user._id,
        hospitalId: facilityId,
        role: { $in: roles },
        associationStatus: 'active',
        $or: [
          { endDate: { $exists: false } },
          { endDate: { $gte: new Date() } },
        ],
      });

      if (!staff) {
        await AuditService.logEvent({
          action: 'FACILITY_ROLE_ACCESS_DENIED',
          actor: req.user._id,
          resource: 'Hospital',
          resourceId: facilityId,
          details: {
            requiredRoles: roles,
            facility: hospital.facilityId,
          },
        });

        return res.status(403).json({
          error: `Role ${roles.join(' or ')} is required at this facility`,
        });
      }

      // Attach staff record to request
      req.facilityStaff = staff;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require specific permission at facility
 * Usage: app.use(requireFacilityPermission('createClinicalRecords'))
 */
export const requireFacilityPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
      }

      const facilityId = req.params.facilityId || req.body.facilityId;

      if (!facilityId) {
        return res.status(400).json({
          error: 'Facility ID is required',
        });
      }

      // Check facility exists and is not suspended
      const hospital = await Hospital.findById(facilityId);

      if (!hospital) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      if (hospital.status === 'suspended') {
        return res.status(403).json({
          error: 'Facility access is suspended',
        });
      }

      // Check user has permission at facility
      const hasPermission = await StaffService.hasPermissionAtFacility(
        req.user._id,
        facilityId,
        permissionKey
      );

      if (!hasPermission) {
        await AuditService.logEvent({
          action: 'FACILITY_PERMISSION_DENIED',
          actor: req.user._id,
          resource: 'Hospital',
          resourceId: facilityId,
          details: {
            permissionKey: permissionKey,
            facility: hospital.facilityId,
          },
        });

        return res.status(403).json({
          error: `Permission '${permissionKey}' is required at this facility`,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Verify professional at facility
 * Checks if user is verified professional eligible to perform clinical operations at this facility
 */
export const requireVerifiedProfessionalAtFacility = async (
  req,
  res,
  next
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const facilityId = req.params.facilityId || req.body.facilityId;

    if (!facilityId) {
      return res.status(400).json({
        error: 'Facility ID is required',
      });
    }

    // Check facility exists and is verified
    const hospital = await Hospital.findById(facilityId);

    if (!hospital) {
      return res.status(404).json({ error: 'Facility not found' });
    }

    if (hospital.status === 'suspended') {
      return res.status(403).json({
        error: 'Facility access is suspended',
      });
    }

    if (hospital.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Facility is not verified for clinical operations',
      });
    }

    // Get user's professional profile
    const professional = await HealthcareProfessional.findOne({
      userId: req.user._id,
    });

    if (!professional) {
      return res.status(403).json({
        error: 'User does not have a professional profile',
      });
    }

    // Check professional is verified and active
    if (professional.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Professional profile is not verified',
      });
    }

    if (professional.accountStatus !== 'active') {
      return res.status(403).json({
        error: 'Professional account is suspended or inactive',
      });
    }

    // Check verification not expired
    if (
      professional.verification?.verificationExpiry &&
      new Date() > professional.verification.verificationExpiry
    ) {
      return res.status(403).json({
        error: 'Professional verification has expired',
      });
    }

    // Check staff association is active
    const staff = await HospitalStaff.findOne({
      userId: req.user._id,
      hospitalId: facilityId,
      associationStatus: 'active',
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: new Date() } },
      ],
    });

    if (!staff) {
      return res.status(403).json({
        error: 'User is not an active staff member at this facility',
      });
    }

    // Attach professional and staff to request
    req.professional = professional;
    req.facilityStaff = staff;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Verify professional can perform clinical operations
 * Comprehensive check: verification + credentials + facility verification
 */
export const requireClinicalEligibility = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Ensure professional and staff are loaded
    if (!req.professional || !req.facilityStaff) {
      return res.status(403).json({
        error: 'Professional verification failed. Please re-authenticate.',
      });
    }

    const facilityId = req.params.facilityId || req.body.facilityId;

    if (!facilityId) {
      return res.status(400).json({
        error: 'Facility ID is required',
      });
    }

    // Double-check facility is verified
    const hospital = await Hospital.findById(facilityId);

    if (!hospital || hospital.verificationStatus !== 'verified') {
      return res.status(403).json({
        error: 'Facility is not verified for clinical operations',
      });
    }

    // Check staff has createClinicalRecords permission
    if (!req.facilityStaff.permissions.createClinicalRecords) {
      await AuditService.logEvent({
        action: 'CLINICAL_OPERATION_DENIED_NO_PERMISSION',
        actor: req.user._id,
        resource: 'Hospital',
        resourceId: facilityId,
        details: {
          professionalId: req.professional.professionalId,
          staff: req.facilityStaff._id,
        },
      });

      return res.status(403).json({
        error: 'Permission to create clinical records is not granted',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Enforce facility verification
 * Prevents operations at unverified facilities
 */
export const enforceFacilityVerification = (requiredStatus = 'verified') => {
  return async (req, res, next) => {
    try {
      const facilityId = req.params.facilityId || req.body.facilityId;

      if (!facilityId) {
        return res.status(400).json({
          error: 'Facility ID is required',
        });
      }

      const hospital = await Hospital.findById(facilityId);

      if (!hospital) {
        return res.status(404).json({ error: 'Facility not found' });
      }

      if (hospital.verificationStatus !== requiredStatus) {
        return res.status(403).json({
          error: `Facility verification status '${requiredStatus}' is required for this operation`,
          current: hospital.verificationStatus,
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Middleware: Require hospital admin role
 * Usage: app.use(requireHospitalAdmin)
 */
export const requireHospitalAdmin = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const facilityId = req.params.facilityId || req.body.facilityId;

    if (!facilityId) {
      return res.status(400).json({
        error: 'Facility ID is required',
      });
    }

    const isAdmin = await StaffService.hasRoleAtFacility(
      req.user._id,
      facilityId,
      'hospital_admin'
    );

    if (!isAdmin) {
      return res.status(403).json({
        error: 'Hospital administrator role is required',
      });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Middleware: Attach facility context
 * Loads facility info and attaches to request
 */
export const attachFacilityContext = async (req, res, next) => {
  try {
    const facilityId = req.params.facilityId || req.body.facilityId;

    if (!facilityId) {
      return next(); // Optional context
    }

    const hospital = await Hospital.findById(facilityId);

    if (hospital) {
      req.facility = hospital;
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default {
  blockSuspendedFacilities,
  requireFacilityRole,
  requireFacilityPermission,
  requireVerifiedProfessionalAtFacility,
  requireClinicalEligibility,
  enforceFacilityVerification,
  requireHospitalAdmin,
  attachFacilityContext,
};

