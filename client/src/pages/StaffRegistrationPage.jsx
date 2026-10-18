import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle, Clock, XCircle, Loader } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';

const staffRoles = [
  { value: 'DOCTOR', label: 'Doctor' },
  { value: 'LAB_TECHNICIAN', label: 'Lab Technician' },
  { value: 'RADIOLOGY_TECHNICIAN', label: 'Radiology Technician' },
  { value: 'NURSE', label: 'Nurse' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
];

export default function StaffRegistrationPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    hospitalId: '',
    role: '',
    specialization: '',
  });
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      // Fetch hospitals from the public list endpoint
      const hospitalsRes = await fetch('/api/v1/hospital-admin/list', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (hospitalsRes.ok) {
        const data = await hospitalsRes.json();
        setHospitals(data.hospitals || []);
      }

      // Fetch user's existing requests
      const requestsRes = await fetch('/api/v1/staff-registration/my-requests', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (requestsRes.ok) {
        const data = await requestsRes.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load hospital list');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.hospitalId || !formData.role) {
      setError('Please select a hospital and role');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccess(false);

      const response = await fetch('/api/v1/staff-registration/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          hospitalId: formData.hospitalId,
          role: formData.role,
          specialization: formData.specialization,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error?.message || 'Failed to submit request');
      }

      setSuccess(true);
      setFormData({ hospitalId: '', role: '', specialization: '' });
      
      // Reload requests
      await loadData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to submit registration request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleWithdraw = async (requestId) => {
    if (!window.confirm('Are you sure you want to withdraw this request?')) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/staff-registration/${requestId}/withdraw`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to withdraw request');
      }

      // Reload requests
      await loadData();
    } catch (err) {
      setError('Failed to withdraw request: ' + err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock size={14} />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle size={14} />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle size={14} />
            Rejected
          </span>
        );
      default:
        return status;
    }
  };

  const getHospitalName = (hospitalId) => {
    const hospital = hospitals.find((h) => h._id === hospitalId);
    return hospital?.name || hospitalId;
  };

  if (loading) {
    return (
      <PageContainer title="Staff Registration">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Staff Registration">
      <div className="space-y-8">
        {/* Registration Form */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold mb-6 text-gray-900">Register as Healthcare Staff</h2>

          {error && (
            <div className="mb-6 flex items-gap gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
              <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {success && (
            <div className="mb-6 flex items-gap gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
              <p className="text-sm text-green-800">Registration request submitted successfully!</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Hospital Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Hospital *
              </label>
              <select
                value={formData.hospitalId}
                onChange={(e) => setFormData({ ...formData, hospitalId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                required
              >
                <option value="">Choose a hospital...</option>
                {hospitals.map((hospital) => (
                  <option key={hospital._id} value={hospital._id}>
                    {hospital.name} ({hospital.hospitalId})
                  </option>
                ))}
              </select>
            </div>

            {/* Role Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Role *
              </label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                required
              >
                <option value="">Choose a role...</option>
                {staffRoles.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Specialization (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Specialization (Optional)
              </label>
              <input
                type="text"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                placeholder="e.g., Cardiology, Pediatrics"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-2 bg-jeevacare-blue text-white rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Registration Request'}
            </button>
          </form>
        </div>

        {/* Existing Requests */}
        {requests.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold mb-6 text-gray-900">Your Registration Requests</h2>

            <div className="space-y-4">
              {requests.map((request) => (
                <div
                  key={request._id}
                  className="border border-gray-200 rounded-lg p-4 flex justify-between items-start"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-medium text-gray-900">{getHospitalName(request.hospitalId)}</h3>
                      {getStatusBadge(request.status)}
                    </div>
                    <p className="text-sm text-gray-600">
                      Role: <span className="font-medium">{request.role}</span>
                      {request.specialization && (
                        <>
                          {' '}
                          • Specialization: <span className="font-medium">{request.specialization}</span>
                        </>
                      )}
                    </p>
                    <p className="text-xs text-gray-500 mt-2">
                      Submitted: {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    {request.status === 'rejected' && request.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">
                        Rejection reason: {request.rejectionReason}
                      </p>
                    )}
                  </div>
                  {request.status === 'pending' && (
                    <button
                      onClick={() => handleWithdraw(request._id)}
                      className="ml-4 px-3 py-1 text-sm text-gray-600 hover:text-red-600 border border-gray-300 rounded hover:border-red-300 transition-colors"
                    >
                      Withdraw
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info Card */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-900">
            <strong>How it works:</strong> Submit your registration request with your desired hospital and role. A hospital administrator will review and approve your request. Once approved, you'll have full staff access to that hospital.
          </p>
        </div>
      </div>
    </PageContainer>
  );
}
