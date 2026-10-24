/**
 * Staff Registration Service
 * Handles healthcare professional registration requests and approvals
 */

import StaffRegistrationRequest from '../models/StaffRegistrationRequest.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import HospitalStaff from '../models/HospitalStaff.js';
import Notification from '../models/Notification.js';
import AuditService from './AuditService.js';
import StaffService from './StaffService.js';
import logger from '../utils/logger.js';
import GoogleSheetsService from './GoogleSheetsService.js';

class StaffRegistrationService {
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
        throw new Error(
          `You already have a ${existingRequest.status} request for ${hospital.name}. Please wait for approval or withdraw your current request.`
        );
      }

      // Check for existing approved staff association
      const existingStaff = await HospitalStaff.findOne({
        userId,
        hospitalId,
        associationStatus: 'active',
      });

      if (existingStaff) {
        throw new Error(
          `You are already affiliated with ${hospital.name} in an active capacity`
        );
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
        const notification = new Notification({
          userId: admin.userId,
          type: 'staff_registration_request',
          subject: `New staff registration request from ${request.firstName} ${request.lastName}`,
          message: `${request.firstName} ${request.lastName} (${request.email}) has requested to join ${hospital.name} as a ${request.requestedRole}. Please review and approve or reject this request.`,
          relatedEntityType: 'StaffRegistrationRequest',
          relatedEntityId: request._id,
          actionUrl: `/admin/registration-requests/${request._id}`,
          priority: 'high',
        });
        await notification.save();
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

      // Create HospitalStaff association
      const roleMapping = {
        doctor: 'DOCTOR',
        nurse: 'NURSE',
        lab_technician: 'LAB_TECHNICIAN',
        radiology_technician: 'RADIOLOGY_TECHNICIAN',
        pharmacist: 'PHARMACIST',
        paramedic: 'PARAMEDIC',
        reception_staff: 'RECEPTION_STAFF',
        other_staff: 'OTHER_STAFF',
      };

      const staffAssociation = await StaffService.associateProfessionalWithFacility(
        {
          userId: request.userId,
          facilityId: request.hospitalId,
          role: request.requestedRole,
          startDate: new Date(),
          notes: `Approved from registration request ${request._id}`,
        },
        approvingUserId
      );

      // Update request
      request.status = 'approved';
      request.reviewedAt = new Date();
      request.reviewedBy = approvingUserId;
      request.reviewerRole = approver.role === 'HOSPITAL_ADMIN' ? 'hospital_admin' : 'system_admin';
      request.approvalReason = approvalReason;
      await request.save();

      // Notify applicant
      const notification = new Notification({
        userId: request.userId,
        type: 'staff_registration_approved',
        subject: `Your registration request has been approved`,
        message: `Your request to join ${(await Hospital.findById(request.hospitalId))?.name} as a ${request.requestedRole} has been approved. You can now access hospital facilities and systems.`,
        relatedEntityType: 'HospitalStaff',
        relatedEntityId: staffAssociation._id,
        priority: 'high',
      });
      await notification.save();

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
      const notification = new Notification({
        userId: request.userId,
        type: 'staff_registration_rejected',
        subject: `Your registration request was not approved`,
        message: `Your request to join ${hospital?.name} as a ${request.requestedRole} was not approved. Reason: ${rejectionReason}`,
        relatedEntityType: 'StaffRegistrationRequest',
        relatedEntityId: request._id,
        priority: 'normal',
      });
      await notification.save();

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
