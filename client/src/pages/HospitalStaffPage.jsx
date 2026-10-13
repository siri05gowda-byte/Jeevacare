import React, { useState, useEffect } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { staffService } from '../services/staffService';
import LoadingState from '../components/LoadingState';

export default function HospitalStaffPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [activeStaff, setActiveStaff] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedFacilityId, setSelectedFacilityId] = useState(null);

  // Invite form state
  const [inviteForm, setInviteForm] = useState({
    userId: '',
    role: 'doctor',
    department: '',
    employmentStatus: 'active',
    startDate: new Date().toISOString().split('T')[0],
    specialization: '',
  });

  useEffect(() => {
    loadStaffData();
  }, []);

  const loadStaffData = async () => {
    setLoading(true);
    setError(null);
    try {
      // For SYSTEM_ADMIN, get all pending associations
      if (user?.role === 'SYSTEM_ADMIN') {
        const pending = await staffService.getPendingAssociations();
        setPendingStaff(pending.data || []);
      }
      // For HOSPITAL_ADMIN, get facility staff (would need to know which facility)
      // This requires getting user's active staff records first to find their facility
      
      setLoading(false);
    } catch (err) {
      console.error('Failed to load staff data:', err);
      setError(err.response?.data?.message || err.message || 'Failed to load staff data');
      setLoading(false);
    }
  };

  const handleInviteStaff = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!selectedFacilityId) {
      setError('Please select a facility first');
      return;
    }

    if (!inviteForm.userId) {
      setError('User ID is required');
      return;
    }

    try {
      await staffService.inviteStaff({
        ...inviteForm,
        hospitalId: selectedFacilityId,
      });
      
      setShowInviteForm(false);
      setInviteForm({
        userId: '',
        role: 'doctor',
        department: '',
        employmentStatus: 'active',
        startDate: new Date().toISOString().split('T')[0],
        specialization: '',
      });
      
      // Reload staff data
      await loadStaffData();
      
      alert('Staff invitation sent successfully');
    } catch (err) {
      console.error('Failed to invite staff:', err);
      setError(err.response?.data?.message || err.message || 'Failed to invite staff');
    }
  };

  const handleApproveStaff = async (staffId) => {
    if (!confirm('Are you sure you want to approve this staff member?')) {
      return;
    }

    try {
      await staffService.approveStaff(staffId, {
        approvalMethod: user?.role === 'SYSTEM_ADMIN' ? 'jeevacare_admin' : 'facility_admin',
      });
      
      // Reload staff data
      await loadStaffData();
      
      alert('Staff member approved successfully');
    } catch (err) {
      console.error('Failed to approve staff:', err);
      alert(err.response?.data?.message || err.message || 'Failed to approve staff');
    }
  };

  const handleRejectStaff = async (staffId) => {
    const reason = prompt('Please enter a reason for rejection:');
    if (!reason) {
      return;
    }

    try {
      await staffService.rejectStaff(staffId, { reason });
      
      // Reload staff data
      await loadStaffData();
      
      alert('Staff member rejected');
    } catch (err) {
      console.error('Failed to reject staff:', err);
      alert(err.response?.data?.message || err.message || 'Failed to reject staff');
    }
  };

  if (loading) {
    return <LoadingState message="Loading staff management..." />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users size={32} />
            Staff Management
          </h1>
          <p className="text-gray-600 mt-2">
            Manage hospital staff invitations and approvals
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2"
        >
          <UserPlus size={20} />
          Invite Staff
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-900">
            <AlertCircle size={20} />
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Invite Form */}
      {showInviteForm && (
        <div className="mb-8 p-6 bg-white border border-gray-200 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Invite New Staff Member</h2>
          <form onSubmit={handleInviteStaff} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                User ID (MongoDB ObjectId) *
              </label>
              <input
                type="text"
                value={inviteForm.userId}
                onChange={(e) => setInviteForm({ ...inviteForm, userId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="507f1f77bcf86cd799439011"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The MongoDB ObjectId of the user you want to invite. User must have registered first.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Facility ID *
              </label>
              <input
                type="text"
                value={selectedFacilityId || ''}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="507f1f77bcf86cd799439012"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                The MongoDB ObjectId of the hospital/facility
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role *
              </label>
              <select
                value={inviteForm.role}
                onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="doctor">Doctor</option>
                <option value="nurse">Nurse</option>
                <option value="lab_technician">Lab Technician</option>
                <option value="radiology_technician">Radiology Technician</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="paramedic">Paramedic</option>
                <option value="reception_staff">Reception Staff</option>
                <option value="hospital_admin">Hospital Admin</option>
                <option value="other_staff">Other Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <input
                type="text"
                value={inviteForm.department}
                onChange={(e) => setInviteForm({ ...inviteForm, department: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., General Medicine, Laboratory"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employment Status *
              </label>
              <select
                value={inviteForm.employmentStatus}
                onChange={(e) => setInviteForm({ ...inviteForm, employmentStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="active">Active</option>
                <option value="on_leave">On Leave</option>
                <option value="contract">Contract</option>
                <option value="visiting">Visiting</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                value={inviteForm.startDate}
                onChange={(e) => setInviteForm({ ...inviteForm, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Specialization (for doctors)
              </label>
              <input
                type="text"
                value={inviteForm.specialization}
                onChange={(e) => setInviteForm({ ...inviteForm, specialization: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., General Practice, Cardiology"
              />
            </div>

            <div className="flex gap-3">
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Send Invitation
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Pending Staff Approvals */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock size={24} />
          Pending Approvals ({pendingStaff.length})
        </h2>
        {pendingStaff.length > 0 ? (
          <div className="space-y-4">
            {pendingStaff.map((staff) => (
              <div key={staff.staffId} className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {staff.userName || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Role: <span className="font-medium">{staff.role}</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Facility: {staff.facilityName || 'Unknown Facility'}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Invited: {new Date(staff.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveStaff(staff.staffId)}
                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition flex items-center gap-1"
                      title="Approve"
                    >
                      <CheckCircle size={16} />
                      Approve
                    </button>
                    <button
                      onClick={() => handleRejectStaff(staff.staffId)}
                      className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition flex items-center gap-1"
                      title="Reject"
                    >
                      <XCircle size={16} />
                      Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <Clock size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-600">No pending staff approvals</p>
          </div>
        )}
      </div>

      {/* Information */}
      <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle size={20} />
          Staff Onboarding Process
        </h3>
        <ul className="text-sm text-blue-800 space-y-2">
          <li>1. Staff member registers an account (as PATIENT role)</li>
          <li>2. Hospital admin invites the user to the facility with the desired role</li>
          <li>3. Hospital admin (or SYSTEM_ADMIN) approves the invitation</li>
          <li>4. Staff member can now log in and access facility features</li>
        </ul>
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> To get User IDs and Facility IDs, you can use the database directly or 
            implement user search functionality. Staff members must register first before they can be invited.
          </p>
        </div>
      </div>
    </div>
  );
}
