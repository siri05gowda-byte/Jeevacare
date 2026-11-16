/**
 * Staff Registration Service
 * Handles healthcare professional registration requests and approvals
 */

import StaffRegistrationRequest from '../models/StaffRegistrationRequest.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import HealthcareProfessional from '../models/HealthcareProfessional.js';
import ProfessionalCredential from '../models/ProfessionalCredential.js';
import Notification from '../models/Notification.js';
import AuditService from './AuditService.js';
import StaffService from './StaffService.js';
import logger from '../utils/logger.js';
import { ConflictError } from '../utils/errors.js';
import GoogleSheetsService from './GoogleSheetsService.js';

// Registration role -> HealthcareProfessional.professionalType
const PROFESSIONAL_TYPES = {
  doctor: 'doctor',
  nurse: 'nurse',
  pharmacist: 'pharmacist',
  lab_technician: 'lab_technician',
  radiology_technician: 'radiology_technician',
  paramedic: 'paramedic',
};

// What each kind of approved staff member may do at the hospital.
const ROLE_PERMISSIONS = {
  doctor: {
    viewPatientRecords: true,
    createClinicalRecords: true,
    createDiagnosis: true,
    createPrescription: true,
    manageAppointments: true,
    accessEmergencyProfiles: true,
  },
  nurse: { viewPatientRecords: true, createClinicalRecords: true, manageAppointments: true },
  pharmacist: { viewPatientRecords: true },
  lab_technician: { viewPatientRecords: true },
  radiology_technician: { viewPatientRecords: true },
  paramedic: { viewPatientRecords: true, accessEmergencyProfiles: true },
  reception_staff: { manageAppointments: true },
};

// A notification must never make the request itself fail.
async function notify({ userId, type, title, message, link, metadata }) {
  try {
    await Notification.createNotification({ userId, type, title, message, link, metadata });
  } catch (err) {
    logger.warn(`Staff registration notification not sent: ${err.message}`);
  }
}

class StaffRegistrationService {
  /**
   * Marks an approved applicant as verified: the user, a healthcare professional
   * profile and (for a licence number) a verified credential. Safe to run twice.
   */
  static async activateInvitedStaff(staff, user, approvedBy) {
    if (!Object.values(staff.permissions || {}).some(Boolean) && ROLE_PERMISSIONS[staff.role]) {
      staff.permissions = ROLE_PERMISSIONS[staff.role];
      await staff.save();
    }
    let active = staff;
    if (staff.associationStatus !== 'active') {
      active = await StaffService.approveStaffAssociation(
        staff._id,
        { approvalMethod: 'facility_admin' },
        approvedBy
      );
    }
    const fallbackName = (user.email || 'Staff').split('@')[0];
    await StaffRegistrationService.verifyApprovedStaff(
      {
        userId: user._id,
        firstName: user.profile?.firstName || fallbackName,
        lastName: user.profile?.lastName || 'Staff',
        email: user.email,
        phone: user.profile?.phone,
        requestedRole: staff.role,
        specialization: Array.isArray(staff.specialization) ? staff.specialization : [],
      },
      active
    );
    // If they had also asked to join this hospital, that request is now settled.
    await StaffRegistrationRequest.updateMany(
      { userId: user._id, hospitalId: staff.hospitalId, status: 'pending' },
      { $set: { status: 'approved', reviewedAt: new Date(), reviewedBy: approvedBy, reviewerRole: 'hospital_admin' } }
    );
    return active;
  }

  static async verifyApprovedStaff(request, staffAssociation) {
    await User.updateOne(
      { _id: request.userId },
      { $set: { verificationStatus: 'verified' } }
    );

    let professional = await HealthcareProfessional.findOne({ userId: request.userId });
    if (!professional) {
      professional = new HealthcareProfessional({
        userId: request.userId,
        firstName: request.firstName,
        lastName: request.lastName,
        email: request.email,
        phone: request.phone,
        professionalType: PROFESSIONAL_TYPES[request.requestedRole] || 'other_healthcare_professional',
        specialization: request.specialization || [],
        licenseNumber: request.licenseNumber,
        verificationStatus: 'verified',
        accountStatus: 'active',
        facilityAssociations: [staffAssociation._id],
      });
    } else {
      professional.verificationStatus = 'verified';
      if (!professional.facilityAssociations.some((id) => String(id) === String(staffAssociation._id))) {
        professional.facilityAssociations.push(staffAssociation._id);
      }
    }
    await professional.save();

    // Clinical access checks look for a verified licence on file.
    const licence = request.licenseNumber || request.registrationNumber;
    const hasLicence = await ProfessionalCredential.findOne({ professionalId: professional._id, credentialType: 'medical_license' });
    // A licence number can belong to one person only. If it is already on file for someone else,
    // approval still goes through but no licence is recorded for this person.
    const licenceTaken = licence && (await ProfessionalCredential.findOne({ credentialNumber: licence }));
    if (licenceTaken && !hasLicence) {
      logger.warn(`Licence number on request ${request._id} is already on file for another professional`);
    }
    if (licence && !hasLicence && !licenceTaken) {
      await ProfessionalCredential.create({
        professionalId: professional._id,
        credentialType: 'medical_license',
        credentialName: 'Professional Licence',
        credentialNumber: licence,
        issuingAuthority: 'Verified by hospital administrator',
        issueDate: new Date(),
        status: 'verified',
        verification: {
          verifiedAt: new Date(),
          verificationMethod: 'manual',
          verificationSource: 'hospital administrator approval',
        },
      });
    }
  }

  /**
   * Submit a staff registration request
   * @param {String} userId - User ID requesting affiliation
   * @param {String} hospitalId - Target hospital ID
   * @param {Object} requestData - Registration details
   * @param {String} requestingUserIp - IP address of requester
   * @param {String} userAgent - User agent
   * @returns {Promise<Object>} Created registration request
   */
  static async submitRegistrationRequest(
    userId,
    hospitalId,
    requestData,
    requestingUserIp = null,
    userAgent = null
  ) {
    try {
      // Validate user exists and is staff role
      const user = await User.findById(userId).select('email role profile');
      if (!user) {
        throw new Error('User not found');
      }

      const staffRoles = [
        'DOCTOR',
        'NURSE',
        'LAB_TECHNICIAN',
        'RADIOLOGY_TECHNICIAN',
        'PHARMACIST',
        'PARAMEDIC',
        'RECEPTION_STAFF',
        'OTHER_STAFF',
      ];

      if (!staffRoles.includes(user.role)) {
        throw new Error(
          `Only healthcare staff can request facility affiliation. Current role: ${user.role}`
        );
      }

      // Validate hospital exists
      const hospital = await Hospital.findById(hospitalId).select('_id name status');
      if (!hospital) {
        throw new Error('Hospital not found');
      }

      if (hospital.status !== 'active') {
        throw new Error(`Hospital is currently ${hospital.status} and cannot accept new staff`);
      }

      // Check for existing active/pending request
      const existingRequest = await StaffRegistrationRequest.findOne({
        userId,
        hospitalId,
        status: { $in: ['pending', 'approved'] },
      });

      if (existingRequest) {
        throw new ConflictError(
          existingRequest.status === 'approved'
            ? `Your request to join ${hospital.name} has already been approved.`
            : `You already have a pending request for ${hospital.name}. Please wait for the hospital administrator to review it.`
        );
      }

      // Check for existing approved staff association
      const existingStaff = await HospitalStaff.findOne({
        userId,
        hospitalId,
        associationStatus: 'active',
      });

      if (existingStaff) {
        throw new ConflictError(`You are already affiliated with ${hospital.name} in an active capacity`);
      }

      // Normalize role to staff model format
      const roleMapping = {
        DOCTOR: 'doctor',
        NURSE: 'nurse',
        LAB_TECHNICIAN: 'lab_technician',
        RADIOLOGY_TECHNICIAN: 'radiology_technician',
        PHARMACIST: 'pharmacist',
        PARAMEDIC: 'paramedic',
        RECEPTION_STAFF: 'reception_staff',
        OTHER_STAFF: 'other_staff',
      };

      // Create registration request
      const request = new StaffRegistrationRequest({
        userId,
        firstName: requestData.firstName || user.profile?.firstName,
        lastName: requestData.lastName || user.profile?.lastName,
        email: user.email,
        phone: requestData.phone || user.profile?.phone,
        requestedRole: roleMapping[user.role],
        hospitalId,
        department: requestData.department,
        specialization: requestData.specialization || [],
        licenseNumber: requestData.licenseNumber,
        registrationNumber: requestData.registrationNumber,
        qualifications: requestData.qualifications || [],
        yearsOfExperience: requestData.yearsOfExperience,
        submittedBy: userId,
        ipAddress: requestingUserIp,
        userAgent,
      });

      await request.save();

      // Find hospital administrators
      const hospitalAdmins = await HospitalStaff.find({
        hospitalId,
        role: 'hospital_admin',
        associationStatus: 'active',
      }).select('userId');

      // Create notifications for each hospital admin
      for (const admin of hospitalAdmins) {
        await notify({
          userId: admin.userId,
          type: 'verification_required',
          title: `New staff registration request from ${request.firstName} ${request.lastName}`,
          message: `${request.firstName} ${request.lastName} (${request.email}) has requested to join ${hospital.name} as a ${request.requestedRole.replace(/_/g, ' ')}. Please review and approve or reject this request.`,
          link: '/hospital/dashboard',
          metadata: { requestId: request._id, hospitalId: hospital._id },
        });
      }

      // Audit log
      await AuditService.logEvent({
        action: 'staff_registration_request_submitted',
        actor: userId,
        resource: request._id,
        resourceType: 'StaffRegistrationRequest',
        hospital: hospitalId,
        status: 'success',
        details: {
          requestedRole: request.requestedRole,
          hospitalName: hospital.name,
        },
      });

      logger.info(
        `Staff registration request created: ${request._id} (${user.email} → ${hospital.name})`
      );

      // Persist to Google Sheets integration boundary
      GoogleSheetsService.recordRegistrationRequest(request, hospital).catch((err) => {
        logger.warn(`GoogleSheets sync request error: ${err.message}`);
      });

      return request;
    } catch (error) {
      logger.error(`Failed to submit registration request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get registration requests for a hospital
   * @param {String} hospitalId - Hospital ID
   * @param {String} status - Status filter ('all', 'pending', 'approved', 'rejected')
   * @returns {Promise<Array>} Requests with user details
   */
  static async getPendingRequestsForHospital(hospitalId, status = 'all') {
    try {
      const query = { hospitalId };
      if (status && status !== 'all') {
        query.status = status;
      }

      const requests = await StaffRegistrationRequest.find(query)
        .populate('userId', 'email profile')
        .sort({ submittedAt: -1 });

      return requests;
    } catch (error) {
      logger.error(`Failed to fetch pending requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get registration request status for a user
   * @param {String} userId - User ID
   * @returns {Promise<Array>} User's registration requests
   */
  static async getUserRegistrationRequests(userId) {
    try {
      const requests = await StaffRegistrationRequest.find({ userId })
        .populate('hospitalId', 'name')
        .sort({ submittedAt: -1 });

      return requests;
    } catch (error) {
      logger.error(`Failed to fetch user registration requests: ${error.message}`);
      throw error;
    }
  }

  /**
   * Approve a staff registration request
   * @param {String} requestId - Registration request ID
   * @param {String} approvingUserId - Admin user ID
   * @param {String} approvalReason - Optional reason
   * @returns {Promise<Object>} Updated request and created HospitalStaff
   */
  static async approveRegistrationRequest(
    requestId,
    approvingUserId,
    approvalReason = null
  ) {
    try {
      const request = await StaffRegistrationRequest.findById(requestId);
      if (!request) {
        throw new Error('Registration request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Cannot approve a ${request.status} request`);
      }

      // Verify approver has authorization
      const approver = await User.findById(approvingUserId);
      if (!approver) {
        throw new Error('Approving user not found');
      }

      // Verify approver is hospital admin or system admin for this hospital
      if (approver.role === 'HOSPITAL_ADMIN') {
        const isHospitalAdmin = await HospitalStaff.findOne({
          userId: approvingUserId,
          hospitalId: request.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });

        if (!isHospitalAdmin) {
          throw new Error(
            'You are not authorized to approve requests for this hospital'
          );
        }
      } else if (approver.role !== 'SYSTEM_ADMIN') {
        throw new Error(
          'Only hospital administrators and system administrators can approve requests'
        );
      }

      // The staff record: reuse one that already exists (for example from an invitation), else create it.
      let staffAssociation = await HospitalStaff.findOne({
        userId: request.userId,
        hospitalId: request.hospitalId,
      });
      if (!staffAssociation) {
        staffAssociation = await StaffService.associateProfessionalWithFacility(
          request.userId,
          null,
          request.hospitalId,
          {
            role: request.requestedRole,
            department: request.department,
            startDate: new Date(),
            specialization: request.specialization,
            permissions: ROLE_PERMISSIONS[request.requestedRole] || {},
            notes: `Approved from registration request ${request._id}`,
          },
          approvingUserId
        );
      }
      const hasPermissions = Object.values(staffAssociation.permissions || {}).some(Boolean);
      if (!hasPermissions && ROLE_PERMISSIONS[request.requestedRole]) {
        staffAssociation.permissions = ROLE_PERMISSIONS[request.requestedRole];
        await staffAssociation.save();
      }
      if (staffAssociation.associationStatus !== 'active') {
        staffAssociation = await StaffService.approveStaffAssociation(
          staffAssociation._id,
          { approvalMethod: approver.role === 'SYSTEM_ADMIN' ? 'jeevacare_admin' : 'facility_admin' },
          approvingUserId
        );
      }

      // Approval is what verifies the person: they now count as verified staff.
      await StaffRegistrationService.verifyApprovedStaff(request, staffAssociation);

      // Update request
      request.status = 'approved';
      request.reviewedAt = new Date();
      request.reviewedBy = approvingUserId;
      request.reviewerRole = approver.role === 'HOSPITAL_ADMIN' ? 'hospital_admin' : 'system_admin';
      request.approvalReason = approvalReason;
      await request.save();

      // Notify applicant
      const approvedHospital = await Hospital.findById(request.hospitalId);
      await notify({
        userId: request.userId,
        type: 'staff_approval',
        title: 'Your registration request has been approved',
        message: `Your request to join ${approvedHospital?.name} as a ${request.requestedRole.replace(/_/g, ' ')} has been approved. You are now verified.`,
        link: '/dashboard',
        metadata: { staffId: staffAssociation._id, hospitalId: request.hospitalId },
      });

      // Audit log
      await AuditService.logEvent({
        action: 'staff_registration_approved',
        actor: approvingUserId,
        resource: request._id,
        resourceType: 'StaffRegistrationRequest',
        hospital: request.hospitalId,
        status: 'success',
        details: {
          requestedRole: request.requestedRole,
          applicantEmail: request.email,
          approvalReason,
        },
      });

      logger.info(
        `Staff registration request approved: ${request._id} (${request.email})`
      );

      // Persist approval to Google Sheets integration boundary
      GoogleSheetsService.updateRegistrationRequestDecision(requestId, 'approved', approvingUserId, approvalReason || '').catch((err) => {
        logger.warn(`GoogleSheets sync approval error: ${err.message}`);
      });

      return { request, staffAssociation };
    } catch (error) {
      logger.error(`Failed to approve registration request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Reject a staff registration request
   * @param {String} requestId - Registration request ID
   * @param {String} rejectingUserId - Admin user ID
   * @param {String} rejectionReason - Reason for rejection
   * @returns {Promise<Object>} Updated request
   */
  static async rejectRegistrationRequest(
    requestId,
    rejectingUserId,
    rejectionReason
  ) {
    try {
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        throw new Error('Rejection reason is required');
      }

      const request = await StaffRegistrationRequest.findById(requestId);
      if (!request) {
        throw new Error('Registration request not found');
      }

      if (request.status !== 'pending') {
        throw new Error(`Cannot reject a ${request.status} request`);
      }

      // Verify rejector authorization
      const rejector = await User.findById(rejectingUserId);
      if (!rejector) {
        throw new Error('Rejecting user not found');
      }

      if (rejector.role === 'HOSPITAL_ADMIN') {
        const isHospitalAdmin = await HospitalStaff.findOne({
          userId: rejectingUserId,
          hospitalId: request.hospitalId,
          role: 'hospital_admin',
          associationStatus: 'active',
        });

        if (!isHospitalAdmin) {
          throw new Error(
            'You are not authorized to reject requests for this hospital'
          );
        }
      } else if (rejector.role !== 'SYSTEM_ADMIN') {
        throw new Error(
          'Only hospital administrators and system administrators can reject requests'
        );
      }

      // Update request
      request.status = 'rejected';
      request.reviewedAt = new Date();
      request.reviewedBy = rejectingUserId;
      request.reviewerRole = rejector.role === 'HOSPITAL_ADMIN' ? 'hospital_admin' : 'system_admin';
      request.rejectionReason = rejectionReason;
      await request.save();

      // Notify applicant
      const hospital = await Hospital.findById(request.hospitalId);
      await notify({
        userId: request.userId,
        type: 'staff_rejection',
        title: 'Your registration request was not approved',
        message: `Your request to join ${hospital?.name} as a ${request.requestedRole.replace(/_/g, ' ')} was not approved. Reason: ${rejectionReason}`,
        link: '/staff/registration',
        metadata: { requestId: request._id, hospitalId: request.hospitalId },
      });

      // Audit log
      await AuditService.logEvent({
        action: 'staff_registration_rejected',
        actor: rejectingUserId,
        resource: request._id,
        resourceType: 'StaffRegistrationRequest',
        hospital: request.hospitalId,
        status: 'success',
        details: {
          requestedRole: request.requestedRole,
          applicantEmail: request.email,
          rejectionReason,
        },
      });

      logger.info(
        `Staff registration request rejected: ${request._id} (${request.email}) - Reason: ${rejectionReason}`
      );

      // Persist rejection to Google Sheets integration boundary
      GoogleSheetsService.updateRegistrationRequestDecision(requestId, 'rejected', rejectingUserId, rejectionReason).catch((err) => {
        logger.warn(`GoogleSheets sync rejection error: ${err.message}`);
      });

      return request;
    } catch (error) {
      logger.error(`Failed to reject registration request: ${error.message}`);
      throw error;
    }
  }

  /**
   * Withdraw a pending registration request
   * @param {String} requestId - Registration request ID
   * @param {String} withdrawingUserId - User withdrawing the request
   * @returns {Promise<Object>} Updated request
   */
  static async withdrawRegistrationRequest(requestId, withdrawingUserId) {
    try {
      const request = await StaffRegistrationRequest.findById(requestId);
      if (!request) {
        throw new Error('Registration request not found');
      }

      if (request.userId.toString() !== withdrawingUserId.toString()) {
        throw new Error('You can only withdraw your own registration requests');
      }

      if (request.status !== 'pending') {
        throw new Error(
          `Cannot withdraw a ${request.status} request. Only pending requests can be withdrawn.`
        );
      }

      request.status = 'withdrawn';
      request.updatedAt = new Date();
      await request.save();

      // Audit log
      await AuditService.logEvent({
        action: 'staff_registration_withdrawn',
        actor: withdrawingUserId,
        resource: request._id,
        resourceType: 'StaffRegistrationRequest',
        hospital: request.hospitalId,
        status: 'success',
      });

      logger.info(`Staff registration request withdrawn: ${request._id}`);

      return request;
    } catch (error) {
      logger.error(`Failed to withdraw registration request: ${error.message}`);
      throw error;
    }
  }
}

export default StaffRegistrationService;
