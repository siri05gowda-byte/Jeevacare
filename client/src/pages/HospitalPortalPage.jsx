/**
 * Hospital Portal Foundation Page
 * Main dashboard for healthcare facility administrators and staff
 * Part of Phase 4: Healthcare Provider Authority Layer
 * 
 * Layout shell for future integration of:
 * - Facility staff management
 * - Patient search and identification
 * - Clinical record creation
 * - Verification workflows
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import '../styles/HospitalPortal.css';

export default function HospitalPortalPage() {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();

  const [facilities, setFacilities] = useState([]);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState(null);

  // Quick action states
  const [showPatientSearch, setShowPatientSearch] = useState(false);
  const [patientSearchQuery, setPatientSearchQuery] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchUserFacilities();
  }, [isAuthenticated, navigate]);

  const fetchUserFacilities = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/v1/authorization/my-facilities');

      if (response.data.success) {
        const activeFacilities = response.data.data.filter(
          (f) => f.associationStatus === 'active'
        );
        setFacilities(activeFacilities);

        // Set first facility as selected
        if (activeFacilities.length > 0) {
          setSelectedFacility(activeFacilities[0]);
          fetchFacilityStats(activeFacilities[0].facilityId);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load facilities');
      console.error('Error fetching facilities:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchFacilityStats = async (facilityId) => {
    try {
      // TODO: Replace with actual stats endpoint once implemented
      setStats({
        totalStaff: 0,
        pendingVerifications: 0,
        activePatients: 0,
        clinicalRecordsToday: 0,
      });
    } catch (err) {
      console.error('Error fetching facility stats:', err);
    }
  };

  const handleFacilityChange = (facility) => {
    setSelectedFacility(facility);
    fetchFacilityStats(facility.facilityId);
  };

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="hospital-portal-container">
      {/* Header */}
      <div className="portal-header">
        <div className="header-content">
          <h1>Hospital Portal</h1>
          <p>Healthcare facility management and clinical operations</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="error-alert">
          <span className="error-icon">⚠️</span>
          <span>{error}</span>
          <button className="close-btn" onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading hospital portal...</p>
        </div>
      ) : facilities.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🏥</div>
          <h2>No Associated Facilities</h2>
          <p>You are not currently associated with any healthcare facilities.</p>
          <p>Contact a facility administrator to request association.</p>
        </div>
      ) : (
        <>
          {/* Facility Selector */}
          <div className="facility-selector">
            <label>Selected Facility:</label>
            <select
              value={selectedFacility?.facilityId || ''}
              onChange={(e) => {
                const facility = facilities.find(
                  (f) => f.facilityId === e.target.value
                );
                if (facility) handleFacilityChange(facility);
              }}
              className="facility-select"
            >
              {facilities.map((facility) => (
                <option key={facility.staffId} value={facility.facilityId}>
                  {facility.facilityName}
                </option>
              ))}
            </select>
          </div>

          {/* Facility Info Card */}
          {selectedFacility && (
            <div className="facility-info-card">
              <div className="info-content">
                <h3>{selectedFacility.facilityName}</h3>
                <div className="info-row">
                  <label>Your Role:</label>
                  <span className="badge role-badge">{selectedFacility.role}</span>
                </div>
                <div className="info-row">
                  <label>Facility Status:</label>
                  <span
                    className={`status-indicator status-${selectedFacility.facilityStatus}`}
                  >
                    {selectedFacility.facilityStatus}
                  </span>
                </div>
                <div className="info-row">
                  <label>Employment Status:</label>
                  <span>{selectedFacility.employmentStatus}</span>
                </div>
              </div>

              {/* Quick Stats */}
              {stats && (
                <div className="quick-stats">
                  <div className="stat-item">
                    <span className="stat-label">Staff</span>
                    <span className="stat-value">{stats.totalStaff}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Pending</span>
                    <span className="stat-value">{stats.pendingVerifications}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Active Patients</span>
                    <span className="stat-value">{stats.activePatients}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Records Today</span>
                    <span className="stat-value">{stats.clinicalRecordsToday}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Quick Actions */}
          <div className="quick-actions-section">
            <h3>Quick Actions</h3>
            <div className="actions-grid">
              <button
                className="action-card"
                onClick={() => setShowPatientSearch(!showPatientSearch)}
              >
                <div className="action-icon">🔍</div>
                <div className="action-label">Find Patient</div>
              </button>

              <button
                className="action-card"
                onClick={() => navigate('/clinical-record/new')}
              >
                <div className="action-icon">📋</div>
                <div className="action-label">Create Record</div>
              </button>

              <button
                className="action-card"
                onClick={() => navigate('#')} // TODO: Link to staff management
              >
                <div className="action-icon">👥</div>
                <div className="action-label">Manage Staff</div>
              </button>

              <button
                className="action-card"
                onClick={() => navigate('#')} // TODO: Link to verification queue
              >
                <div className="action-icon">✓</div>
                <div className="action-label">Verify Documents</div>
              </button>
            </div>
          </div>

          {/* Patient Search Section */}
          {showPatientSearch && (
            <div className="patient-search-section">
              <h3>Patient Search</h3>
              <div className="search-form">
                <input
                  type="text"
                  placeholder="Search by JeevaCare ID or name..."
                  value={patientSearchQuery}
                  onChange={(e) => setPatientSearchQuery(e.target.value)}
                  className="search-input"
                />
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    if (patientSearchQuery.trim()) {
                      navigate(
                        `/patient-search?q=${encodeURIComponent(
                          patientSearchQuery
                        )}`
                      );
                    }
                  }}
                >
                  Search
                </button>
              </div>
            </div>
          )}

          {/* Main Content Area - Foundation Shell */}
          <div className="portal-content-area">
            <h3>Hospital Dashboard</h3>
            <div className="content-placeholder">
              <div className="placeholder-icon">🏗️</div>
              <p>Hospital Portal features coming soon:</p>
              <ul>
                <li>Clinical record management</li>
                <li>Staff directory and permissions</li>
                <li>Patient appointment scheduling</li>
                <li>Laboratory and radiology results</li>
                <li>Medication management</li>
                <li>Emergency access logs</li>
              </ul>
            </div>
          </div>

          {/* Quick Reference - Permission Status */}
          {selectedFacility && (
            <div className="permissions-reference">
              <h4>Your Permissions at {selectedFacility.facilityName}</h4>
              <div className="permissions-list">
                {selectedFacility.permissions ? (
                  <>
                    <div className="permission-item">
                      <span className="permission-name">View Patient Records</span>
                      <span
                        className={`permission-status ${
                          selectedFacility.permissions.viewPatientRecords
                            ? 'granted'
                            : 'denied'
                        }`}
                      >
                        {selectedFacility.permissions.viewPatientRecords
                          ? '✓'
                          : '✗'}
                      </span>
                    </div>
                    <div className="permission-item">
                      <span className="permission-name">Create Clinical Records</span>
                      <span
                        className={`permission-status ${
                          selectedFacility.permissions.createClinicalRecords
                            ? 'granted'
                            : 'denied'
                        }`}
                      >
                        {selectedFacility.permissions.createClinicalRecords
                          ? '✓'
                          : '✗'}
                      </span>
                    </div>
                    <div className="permission-item">
                      <span className="permission-name">Manage Staff</span>
                      <span
                        className={`permission-status ${
                          selectedFacility.permissions.manageStaff
                            ? 'granted'
                            : 'denied'
                        }`}
                      >
                        {selectedFacility.permissions.manageStaff ? '✓' : '✗'}
                      </span>
                    </div>
                  </>
                ) : (
                  <p>No permissions data available</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

