import React, { useState, useEffect, useCallback } from 'react';
import { Users, UserPlus, CheckCircle, XCircle, Clock, AlertCircle, Search } from 'lucide-react';
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

  // User and facility search state
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [facilitySearchQuery, setFacilitySearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [facilitySearchResults, setFacilitySearchResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showFacilityDropdown, setShowFacilityDropdown] = useState(false);

  useEffect(() => {
    loadStaffData();
  }, []);

  // Debounced search for users
  const searchUsers = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setUserSearchResults([]);
      return;
    }
    
    try {
      const response = await staffService.searchUsers(query);
      setUserSearchResults(response.data || []);
    } catch (err) {
      console.error('User search failed:', err);
      setUserSearchResults([]);
    }
  }, []);

  // Debounced search for facilities
  const searchFacilities = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setFacilitySearchResults([]);
      return;
    }
    
    try {
      const response = await staffService.searchFacilities(query);
      setFacilitySearchResults(response.data || []);
    } catch (err) {
      console.error('Facility search failed:', err);
      setFacilitySearchResults([]);
    }
  }, []);

  // Handle user search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(userSearchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [userSearchQuery, searchUsers]);

  // Handle facility search input
  useEffect(() => {
    const timer = setTimeout(() => {
      searchFacilities(facilitySearchQuery);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [facilitySearchQuery, searchFacilities]);

  const loadStaffData = async () => {
    setLoading(true);
    setError(null);
    try {
      // For SYSTEM_ADMIN, get all pending associations
      if (user?.role === 'SYSTEM_ADMIN') {
        const response = await staffService.getPendingAssociations();
        // Handle response unwrapping from api interceptor
        const pending = response?.data || response || [];
        setPendingStaff(Array.isArray(pending) ? pending : []);
      }
      // For HOSPITAL_ADMIN, get facility staff (would need to know which facility)
      // This requires getting user's active staff records first to find their facility
      
    } catch (err) {
      console.error('Failed to load staff data:', err);
      const errorMessage = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to load staff data';
      setError(errorMessage);
      setPendingStaff([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteStaff = async (e) => {
    e.preventDefault();
    setError(null);
    
    if (!selectedFacility) {
      setError('Please select a facility');
      return;
    }

    if (!selectedUser) {
      setError('Please select a user');
      return;
    }

    try {
      await staffService.inviteStaff({
        userId: selectedUser._id,
        hospitalId: selectedFacility._id,
        role: inviteForm.role,
        department: inviteForm.department,
        employmentStatus: inviteForm.employmentStatus,
        startDate: inviteForm.startDate,
        specialization: inviteForm.specialization,
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
      setSelectedUser(null);
      setSelectedFacility(null);
      setUserSearchQuery('');
      setFacilitySearchQuery('');
      
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
            {/* User Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search User *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={selectedUser ? `${selectedUser.firstName} ${selectedUser.lastName} (${selectedUser.email})` : userSearchQuery}
                  onChange={(e) => {
                    setUserSearchQuery(e.target.value);
                    setSelectedUser(null);
                    setShowUserDropdown(true);
                  }}
                  onFocus={() => setShowUserDropdown(true)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type name or email..."
                  required
                />
              </div>
              {showUserDropdown && userSearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {userSearchResults.map((user) => (
                    <button
                      key={user._id}
                      type="button"
                      onClick={() => {
                        setSelectedUser(user);
                        setUserSearchQuery('');
                        setShowUserDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition"
                    >
                      <div className="font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      <div className="text-xs text-gray-500">Role: {user.role}</div>
                    </button>
                  ))}
                </div>
              )}
              {selectedUser && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-green-900">
                        {selectedUser.firstName} {selectedUser.lastName}
                      </div>
                      <div className="text-sm text-green-700">{selectedUser.email}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedUser(null)}
                      className="text-green-700 hover:text-green-900"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Search for registered users by name or email
              </p>
            </div>

            {/* Facility Search */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Facility *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search size={18} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={selectedFacility ? selectedFacility.name : facilitySearchQuery}
                  onChange={(e) => {
                    setFacilitySearchQuery(e.target.value);
                    setSelectedFacility(null);
                    setShowFacilityDropdown(true);
                  }}
                  onFocus={() => setShowFacilityDropdown(true)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Type facility name..."
                  required
                />
              </div>
              {showFacilityDropdown && facilitySearchResults.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {facilitySearchResults.map((facility) => (
                    <button
                      key={facility._id}
                      type="button"
                      onClick={() => {
                        setSelectedFacility(facility);
                        setFacilitySearchQuery('');
                        setShowFacilityDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-blue-50 transition"
                    >
                      <div className="font-medium text-gray-900">{facility.name}</div>
                      <div className="text-sm text-gray-600">{facility.type}</div>
                      {facility.address && (
                        <div className="text-xs text-gray-500">{facility.address}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {selectedFacility && (
                <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-green-900">{selectedFacility.name}</div>
                      <div className="text-sm text-green-700">{selectedFacility.type}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFacility(null)}
                      className="text-green-700 hover:text-green-900"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Search for hospitals and clinics by name
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
          <li>1. Staff member registers an account on JeevaCare</li>
          <li>2. Hospital admin searches for and selects the user</li>
          <li>3. Hospital admin invites the user to the facility with the desired role</li>
          <li>4. Hospital admin (or SYSTEM_ADMIN) approves the invitation</li>
          <li>5. Staff member can now log in and access facility features</li>
        </ul>
        <div className="mt-4 p-3 bg-blue-100 rounded">
          <p className="text-xs text-blue-900">
            <strong>Note:</strong> Use the search fields above to find registered users and facilities. 
            Staff members must register first before they can be invited to a facility.
          </p>
        </div>
      </div>
    </div>
  );
}
