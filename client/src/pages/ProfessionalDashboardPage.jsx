/**
 * Professional Dashboard Page
 * Main dashboard for healthcare professionals
 * Part of Phase 4: Healthcare Provider Authority Layer
 * 
 * Layout shell for future integration of:
 * - Clinical record creation and management
 * - Patient consultation workflow
 * - Professional credentials and verification status
 * - Multi-facility access management
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, User, Settings, Building2, X, Check } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import '../styles/ProfessionalDashboard.css';

export default function ProfessionalDashboardPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [professionalStatus, setProfessionalStatus] = useState(null);
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchProfessionalData();
  }, [isAuthenticated, navigate]);

  const fetchProfessionalData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch professional status
      const statusResponse = await api.get('/api/v1/authorization/professional-status');

      if (statusResponse.data.success) {
        setProfessionalStatus(statusResponse.data.data);
      }

      // Fetch active facilities
      const facilitiesResponse = await api.get('/api/v1/authorization/my-facilities');

      if (facilitiesResponse.data.success) {
        const activeFacilities = facilitiesResponse.data.data.filter(
          (f) => f.associationStatus === 'active'
        );
        setFacilities(activeFacilities);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard');
      console.error('Error fetching professional data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getVerificationStatusColor = (status) => {
    switch (status) {
      case 'verified':
        return 'verified';
      case 'pending':
        return 'pending';
      case 'unverified':
        return 'unverified';
      case 'suspended':
        return 'suspended';
      default:
        return 'unknown';
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="professional-dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-content">
          <h1>Professional Dashboard</h1>
          <p>Healthcare professional workspace</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert">
          <span className="error-icon"><AlertCircle size={20} className="inline" /></span>
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading professional dashboard...</p>
        </div>
      ) : !professionalStatus?.hasProfessionalProfile ? (
        <div className="empty-state">
          <div className="empty-icon"><User size={64} className="text-gray-400" /></div>
          <h2>Create Professional Profile</h2>
          <p>You haven't created a professional profile yet.</p>
          <p>Professional profiles are required to create clinical records.</p>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/professional/register')}
          >
            Create Professional Profile
          </button>
        </div>
      ) : (
        <>
          {/* Professional Status Card */}
          <div className="professional-status-card">
            <div className="status-header">
              <h3>Professional Profile</h3>
              <span
                className={`status-badge status-${getVerificationStatusColor(
                  professionalStatus.verificationStatus
                )}`}
              >
                {professionalStatus.verificationStatus}
              </span>
            </div>

            <div className="status-content">
              <div className="status-row">
                <label>Name:</label>
                <span>
                  {professionalStatus.firstName} {professionalStatus.lastName}
                </span>
              </div>
              <div className="status-row">
                <label>Professional ID:</label>
                <span className="professional-id">
                  {professionalStatus.internalProfessionalId}
                </span>
              </div>
              <div className="status-row">
                <label>Type:</label>
                <span className="badge">{professionalStatus.professionalType}</span>
              </div>
              <div className="status-row">
                <label>Account Status:</label>
                <span
                  className={`account-status ${professionalStatus.accountStatus}`}
                >
                  {professionalStatus.accountStatus}
                </span>
              </div>

              {professionalStatus.verificationExpired && (
                <div className="warning-box">
                  <span className="warning-icon"><AlertCircle size={16} className="inline mr-2" /></span>
                  <span>
                    Your professional verification has expired. Please contact
                    an administrator to renew.
                  </span>
                </div>
              )}

              {!professionalStatus.canPerformClinicalOperations && (
                <div className="info-box">
                  <span className="info-icon"><Info size={16} className="inline mr-2" /></span>
                  <span>
                    You need verification and valid credentials to perform
                    clinical operations. Contact your facility administrator.
                  </span>
                </div>
              )}
            </div>

            <div className="status-actions">
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/professional/credentials')}
              >
                <BarChart3 size={16} className="inline mr-2" /> Manage Credentials
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/professional/profile')}
              >
                <Settings size={16} className="inline mr-2" /> Edit Profile
              </button>
            </div>
          </div>

          {/* Credentials Summary */}
          <div className="credentials-summary-card">
            <h3>Professional Credentials</h3>
            <div className="credentials-info">
              <div className="info-item">
                <span className="info-label">Valid Credentials:</span>
                <span className="info-value">
                  {professionalStatus.validCredentialsCount}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Clinical Eligibility:</span>
                <span
                  className={`eligibility-status ${
                    professionalStatus.canPerformClinicalOperations
                      ? 'eligible'
                      : 'ineligible'
                  }`}
                >
                  {professionalStatus.canPerformClinicalOperations
                    ? <><Check size={16} className="inline mr-1" /> Eligible</>
                    : <><X size={16} className="inline mr-1" /> Ineligible</>}
                </span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              onClick={() => navigate('/professional/credentials')}
            >
              View & Manage Credentials
            </button>
          </div>

          {/* Facility Associations */}
          <div className="facilities-section">
            <h3>Associated Facilities</h3>

            {facilities.length === 0 ? (
              <div className="empty-state-small">
                <p>You are not currently associated with any facilities.</p>
                <p>Contact a facility administrator to request association.</p>
              </div>
            ) : (
              <div className="facilities-grid">
                {facilities.map((facility) => (
                  <div key={facility.staffId} className="facility-card">
                    <div className="facility-header">
                      <h4>{facility.facilityName}</h4>
                      <span
                        className={`status-badge status-${facility.associationStatus}`}
                      >
                        {facility.associationStatus}
                      </span>
                    </div>

                    <div className="facility-info">
                      <div className="info-row">
                        <label>Role:</label>
                        <span className="badge">{facility.role}</span>
                      </div>
                      <div className="info-row">
                        <label>Employment Status:</label>
                        <span>{facility.employmentStatus}</span>
                      </div>
                      <div className="info-row">
                        <label>Start Date:</label>
                        <span>
                          {new Date(facility.startDate).toLocaleDateString()}
                        </span>
                      </div>

                      {facility.facilityStatus !== 'active' && (
                        <div className="warning-box">
                          <span className="warning-icon"><AlertCircle size={16} className="inline mr-2" /></span>
                          <span>Facility is {facility.facilityStatus}</span>
                        </div>
                      )}
                    </div>

                    <button
                      className="btn btn-info btn-small"
                      onClick={() =>
                        navigate(`/facility/${facility.facilityId}/workspace`)
                      }
                    >
                      Open Workspace
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3>Clinical Operations</h3>
            <div className="actions-grid">
              <button
                className="action-card"
                disabled={!professionalStatus.canPerformClinicalOperations}
                onClick={() => navigate('/clinical-record/new')}
              >
                <div className="action-icon"><Edit size={32} className="text-blue-600 mx-auto" /></div>
                <div className="action-label">Create Clinical Record</div>
                {!professionalStatus.canPerformClinicalOperations && (
                  <div className="disabled-reason">
                    Requires verification & credentials
                  </div>
                )}
              </button>

              <button
                className="action-card"
                disabled={!professionalStatus.canPerformClinicalOperations}
                onClick={() => navigate('/patient-search')}
              >
                <div className="action-icon">🔍</div>
                <div className="action-label">Find Patient</div>
                {!professionalStatus.canPerformClinicalOperations && (
                  <div className="disabled-reason">
                    Requires verification & credentials
                  </div>
                )}
              </button>

              <button
                className="action-card"
                onClick={() => navigate('/professional/facilities')}
              >
                <div className="action-icon"><Building2 size={32} className="text-blue-600 mx-auto" /></div>
                <div className="action-label">Manage Facilities</div>
              </button>

              <button
                className="action-card"
                onClick={() => navigate('/professional/credentials')}
              >
                <div className="action-icon">📚</div>
                <div className="action-label">View Credentials</div>
              </button>
            </div>
          </div>

          {/* Authorization & Compliance Info */}
          <div className="compliance-info-section">
            <h3>Authorization & Compliance</h3>
            <div className="info-content">
              <div className="info-block">
                <h4>Clinical Record Authority</h4>
                <p>
                  You can create official clinical records only when all the following
                  conditions are met:
                </p>
                <ul>
                  <li>
                    <Check size={16} className="inline mr-2" />
                    Your professional profile is
                    <strong> verified by JeevaCare</strong>
                  </li>
                  <li>
                    <Check size={16} className="inline mr-2" />
                    You have <strong>valid, verified credentials</strong>
                  </li>
                  <li>
                    <Check size={16} className="inline mr-2" />
                    You are <strong>actively associated</strong> with the facility
                  </li>
                  <li>
                    <Check size={16} className="inline mr-2" />
                    The facility is <strong>verified and active</strong>
                  </li>
                  <li>
                    <Check size={16} className="inline mr-2" />
                    The patient is <strong>accessible</strong> to your facility
                  </li>
                </ul>
              </div>

              <div className="info-block">
                <h4>Record Integrity</h4>
                <p>
                  All official clinical records created by you are:
                </p>
                <ul>
                  <li>
                    <Check size={16} className="inline mr-2" />
                    Cryptographically attributed to your professional ID
                  </li>
                  <li><FileText size={16} className="inline mr-2" /> Permanently linked to your facility association</li>
                  <li><FileText size={16} className="inline mr-2" /> Marked as provider-verified in patient history</li>
                  <li><BarChart3 size={16} className="inline mr-2" /> Auditable via access logs</li>
                  <li><Edit size={16} className="inline mr-2" /> Amendable only through traced amendments</li>
                </ul>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

