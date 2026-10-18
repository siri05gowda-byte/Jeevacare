import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { AlertCircle, CheckCircle, XCircle, Loader, Eye, EyeOff } from 'lucide-react';
import PageContainer from '../components/Layout/PageContainer';

export default function HospitalAdminDashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedRequests, setApprovedRequests] = useState([]);
  const [rejectedRequests, setRejectedRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [expandedId, setExpandedId] = useState(null);
  const [rejectionReason, setRejectionReason] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!user?.facilityId) {
        setError('No hospital associated with your account');
        return;
      }

      const response = await fetch(`/api/v1/staff-registration/hospital/${user.facilityId}/pending`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load registration requests');
      }

      const data = await response.json();
      
      // Separate requests by status
      const pending = data.requests?.filter((r) => r.status === 'PENDING') || [];
      const approved = data.requests?.filter((r) => r.status === 'APPROVED') || [];
      const rejected = data.requests?.filter((r) => r.status === 'REJECTED') || [];

      setPendingRequests(pending);
      setApprovedRequests(approved);
      setRejectedRequests(rejected);
    } catch (err) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      setSubmittingId(requestId);
      const response = await fetch(`/api/v1/staff-registration/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to approve request');
      }

      setSuccess('Request approved successfully!');
      setExpandedId(null);
      await loadRequests();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to approve request: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const handleReject = async (requestId) => {
    const reason = rejectionReason[requestId]?.trim();
    if (!reason) {
      setError('Please provide a rejection reason');
      return;
    }

    try {
      setSubmittingId(requestId);
      const response = await fetch(`/api/v1/staff-registration/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ rejectionReason: reason }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject request');
      }

      setSuccess('Request rejected successfully!');
      setRejectionReason({ ...rejectionReason, [requestId]: '' });
      setExpandedId(null);
      await loadRequests();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to reject request: ' + err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  const RequestCard = ({ request, expanded, onToggle, onApprove, onReject }) => (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-6 py-4 hover:bg-gray-50 transition-colors text-left"
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h3 className="font-medium text-gray-900">
              {request.userId?.profile?.firstName} {request.userId?.profile?.lastName}
            </h3>
            <p className="text-sm text-gray-600 mt-1">
              {request.userId?.email}
            </p>
            <div className="mt-2 flex items-center gap-4">
              <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                {request.role}
              </span>
              {request.specialization && (
                <span className="text-xs text-gray-600">{request.specialization}</span>
              )}
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            {expanded ? <EyeOff size={20} /> : <Eye size={20} />}
          </div>
        </div>
      </button>

      {expanded && (
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 space-y-4">
          {/* Request Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Submitted:</p>
              <p className="font-medium">
                {new Date(request.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-gray-600">Status:</p>
              <p className="font-medium capitalize">{request.status}</p>
            </div>
          </div>

          {/* Approval/Rejection Actions (for PENDING) */}
          {request.status === 'PENDING' && (
            <div className="space-y-3 pt-4 border-t border-gray-200">
              {/* Rejection Reason Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rejection Reason (if rejecting)
                </label>
                <textarea
                  value={rejectionReason[request._id] || ''}
                  onChange={(e) =>
                    setRejectionReason({
                      ...rejectionReason,
                      [request._id]: e.target.value,
                    })
                  }
                  placeholder="Explain why this request is being rejected..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-jeevacare-blue focus:border-transparent"
                  rows="3"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => onApprove(request._id)}
                  disabled={submittingId === request._id}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle size={16} />
                  {submittingId === request._id ? 'Approving...' : 'Approve'}
                </button>
                <button
                  onClick={() => onReject(request._id)}
                  disabled={submittingId === request._id || !rejectionReason[request._id]?.trim()}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle size={16} />
                  {submittingId === request._id ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (loading) {
    return (
      <PageContainer title="Hospital Admin Dashboard">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <Loader className="animate-spin mx-auto mb-4" size={32} />
            <p className="text-gray-600">Loading requests...</p>
          </div>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer title="Hospital Admin Dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold text-gray-900">Staff Registration Management</h1>
          <p className="text-gray-600 mt-2">
            Review and manage staff registration requests for your hospital
          </p>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="text-red-600 flex-shrink-0" size={20} />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
            <CheckCircle className="text-green-600 flex-shrink-0" size={20} />
            <p className="text-sm text-green-800">{success}</p>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          {[
            { id: 'pending', label: 'Pending', count: pendingRequests.length },
            { id: 'approved', label: 'Approved', count: approvedRequests.length },
            { id: 'rejected', label: 'Rejected', count: rejectedRequests.length },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-jeevacare-blue text-jeevacare-blue'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="space-y-4">
          {activeTab === 'pending' && (
            <>
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No pending requests</p>
                </div>
              ) : (
                pendingRequests.map((request) => (
                  <RequestCard
                    key={request._id}
                    request={request}
                    expanded={expandedId === request._id}
                    onToggle={() =>
                      setExpandedId(expandedId === request._id ? null : request._id)
                    }
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))
              )}
            </>
          )}

          {activeTab === 'approved' && (
            <>
              {approvedRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No approved requests</p>
                </div>
              ) : (
                approvedRequests.map((request) => (
                  <div
                    key={request._id}
                    className="border border-green-200 bg-green-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {request.userId?.profile?.firstName} {request.userId?.profile?.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{request.userId?.email}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {request.role}
                          </span>
                          {request.specialization && (
                            <span className="text-xs text-gray-600">{request.specialization}</span>
                          )}
                        </div>
                      </div>
                      <CheckCircle className="text-green-600" size={24} />
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Approved: {new Date(request.approvedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </>
          )}

          {activeTab === 'rejected' && (
            <>
              {rejectedRequests.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                  <p className="text-gray-600">No rejected requests</p>
                </div>
              ) : (
                rejectedRequests.map((request) => (
                  <div
                    key={request._id}
                    className="border border-red-200 bg-red-50 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {request.userId?.profile?.firstName} {request.userId?.profile?.lastName}
                        </h3>
                        <p className="text-sm text-gray-600">{request.userId?.email}</p>
                        <div className="mt-2 flex items-center gap-4">
                          <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            {request.role}
                          </span>
                          {request.specialization && (
                            <span className="text-xs text-gray-600">{request.specialization}</span>
                          )}
                        </div>
                        {request.rejectionReason && (
                          <p className="text-sm text-red-700 mt-3">
                            <strong>Reason:</strong> {request.rejectionReason}
                          </p>
                        )}
                      </div>
                      <XCircle className="text-red-600" size={24} />
                    </div>
                    <p className="text-xs text-gray-500 mt-3">
                      Rejected: {new Date(request.rejectedAt).toLocaleDateString()}
                    </p>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
