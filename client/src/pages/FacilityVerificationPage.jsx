/**
 * Facility Verification Admin Page
 * Displays pending facilities and allows verification/rejection
 * ADMIN ONLY interface for managing healthcare facility verification workflow
 * Part of Phase 4: Healthcare Provider Authority Layer
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import '../styles/AdminVerification.css';

export default function FacilityVerificationPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState('pending');

  // Modal states
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [actionType, setActionType] = useState(null); // 'verify', 'reject'
  const [actionData, setActionData] = useState({
    verificationMethod: 'jeevacare_admin',
    notes: '',
    reason: '',
  });
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SYSTEM_ADMIN') {
      navigate('/login');
      return;
    }

    fetchPendingFacilities();
  }, [isAuthenticated, user, navigate, filterStatus]);

  const fetchPendingFacilities = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/v1/facilities/pending-verification');

      if (response.data.success) {
        const all = response.data.data;
        // Filter by status if needed
        let filtered = all;
        if (filterStatus === 'pending') {
          filtered = all.filter((f) => f.verificationStatus === 'pending');
        }
        setFacilities(filtered);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load facilities');
      console.error('Error fetching facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClick = (facility) => {
    setSelectedFacility(facility);
    setActionType('verify');
    setActionData({
      verificationMethod: 'jeevacare_admin',
      notes: '',
    });
    setActionError(null);
    setActionSuccess(null);
  };

  const handleRejectClick = (facility) => {
    setSelectedFacility(facility);
    setActionType('reject');
    setActionData({
      reason: '',
    });
    setActionError(null);
    setActionSuccess(null);
  };

  const handleVerifySubmit = async () => {
    if (!selectedFacility) return;

    try {
      setActionLoading(true);
      setActionError(null);

      const response = await api.post(`/api/v1/facilities/${selectedFacility.facilityId}/verify`, {
        verificationMethod: actionData.verificationMethod,
        notes: actionData.notes,
      });

      if (response.data.success) {
        setActionSuccess('Facility verified successfully!');
        setTimeout(() => {
          setSelectedFacility(null);
          setActionType(null);
          fetchPendingFacilities();
        }, 2000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to verify facility');
      console.error('Error verifying facility:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!selectedFacility || !actionData.reason) {
      setActionError('Rejection reason is required');
      return;
    }

    try {
      setActionLoading(true);
      setActionError(null);

      const response = await api.post(`/api/v1/facilities/${selectedFacility.facilityId}/reject`, {
        reason: actionData.reason,
      });

      if (response.data.success) {
        setActionSuccess('Facility rejected successfully!');
        setTimeout(() => {
          setSelectedFacility(null);
          setActionType(null);
          fetchPendingFacilities();
        }, 2000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to reject facility');
      console.error('Error rejecting facility:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedFacility(null);
    setActionType(null);
    setActionData({});
    setActionError(null);
    setActionSuccess(null);
  };

  if (!isAuthenticated) {
    return null;
  }

  if (user?.role !== 'SYSTEM_ADMIN') {
    return (
      <div className="admin-verification-container">
        <div className="permission-denied">
          <h2>Access Denied</h2>
          <p>Only system administrators can access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-verification-container">
      <div className="verification-header">
        <h1>Healthcare Facility Verification</h1>
        <p>Review and verify healthcare facilities for clinical operations</p>
      </div>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="filter-section">
        <div className="filter-controls">
          <label>Filter by Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="filter-select"
          >
            <option value="pending">Pending</option>
            <option value="all">All</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading pending facilities...</p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="empty-state">
          <h3>No Pending Facilities</h3>
          <p>All facilities have been verified or there are no pending submissions.</p>
        </div>
      ) : (
        <div className="facilities-grid">
          {facilities.map((facility) => (
            <div key={facility.facilityId} className="facility-card">
              <div className="facility-header">
                <h3>{facility.name}</h3>
                <span className={`status-badge status-${facility.verificationStatus}`}>
                  {facility.verificationStatus}
                </span>
              </div>

              <div className="facility-details">
                <div className="detail-row">
                  <label>Type:</label>
                  <span>{facility.type}</span>
                </div>
                <div className="detail-row">
                  <label>Registration:</label>
                  <span>{facility.registrationNumber}</span>
                </div>
                <div className="detail-row">
                  <label>JeevaCare ID:</label>
                  <span className="facility-id">{facility.internalFacilityId}</span>
                </div>
                <div className="detail-row">
                  <label>Contact:</label>
                  <span>{facility.contact?.phone}</span>
                </div>
                <div className="detail-row">
                  <label>Email:</label>
                  <span>{facility.contact?.email}</span>
                </div>
                <div className="detail-row">
                  <label>Submitted:</label>
                  <span>{new Date(facility.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="facility-actions">
                <button
                  className="btn btn-success"
                  onClick={() => handleVerifyClick(facility)}
                >
                  ✓ Verify
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleRejectClick(facility)}
                >
                  ✗ Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Modal */}
      {selectedFacility && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{actionType === 'verify' ? 'Verify Facility' : 'Reject Facility'}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="facility-summary">
                <p><strong>Facility:</strong> {selectedFacility.name}</p>
                <p><strong>Type:</strong> {selectedFacility.type}</p>
                <p><strong>Registration:</strong> {selectedFacility.registrationNumber}</p>
              </div>

              {actionSuccess && (
                <div className="success-alert">
                  <span className="success-icon">✓</span>
                  <span>{actionSuccess}</span>
                </div>
              )}

              {actionError && (
                <div className="error-alert">
                  <span className="error-icon">⚠️</span>
                  <span>{actionError}</span>
                </div>
              )}

              {actionType === 'verify' && (
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="verificationMethod">Verification Method</label>
                    <select
                      id="verificationMethod"
                      value={actionData.verificationMethod}
                      onChange={(e) =>
                        setActionData({
                          ...actionData,
                          verificationMethod: e.target.value,
                        })
                      }
                      className="form-control"
                    >
                      <option value="jeevacare_admin">JeevaCare Admin Review</option>
                      <option value="government_verification">Government Verification</option>
                      <option value="manual">Manual Verification</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="notes">Verification Notes</label>
                    <textarea
                      id="notes"
                      value={actionData.notes}
                      onChange={(e) =>
                        setActionData({
                          ...actionData,
                          notes: e.target.value,
                        })
                      }
                      placeholder="Enter any verification notes (optional)"
                      rows="4"
                      className="form-control"
                    ></textarea>
                  </div>
                </div>
              )}

              {actionType === 'reject' && (
                <div className="form-section">
                  <div className="form-group">
                    <label htmlFor="reason">Rejection Reason</label>
                    <textarea
                      id="reason"
                      value={actionData.reason}
                      onChange={(e) =>
                        setActionData({
                          ...actionData,
                          reason: e.target.value,
                        })
                      }
                      placeholder="Explain why the facility is being rejected"
                      rows="4"
                      className="form-control"
                      required
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeModal}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className={`btn ${actionType === 'verify' ? 'btn-success' : 'btn-danger'}`}
                onClick={
                  actionType === 'verify' ? handleVerifySubmit : handleRejectSubmit
                }
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : actionType === 'verify' ? 'Verify Facility' : 'Reject Facility'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

