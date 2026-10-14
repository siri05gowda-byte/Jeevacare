import React, { useState, useEffect } from 'react';
import { User, Lock, Camera, Save, AlertCircle, CheckCircle, Building2 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { staffService } from '../services/staffService';
import api from '../services/api';

export default function SettingsPage() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  
  // Profile state
  const [profileData, setProfileData] = useState({
    firstName: user?.profile?.firstName || '',
    lastName: user?.profile?.lastName || '',
    phone: user?.profile?.phone || '',
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState(null);

  // Password state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState(null);

  // Profile picture state
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [pictureMessage, setPictureMessage] = useState(null);

  // Facility affiliations state
  const [facilities, setFacilities] = useState([]);
  const [loadingFacilities, setLoadingFacilities] = useState(false);

  // Load facility affiliations on mount
  useEffect(() => {
    if (user?._id) {
      loadFacilityAffiliations();
    }
  }, [user?._id]);

  const loadFacilityAffiliations = async () => {
    if (!user?._id) return;
    
    setLoadingFacilities(true);
    try {
      const response = await staffService.getUserActiveStaffRecords(user._id);
      setFacilities(response.data || []);
    } catch (error) {
      console.error('Failed to load facility affiliations:', error);
    } finally {
      setLoadingFacilities(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage(null);

    try {
      const response = await api.put('/auth/profile', profileData);
      
      if (response.success) {
        setUser(response.user);
        setProfileMessage({ type: 'success', text: 'Profile updated successfully' });
      }
    } catch (error) {
      setProfileMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to update profile',
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordMessage(null);

    // Validate passwords match
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match' });
      setPasswordLoading(false);
      return;
    }

    // Validate password strength
    if (passwordData.newPassword.length < 8) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      setPasswordLoading(false);
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(passwordData.newPassword)) {
      setPasswordMessage({
        type: 'error',
        text: 'Password must contain uppercase, lowercase, and number',
      });
      setPasswordLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      if (response.success) {
        setPasswordMessage({ type: 'success', text: 'Password changed successfully' });
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      }
    } catch (error) {
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.error || error.message || 'Failed to change password',
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setPictureMessage({ type: 'error', text: 'Only JPEG, PNG, and WebP images are allowed' });
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setPictureMessage({ type: 'error', text: 'Image must be less than 5MB' });
      return;
    }

    setUploadingPicture(true);
    setPictureMessage(null);

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const token = localStorage.getItem('token');
      
      // Use fetch directly for multipart to avoid axios header interference
      const response = await fetch(`${api.defaults.baseURL}/auth/upload-profile-picture`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Upload failed');
      }

      const data = await response.json();
      
      if (data.success) {
        // Refresh user data
        const userResponse = await fetch(`${api.defaults.baseURL}/auth/current-user`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const userData = await userResponse.json();
        setUser(userData.user);
        setPictureMessage({ type: 'success', text: 'Profile picture updated successfully' });
      }
    } catch (error) {
      setPictureMessage({
        type: 'error',
        text: error.message || 'Failed to upload picture',
      });
    } finally {
      setUploadingPicture(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Account Settings</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('profile')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'profile'
                ? 'border-jeevacare-blue text-jeevacare-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <User size={16} className="inline mr-2" />
            Profile
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-jeevacare-blue text-jeevacare-blue'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Lock size={16} className="inline mr-2" />
            Security
          </button>
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Account Information - JeevaId & Status */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  JeevaCare ID
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-jeevacare-blue">
                    {user?.jeevaId || 'Not Assigned'}
                  </span>
                  {user?.jeevaId && (
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(user.jeevaId);
                        setProfileMessage({ type: 'success', text: 'JeevaCare ID copied to clipboard' });
                        setTimeout(() => setProfileMessage(null), 3000);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 underline"
                      title="Copy ID"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your permanent JeevaCare identifier
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Status
                </label>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-3 py-1 rounded-full text-sm font-medium ${
                      user?.verificationStatus === 'verified'
                        ? 'bg-green-100 text-green-800'
                        : user?.verificationStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user?.verificationStatus === 'verified' && '✓ Verified'}
                    {user?.verificationStatus === 'pending' && '⏳ Pending'}
                    {user?.verificationStatus === 'rejected' && '✗ Rejected'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {user?.verificationStatus === 'verified' && 'Your account is fully verified'}
                  {user?.verificationStatus === 'pending' &&
                    'Your account is awaiting verification by a hospital administrator'}
                  {user?.verificationStatus === 'rejected' && 'Please contact support for assistance'}
                </p>
              </div>
            </div>
          </div>

          {/* Facility Affiliations - For staff members */}
          {user?.role && !['PATIENT', 'GUARDIAN'].includes(user.role) && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 size={20} />
                Facility Affiliations
              </h2>
              {loadingFacilities ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-sm text-gray-500 mt-2">Loading affiliations...</p>
                </div>
              ) : facilities.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">No facility affiliations yet</p>
                  <p className="text-xs mt-1">
                    You will see your affiliated hospitals and clinics here once approved
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {facilities.map((affiliation) => (
                    <div
                      key={affiliation._id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {affiliation.hospital?.name || affiliation.hospitalName || 'Unknown Facility'}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            Role: <span className="font-medium">{affiliation.role.replace(/_/g, ' ')}</span>
                          </p>
                          {affiliation.department && (
                            <p className="text-sm text-gray-600">
                              Department: <span className="font-medium">{affiliation.department}</span>
                            </p>
                          )}
                          {affiliation.specialization && (
                            <p className="text-sm text-gray-600">
                              Specialization: <span className="font-medium">{affiliation.specialization}</span>
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                              affiliation.associationStatus === 'active'
                                ? 'bg-green-100 text-green-800'
                                : affiliation.associationStatus === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {affiliation.associationStatus}
                          </span>
                        </div>
                      </div>
                      {affiliation.startDate && (
                        <p className="text-xs text-gray-500 mt-2">
                          Since: {new Date(affiliation.startDate).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Profile Picture */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Picture</h2>
            <div className="flex items-center space-x-6">
              <div className="relative">
                {user?.profile?.profilePictureUrl ? (
                  <img
                    src={user.profile.profilePictureUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-jeevacare-blue text-white flex items-center justify-center text-3xl font-bold">
                    {user?.profile?.firstName?.charAt(0) || 'U'}
                  </div>
                )}
                {uploadingPicture && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="btn btn-secondary btn-sm cursor-pointer">
                  <Camera size={16} className="mr-2" />
                  {user?.profile?.profilePictureUrl ? 'Change Picture' : 'Upload Picture'}
                  <input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp"
                    onChange={handleProfilePictureUpload}
                    disabled={uploadingPicture}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">
                  JPEG, PNG, or WebP. Max 5MB.
                </p>
              </div>
            </div>
            {pictureMessage && (
              <div
                className={`mt-4 p-3 rounded ${
                  pictureMessage.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center">
                  {pictureMessage.type === 'success' ? (
                    <CheckCircle size={16} className="mr-2" />
                  ) : (
                    <AlertCircle size={16} className="mr-2" />
                  )}
                  <span className="text-sm">{pictureMessage.text}</span>
                </div>
              </div>
            )}
          </div>

          {/* Profile Information */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile Information</h2>
            <form onSubmit={handleProfileUpdate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    value={profileData.firstName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, firstName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    value={profileData.lastName}
                    onChange={(e) =>
                      setProfileData({ ...profileData, lastName: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) =>
                    setProfileData({ ...profileData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <input
                  type="text"
                  value={user?.role || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>

              {profileMessage && (
                <div
                  className={`p-3 rounded ${
                    profileMessage.type === 'success'
                      ? 'bg-green-50 text-green-800'
                      : 'bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex items-center">
                    {profileMessage.type === 'success' ? (
                      <CheckCircle size={16} className="mr-2" />
                    ) : (
                      <AlertCircle size={16} className="mr-2" />
                    )}
                    <span className="text-sm">{profileMessage.text}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={profileLoading}
                className="btn btn-primary"
              >
                {profileLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
          <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Password
              </label>
              <input
                type="password"
                value={passwordData.currentPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, currentPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                New Password
              </label>
              <input
                type="password"
                value={passwordData.newPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, newPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Must be at least 8 characters with uppercase, lowercase, and number
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirm New Password
              </label>
              <input
                type="password"
                value={passwordData.confirmPassword}
                onChange={(e) =>
                  setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                required
              />
            </div>

            {passwordMessage && (
              <div
                className={`p-3 rounded ${
                  passwordMessage.type === 'success'
                    ? 'bg-green-50 text-green-800'
                    : 'bg-red-50 text-red-800'
                }`}
              >
                <div className="flex items-center">
                  {passwordMessage.type === 'success' ? (
                    <CheckCircle size={16} className="mr-2" />
                  ) : (
                    <AlertCircle size={16} className="mr-2" />
                  )}
                  <span className="text-sm">{passwordMessage.text}</span>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="btn btn-primary"
            >
              {passwordLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Changing...
                </>
              ) : (
                <>
                  <Lock size={16} className="mr-2" />
                  Change Password
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
