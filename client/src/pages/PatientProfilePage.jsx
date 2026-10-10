/**
 * Patient Profile Page
 * Displays comprehensive patient identity information
 * Shows JeevaId, name, DOB, sex, relationships, verification status
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Check, Lock, Edit, BarChart3 } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';
import '../styles/PatientProfile.css';

export default function PatientProfilePage() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [guardians, setGuardians] = useState([]);
  const [parents, setParents] = useState([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    fetchPatientProfile();
  }, [patientId, isAuthenticated, navigate]);

  const fetchPatientProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = patientId ? `/api/v1/patients/${patientId}` : '/api/v1/patients/profile';
      const response = await api.get(endpoint);

      if (response.data.success) {
        const patientData = response.data.data;
        setPatient(patientData);

        // Fetch guardians and parents if available
        if (patientData._id) {
          const guardiansRes = await api.get(`/api/v1/guardians/patient/${patientData._id}`);
          if (guardiansRes.data.success) {
            setGuardians(guardiansRes.data.data);
          }

          // Fetch parents if this is a newborn endpoint
          if (patientData.birthInformation) {
            // Parents would be fetched from newborn endpoint
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load patient profile');
      console.error('Error fetching patient profile:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="patient-profile-container">
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading patient profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="patient-profile-container">
        <div className="error-state">
          <h2>Error Loading Profile</h2>
          <p>{error}</p>
          <button onClick={fetchPatientProfile} className="btn btn-primary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="patient-profile-container">
        <div className="empty-state">
          <h2>Patient Not Found</h2>
          <p>The patient profile you're looking for doesn't exist.</p>
        </div>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'Not provided';
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getVerificationBadge = (status) => {
    const badges = {
      verified: { class: 'badge-success', label: 'Verified' },
      pending: { class: 'badge-warning', label: 'Pending' },
      unverified: { class: 'badge-secondary', label: 'Unverified' },
      rejected: { class: 'badge-danger', label: 'Rejected' },
    };
    return badges[status] || badges.unverified;
  };

  const getStatusBadge = (status) => {
    const badges = {
      active: { class: 'badge-success', label: 'Active' },
      suspended: { class: 'badge-warning', label: 'Suspended' },
      deleted: { class: 'badge-danger', label: 'Deleted' },
    };
    return badges[status] || badges.active;
  };

  const verificationBadge = getVerificationBadge(patient.identityVerification?.status);
  const statusBadge = getStatusBadge(patient.status);

  return (
    <div className="patient-profile-container">
      <div className="profile-header">
        <h1>Patient Profile</h1>
        <p className="subtitle">Complete health identity information</p>
      </div>

      {/* Primary Identity Card */}
      <div className="card identity-card">
        <div className="card-header">
          <h2>Identity Information</h2>
          <span className={`badge ${statusBadge.class}`}>{statusBadge.label}</span>
        </div>
        <div className="card-content">
          <div className="identity-grid">
            {/* JeevaId - Most Important */}
            <div className="identity-item featured">
              <label>JeevaCare ID</label>
              <div className="jeevaid-display">
                <code>{patient.jeevaId}</code>
                <button
                  className="btn-copy"
                  onClick={() => navigator.clipboard.writeText(patient.jeevaId)}
                  title="Copy JeevaId"
                >
                  <FileText size={16} className="inline" />
                </button>
              </div>
              <p className="help-text">Your unique lifelong healthcare identifier</p>
            </div>

            {/* Name */}
            <div className="identity-item">
              <label>Full Name</label>
              <p className="value">
                {patient.personalIdentity.firstName} {patient.personalIdentity.lastName}
              </p>
            </div>

            {/* Date of Birth */}
            <div className="identity-item">
              <label>Date of Birth</label>
              <p className="value">{formatDate(patient.personalIdentity.dateOfBirth)}</p>
              <p className="help-text">
                Age: {new Date().getFullYear() - new Date(patient.personalIdentity.dateOfBirth).getFullYear()} years
              </p>
            </div>

            {/* Sex */}
            <div className="identity-item">
              <label>Sex</label>
              <p className="value">
                {patient.personalIdentity.sex === 'M' && <span><span className="text-xl mr-2">👨</span> Male</span>}
                {patient.personalIdentity.sex === 'F' && <span><span className="text-xl mr-2">👩</span> Female</span>}
                {patient.personalIdentity.sex === 'O' && 'Other'}
                {patient.personalIdentity.sex === 'Prefer not to say' && 'Prefer not to say'}
              </p>
            </div>

            {/* Contact Information */}
            <div className="identity-item">
              <label>Phone</label>
              <p className="value">{patient.personalIdentity.phone || 'Not provided'}</p>
            </div>

            <div className="identity-item">
              <label>Email</label>
              <p className="value">{patient.personalIdentity.email || 'Not provided'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Status Card */}
      <div className="card verification-card">
        <div className="card-header">
          <h2>Identity Verification</h2>
          <span className={`badge ${verificationBadge.class}`}>{verificationBadge.label}</span>
        </div>
        <div className="card-content">
          <div className="verification-info">
            <div className="info-row">
              <span className="label">Status:</span>
              <span className="value capitalize">{patient.identityVerification?.status || 'Unverified'}</span>
            </div>
            <div className="info-row">
              <span className="label">Method:</span>
              <span className="value">{patient.identityVerification?.method || 'Not verified'}</span>
            </div>
            {patient.identityVerification?.verifiedAt && (
              <div className="info-row">
                <span className="label">Verified At:</span>
                <span className="value">{formatDate(patient.identityVerification.verifiedAt)}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Blood Group Card */}
      {patient.bloodGroup && patient.bloodGroup.group && (
        <div className="card blood-group-card">
          <div className="card-header">
            <h2>Blood Group</h2>
          </div>
          <div className="card-content">
            <div className="blood-group-display">
              <div className="group-value">{patient.bloodGroup.group}</div>
              <div className="group-info">
                <p><strong>Source:</strong> {patient.bloodGroup.source.replace(/_/g, ' ')}</p>
                <p><strong>Verification:</strong> {patient.bloodGroup.verificationStatus.replace(/_/g, ' ')}</p>
                {patient.bloodGroup.verifiedAt && (
                  <p><strong>Verified:</strong> {formatDate(patient.bloodGroup.verifiedAt)}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Birth Information Card */}
      {patient.birthInformation && (
        <div className="card birth-info-card">
          <div className="card-header">
            <h2>Birth Information</h2>
          </div>
          <div className="card-content">
            <div className="birth-info-grid">
              {patient.birthInformation.placeOfBirth && (
                <div className="info-item">
                  <label>Place of Birth</label>
                  <p>{patient.birthInformation.placeOfBirth}</p>
                </div>
              )}
              {patient.birthInformation.timeOfBirth && (
                <div className="info-item">
                  <label>Time of Birth</label>
                  <p>{patient.birthInformation.timeOfBirth}</p>
                </div>
              )}
              {patient.birthInformation.birthWeight && (
                <div className="info-item">
                  <label>Birth Weight</label>
                  <p>{patient.birthInformation.birthWeight.value} {patient.birthInformation.birthWeight.unit}</p>
                </div>
              )}
              {patient.birthInformation.birthLength && (
                <div className="info-item">
                  <label>Birth Length</label>
                  <p>{patient.birthInformation.birthLength.value} {patient.birthInformation.birthLength.unit}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Guardians Card */}
      {guardians && guardians.length > 0 && (
        <div className="card guardians-card">
          <div className="card-header">
            <h2>Guardians ({guardians.length})</h2>
          </div>
          <div className="card-content">
            <div className="guardians-list">
              {guardians.map((guardian) => (
                <div key={guardian._id} className="guardian-item">
                  <div className="guardian-header">
                    <h3>{guardian.relationship}</h3>
                    <span className={`badge ${getStatusBadge(guardian.status).class}`}>
                      {getStatusBadge(guardian.status).label}
                    </span>
                  </div>
                  <div className="guardian-info">
                    <p><strong>User:</strong> {guardian.guardianUserId?.profile?.firstName} {guardian.guardianUserId?.profile?.lastName}</p>
                    <p><strong>Verification:</strong> {guardian.verificationStatus}</p>
                    {guardian.permissions && (
                      <div className="permissions-list">
                        <strong>Permissions:</strong>
                        <ul>
                          {guardian.permissions.viewMedicalRecords && <li><Check size={16} className="inline mr-1" /> View Medical Records</li>}
                          {guardian.permissions.manageMedicalRecords && <li><Check size={16} className="inline mr-1" /> Manage Medical Records</li>}
                          {guardian.permissions.manageAppointments && <li><Check size={16} className="inline mr-1" /> Manage Appointments</li>}
                          {guardian.permissions.manageEmergencyProfile && <li><Check size={16} className="inline mr-1" /> Manage Emergency Profile</li>}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Parents Card */}
      {parents && parents.length > 0 && (
        <div className="card parents-card">
          <div className="card-header">
            <h2>Parents</h2>
          </div>
          <div className="card-content">
            <div className="parents-list">
              {parents.map((parent) => (
                <div key={parent._id} className="parent-item">
                  <h3>{parent.relationship}</h3>
                  <p>
                    {parent.parentName?.firstName} {parent.parentName?.lastName}
                    {parent.parentPatientId && ` (${parent.parentPatientId.jeevaId})`}
                  </p>
                  <p className="verification">
                    Verification: {parent.verificationStatus}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Account Status Card */}
      <div className="card account-status-card">
        <div className="card-header">
          <h2>Account Status</h2>
        </div>
        <div className="card-content">
          <div className="status-info">
            <div className="status-row">
              <span className="label">Account Status:</span>
              <span className={`badge ${getStatusBadge(patient.status).class}`}>
                {getStatusBadge(patient.status).label}
              </span>
            </div>
            <div className="status-row">
              <span className="label">Member Since:</span>
              <span className="value">{formatDate(patient.createdAt)}</span>
            </div>
            <div className="status-row">
              <span className="label">Last Updated:</span>
              <span className="value">{formatDate(patient.updatedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="profile-actions">
        <button
          className="btn btn-secondary"
          onClick={() => navigate('/dashboard')}
        >
          ← Back to Dashboard
        </button>
        <button
          className="btn btn-primary"
          onClick={() => navigate(`/patient/${patient._id}/edit`)}
        >
          <Edit size={16} className="inline mr-2" /> Edit Profile
        </button>
      </div>
    </div>
  );
}
