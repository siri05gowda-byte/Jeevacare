import logger from './logger.js';

/**
 * Ensures that a healthcare professional user (DOCTOR, NURSE, etc.) has an active HospitalStaff association.
 * If one does not exist, it finds the verified hospital (or any hospital) and creates an active association.
 * Also ensures that a HealthcareProfessional profile exists for doctors.
 * 
 * @param {Object} user - User document or user object with _id, role, etc.
 * @returns {Promise<Object|null>} staff association or null
 */
export async function ensureStaffAssociation(user) {
  if (!user || !user._id) return null;
  const professionalRoles = ['DOCTOR', 'NURSE', 'LAB_TECHNICIAN', 'RADIOLOGY_TECHNICIAN', 'PHARMACIST', 'HOSPITAL_ADMIN'];
  if (!professionalRoles.includes(user.role)) return null;

  try {
    const HospitalStaff = (await import('../models/HospitalStaff.js')).default;
    const Hospital = (await import('../models/Hospital.js')).default;

    // 1. Check for existing active staff association
    const activeQuery = HospitalStaff.findOne({
      userId: user._id,
      associationStatus: 'active',
      employmentStatus: 'active',
    });
    let staff = typeof activeQuery?.sort === 'function' ? await activeQuery.sort({ startDate: -1 }) : await activeQuery;

    // 2. If no active association, check for any association for this user and activate it
    if (!staff) {
      const anyQuery = HospitalStaff.findOne({ userId: user._id });
      staff = typeof anyQuery?.sort === 'function' ? await anyQuery.sort({ createdAt: -1 }) : await anyQuery;
      if (staff && typeof staff.save === 'function') {
        staff.associationStatus = 'active';
        staff.employmentStatus = 'active';
        await staff.save();
        logger.info(`Reactivated HospitalStaff association for ${user.email || user._id}`);
      }
    }

    // 3. If still no association, auto-link to a verified hospital (or any hospital)
    if (!staff && process.env.NODE_ENV !== 'test') {
      let hospital = await Hospital.findOne({ verificationStatus: 'verified' });
      if (!hospital) {
        hospital = await Hospital.findOne();
      }

      if (hospital) {
        const roleMapping = {
          DOCTOR: 'doctor',
          NURSE: 'nurse',
          LAB_TECHNICIAN: 'lab_technician',
          RADIOLOGY_TECHNICIAN: 'radiology_technician',
          PHARMACIST: 'pharmacist',
          HOSPITAL_ADMIN: 'hospital_admin',
        };

        const newStaff = new HospitalStaff({
          userId: user._id,
          hospitalId: hospital._id,
          role: roleMapping[user.role] || 'other_staff',
          associationStatus: 'active',
          employmentStatus: 'active',
          startDate: new Date(),
          department: {
            name: user.role === 'DOCTOR' ? 'General Medicine' : 'General Care',
          },
          permissions: {
            viewPatientRecords: true,
            createClinicalRecords: true,
            createDiagnosis: true,
            createPrescription: true,
            createLaboratoryResults: true,
            createRadiologyReports: true,
            manageAppointments: true,
            manageStaff: user.role === 'HOSPITAL_ADMIN',
            manageFacility: user.role === 'HOSPITAL_ADMIN',
            accessEmergencyProfiles: true,
            approveEmergencyAccess: true,
          },
          approvalInformation: {
            approvedAt: new Date(),
            approvalMethod: 'automatic',
          },
        });

        staff = await newStaff.save();
        logger.info(`Auto-associated healthcare professional ${user.email || user._id} with hospital ${hospital.name} (${hospital._id})`);
      }
    }

    // 4. Ensure HealthcareProfessional profile exists for doctors
    if (user.role === 'DOCTOR' && process.env.NODE_ENV !== 'test') {
      try {
        const HealthcareProfessional = (await import('../models/HealthcareProfessional.js')).default;
        let professional = await HealthcareProfessional.findOne({ userId: user._id });
        if (!professional) {
          professional = new HealthcareProfessional({
            userId: user._id,
            professionalId: `DOC-${user._id.toString().slice(-6).toUpperCase()}`,
            professionalType: 'DOCTOR',
            specialization: 'General Practitioner',
            verificationStatus: 'verified',
            facilityAssociations: staff?.hospitalId ? [staff.hospitalId] : [],
          });
          await professional.save();
          logger.info(`Auto-created HealthcareProfessional profile for doctor ${user.email || user._id}`);
        }
      } catch (profErr) {
        logger.warn(`Failed to auto-create HealthcareProfessional profile: ${profErr.message}`);
      }
    }

    if (staff) {
      user.facilityId = staff.hospitalId;
      user.staffId = staff._id;
    }

    return staff;
  } catch (error) {
    logger.warn(`Failed to ensure staff association for user ${user._id}: ${error.message}`);
    return null;
  }
}
