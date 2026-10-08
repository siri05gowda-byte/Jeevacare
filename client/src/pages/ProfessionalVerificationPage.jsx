/**
 * Professional Verification Admin Page
 * Displays pending healthcare professionals and allows verification/management
 * ADMIN ONLY interface for managing professional verification workflow
 * Part of Phase 4: Healthcare Provider Authority Layer
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import '../styles/AdminVerification.css';

export default function ProfessionalVerificationPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [actionType, setActionType] = useState(null); // 'verify', 'view-details'
  const [verificationMethod, setVerificationMethod] = useState('jeevacare_admin');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Details modal
  const [professionalDetails, setProfessionalDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'SYSTEM_ADMIN') {
      navigate('/login');
      return;
    }

    fetchPendingProfessionals();
  }, [isAuthenticated, user, navigate]);

  const fetchPendingProfessionals = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/v1/professionals/pending-verification');

      if (response.data.success) {
        setProfessionals(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load professionals');
      console.error('Error fetching professionals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyClick = (professional) => {
    setSelectedProfessional(professional);
    setActionType('verify');
    setVerificationMethod('jeevacare_admin');
    setActionError(null);
    setActionSuccess(null);
  };

  const handleViewDetailsClick = async (professional) => {
    try {
      setDetailsLoading(true);
      setSelectedProfessional(professional);
      setActionType('view-details');

      const response = await api.get(`/api/v1/professionals/${professional.professionalId}`);

      if (response.data.success) {
        setProfessionalDetails(response.data.data);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to load details');
      console.error('Error loading professional details:', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleVerifySubmit = async () => {
    if (!selectedProfessional) return;

    try {
      setActionLoading(true);
      setActionError(null);

      const response = await api.post(
        `/api/v1/professionals/${selectedProfessional.professionalId}/verify`,
        {
          verificationMethod,
        }
      );

      if (response.data.success) {
        setActionSuccess('Professional verified successfully!');
        setTimeout(() => {
          setSelectedProfessional(null);
          setActionType(null);
          fetchPendingProfessionals();
        }, 2000);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to verify professional');
      console.error('Error verifying professional:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const closeModal = () => {
    setSelectedProfessional(null);
    setActionType(null);
    setProfessionalDetails(null);
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
        <h1>Healthcare Professional Verification</h1>
        <p>Review and verify healthcare professionals for clinical authority</p>
      </div>

      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading pending professionals...</p>
        </div>
      ) : professionals.length === 0 ? (
        <div className="empty-state">
          <h3>No Pending Professionals</h3>
          <p>All professionals have been verified or there are no pending submissions.</p>
        </div>
      ) : (
        <div className="professionals-grid">
          {professionals.map((professional) => (
            <div key={professional.professionalId} className="professional-card">
              <div className="professional-header">
                <h3>{professional.firstName} {professional.lastName}</h3>
                <span className={`status-badge status-${professional.verificationStatus}`}>
                  {professional.verificationStatus}
                </span>
              </div>

              <div className="professional-details">
                <div className="detail-row">
                  <label>Type:</label>
                  <span className="badge">{professional.professionalType}</span>
                </div>
                <div className="detail-row">
                  <label>Professional ID:</label>
                  <span className="professional-id">{professional.internalProfessionalId}</span>
                </div>
                <div className="detail-row">
                  <label>Email:</label>
                  <span>{professional.email || 'Not provided'}</span>
                </div>
                <div className="detail-row">
                  <label>Status:</label>
                  <span>{professional.verificationStatus}</span>
                </div>
                <div className="detail-row">
                  <label>Submitted:</label>
                  <span>{new Date(professional.submittedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="professional-actions">
                <button
                  className="btn btn-info"
                  onClick={() => handleViewDetailsClick(professional)}
                >
                  📋 View Details
                </button>
                <button
                  className="btn btn-success"
                  onClick={() => handleVerifyClick(professional)}
                >
                  ✓ Verify
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details Modal */}
      {actionType === 'view-details' && selectedProfessional && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Professional Details</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              {detailsLoading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading details...</p>
                </div>
              ) : professionalDetails ? (
                <>
                  <div className="details-section">
                    <h4>Personal Information</h4>
                    <div className="detail-grid">
                      <div>
                        <label>First Name:</label>
                        <p>{professionalDetails.firstName}</p>
                      </div>
                      <div>
                        <label>Last Name:</label>
                        <p>{professionalDetails.lastName}</p>
                      </div>
                      <div>
                        <label>Email:</label>
                        <p>{professionalDetails.email}</p>
                      </div>
                      <div>
                        <label>Phone:</label>
                        <p>{professionalDetails.phone}</p>
                      </div>
                    </div>
                  </div>

                  <div className="details-section">
                    <h4>Professional Information</h4>
                    <div className="detail-grid">
                      <div>
                        <label>Professional ID:</label>
                        <p className="professional-id">{professionalDetails.internalProfessionalId}</p>
                      </div>
                      <div>
                        <label>Type:</label>
                        <p>{professionalDetails.professionalType}</p>
                      </div>
                      <div>
                        <label>Years of Experience:</label>
                        <p>{professionalDetails.yearsOfExperience || 'Not specified'}</p>
                      </div>
                      <div>
                        <label>License Number:</label>
                        <p>{professionalDetails.licenseNumber || 'Not provided'}</p>
                      </div>
                    </div>
                  </div>

                  {professionalDetails.specialization && professionalDetails.specialization.length > 0 && (
                    <div className="details-section">
                      <h4>Specialization</h4>
                      <div className="badge-group">
                        {professionalDetails.specialization.map((spec, idx) => (
                          <span key={idx} className="badge">{spec}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {professionalDetails.credentials && professionalDetails.credentials.length > 0 && (
                    <div className="details-section">
                      <h4>Credentials</h4>
                      <div className="credentials-list">
                        {professionalDetails.credentials.map((cred) => (
                          <div key={cred._id} className="credential-item">
                            <div className="credential-header">
                              <strong>{cred.credentialName}</strong>
                              <span className={`status-badge status-${cred.status}`}>
                                {cred.status}
                              </span>
                            </div>
                            <p><label>Type:</label> {cred.credentialType}</p>
                            <p><label>Issuing Authority:</label> {cred.issuingAuthority}</p>
                            {cred.credentialNumber && (
                              <p><label>Number:</label> {cred.credentialNumber}</p>
                            )}
                            {cred.expiryDate && (
                              <p><label>Expires:</label> {new Date(cred.expiryDate).toLocaleDateString()}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {professionalDetails.biography && (
                    <div className="details-section">
                      <h4>Biography</h4>
                      <p>{professionalDetails.biography}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="error-alert">
                  Failed to load professional details
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={closeModal}
              >
                Close
              </button>
              <button
                className="btn btn-success"
                onClick={() => {
                  setActionType('verify');
                  setActionError(null);
                  setActionSuccess(null);
                }}
              >
                ✓ Proceed to Verify
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Verification Modal */}
      {actionType === 'verify' && selectedProfessional && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Verify Professional</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="professional-summary">
                <p><strong>Name:</strong> {selectedProfessional.firstName} {selectedProfessional.lastName}</p>
                <p><strong>Type:</strong> {selectedProfessional.professionalType}</p>
                <p><strong>Professional ID:</strong> {selectedProfessional.internalProfessionalId}</p>
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

              <div className="form-section">
                <div className="form-group">
                  <label htmlFor="verificationMethod">Verification Method</label>
                  <select
                    id="verificationMethod"
                    value={verificationMethod}
                    onChange={(e) => setVerificationMethod(e.target.value)}
                    className="form-control"
                  >
                    <option value="jeevacare_admin">JeevaCare Admin Review</option>
                    <option value="government_verification">Government Verification</option>
                    <option value="manual">Manual Verification</option>
                  </select>
                </div>

                <div className="info-box">
                  <p>
                    <strong>Note:</strong> Verification will enable this professional to create official clinical records across associated facilities.
                  </p>
                </div>
              </div>
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
                className="btn btn-success"
                onClick={handleVerifySubmit}
                disabled={actionLoading}
              >
                {actionLoading ? 'Verifying...' : 'Verify Professional'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

