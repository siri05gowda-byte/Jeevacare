/**
 * Emergency Dashboard Page
 * Shows critical emergency information for healthcare professionals
 * Red/amber/green visual hierarchy for quick comprehension
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Droplet } from 'lucide-react';
import { useEmergencyStore } from '../stores/emergencyStore';
import '../styles/EmergencyDashboard.css';

const EmergencyDashboardPage = () => {
  const { patientId, accessId } = useParams();
  const navigate = useNavigate();

  const {
    emergencySummary: summary,
    currentAccess: access,
    loading,
    error,
    loadEmergencySummary,
    loadAccessDetails,
  } = useEmergencyStore();

  const [expandedSection, setExpandedSection] = useState('critical');
  const [accessTimeRemaining, setAccessTimeRemaining] = useState(null);

  useEffect(() => {
    const fetchEmergencyData = async () => {
      try {
        if (patientId && accessId) {
          await Promise.all([
            loadEmergencySummary(accessId, patientId),
            loadAccessDetails(accessId),
          ]);
        }
      } catch (err) {
        console.error('Failed to fetch emergency data:', err);
      }
    };

    fetchEmergencyData();
  }, [patientId, accessId, loadEmergencySummary, loadAccessDetails]);

  // Update countdown timer
  useEffect(() => {
    if (!access?.accessExpirationDateTime) return;

    const updateTimer = () => {
      const now = new Date();
      const expiration = new Date(access.accessExpirationDateTime);
      const diff = expiration - now;

      if (diff <= 0) {
        setAccessTimeRemaining('EXPIRED');
      } else {
        const minutes = Math.floor(diff / 60000);
        const seconds = Math.floor((diff % 60000) / 1000);
        setAccessTimeRemaining(`${minutes}:${seconds.toString().padStart(2, '0')}`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [access]);

  if (loading) {
    return (
      <div className="emergency-dashboard-container loading">
        <div className="loading-spinner">Loading emergency information...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="emergency-dashboard-container error">
        <div className="error-alert">
          <div className="error-icon"><AlertTriangle size={32} className="text-red-600" /></div>
          <div className="error-message">{error}</div>
          <button onClick={() => navigate(-1)} className="btn-secondary">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="emergency-dashboard-container error">
        <div className="error-alert">Emergency summary not available</div>
      </div>
    );
  }

  const hasCriticalAlerts =
    summary.criticalAlerts.allergies.length > 0 ||
    summary.criticalAlerts.conditions.length > 0 ||
    summary.criticalAlerts.warnings.length > 0;

  return (
    <div className="emergency-dashboard-container">
      {/* Header with Patient ID and Access Info */}
      <div className="emergency-header">
        <div className="header-primary">
          <div className="patient-identity">
            <div className="patient-name">
              {summary.patientIdentity.firstName} {summary.patientIdentity.lastName}
            </div>
            <div className="patient-id">JeevaId: {summary.patientIdentity.jeevaId}</div>
            <div className="patient-age">
              Age: {new Date().getFullYear() - new Date(summary.patientIdentity.dateOfBirth).getFullYear()}
            </div>
          </div>

          <div className="verification-status">
            <span
              className={`status-badge ${summary.patientIdentity.verificationStatus === 'verified' ? 'verified' : 'unverified'}`}
            >
              {summary.patientIdentity.verificationStatus.toUpperCase()}
            </span>
          </div>
        </div>

        <div className="header-access-info">
          <div className="access-details">
            <div className="access-time">
              <span className="label">Access Valid:</span>
              <span className={`time ${accessTimeRemaining === 'EXPIRED' ? 'expired' : ''}`}>
                {accessTimeRemaining || 'Calculating...'}
              </span>
            </div>
            <div className="access-reason">
              <span className="label">Reason:</span>
              <span>{access?.accessReason?.replace(/_/g, ' ').toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* CRITICAL ALERTS - FIRST PRIORITY */}
      <div className="section critical-section">
        <div
          className="section-header critical"
          onClick={() =>
            setExpandedSection(expandedSection === 'critical' ? null : 'critical')
          }
        >
          <div className="section-title flex items-center gap-2">
            <AlertTriangle size={20} />
            CRITICAL ALERTS
          </div>
          <span className="expand-icon">{expandedSection === 'critical' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'critical' && (
          <div className="section-content">
            {/* Life-threatening Allergies */}
            {summary.criticalAlerts.allergies.length > 0 && (
              <div className="alert-block allergies-block">
                <h3 className="block-title flex items-center gap-2">
                  <AlertTriangle size={18} />
                  ALLERGIES
                </h3>
                <div className="alert-items">
                  {summary.criticalAlerts.allergies.map((allergy, idx) => (
                    <div key={idx} className={`alert-item severity-${allergy.severity}`}>
                      <div className="alert-content">
                        <div className="allergen">{allergy.allergen}</div>
                        <div className="severity">Severity: {allergy.severity.toUpperCase()}</div>
                        {allergy.reaction && <div className="reaction">Reaction: {allergy.reaction}</div>}
                      </div>
                      <div className={`source-badge ${allergy.verificationStatus}`}>
                        {allergy.source.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Critical Conditions */}
            {summary.criticalAlerts.conditions.length > 0 && (
              <div className="alert-block conditions-block">
                <h3 className="block-title flex items-center gap-2">
                  <AlertCircle size={18} />
                  CRITICAL CONDITIONS
                </h3>
                <div className="alert-items">
                  {summary.criticalAlerts.conditions.map((condition, idx) => (
                    <div key={idx} className={`alert-item severity-${condition.severity}`}>
                      <div className="alert-content">
                        <div className="condition">{condition.condition}</div>
                        <div className="severity">Severity: {condition.severity.toUpperCase()}</div>
                      </div>
                      <div className={`source-badge ${condition.verificationStatus}`}>
                        {condition.source.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Current Medications */}
            {summary.criticalAlerts.medications.length > 0 && (
              <div className="alert-block medications-block">
                <h3 className="block-title flex items-center gap-2">
                  <AlertCircle size={18} />
                  CURRENT MEDICATIONS
                </h3>
                <div className="alert-items">
                  {summary.criticalAlerts.medications.map((med, idx) => (
                    <div key={idx} className="alert-item">
                      <div className="alert-content">
                        <div className="medication">{med.medicationName}</div>
                        {med.dosage && <div className="dosage">{med.dosage}</div>}
                        {med.frequency && <div className="frequency">{med.frequency}</div>}
                      </div>
                      <div className={`source-badge ${med.verificationStatus}`}>
                        {med.source.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Important Warnings */}
            {summary.criticalAlerts.warnings?.length > 0 && (
              <div className="alert-block warnings-block">
                <h3 className="block-title flex items-center gap-2">
                  <AlertTriangle size={18} />
                  IMPORTANT WARNINGS
                </h3>
                <div className="alert-items">
                  {summary.criticalAlerts.warnings.map((warning, idx) => (
                    <div key={idx} className={`alert-item severity-${warning.severity}`}>
                      <div>{warning.warning}</div>
                      <div className={`source-badge ${warning.verificationStatus}`}>
                        {warning.source.replace(/_/g, ' ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Blood Group */}
            {summary.criticalAlerts.bloodGroup && (
              <div className="alert-block blood-group-block">
                <h3 className="block-title flex items-center gap-2">
                  <Droplet size={18} />
                  BLOOD GROUP
                </h3>
                <div className="blood-group-display">
                  <div className="blood-type">{summary.criticalAlerts.bloodGroup.group}</div>
                  <div className={`source-badge ${summary.criticalAlerts.bloodGroup.verificationStatus}`}>
                    {summary.criticalAlerts.bloodGroup.source.replace(/_/g, ' ')}
                  </div>
                </div>
              </div>
            )}

            {!hasCriticalAlerts && (
              <div className="no-alerts">No critical alerts for this patient</div>
            )}
          </div>
        )}
      </div>

      {/* IMPORTANT HISTORY - SECOND PRIORITY */}
      <div className="section history-section">
        <div
          className="section-header"
          onClick={() =>
            setExpandedSection(expandedSection === 'history' ? null : 'history')
          }
        >
          <div className="section-title flex items-center gap-2">
            <AlertCircle size={20} />
            IMPORTANT HISTORY
          </div>
          <span className="expand-icon">{expandedSection === 'history' ? '▼' : '▶'}</span>
        </div>

        {expandedSection === 'history' && (
          <div className="section-content">
            {/* Major Surgeries */}
            {summary.importantHistory.majorSurgeries?.length > 0 && (
              <div className="history-block">
                <h3>Major Surgeries</h3>
                <div className="history-items">
                  {summary.importantHistory.majorSurgeries.map((surgery, idx) => (
                    <div key={idx} className="history-item">
                      <div className="surgery-name">{surgery.surgeryName}</div>
                      {surgery.date && (
                        <div className="surgery-date">
                          {new Date(surgery.date).toLocaleDateString()}
                        </div>
                      )}
                      {surgery.complications && (
                        <div className="complications">Complications: {surgery.complications}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Emergency Notes */}
            {summary.importantHistory.emergencyNotes && (
              <div className="history-block">
                <h3>Emergency Notes</h3>
                <p className="notes">{summary.importantHistory.emergencyNotes}</p>
              </div>
            )}

            {/* Provider Verified Notes */}
            {summary.importantHistory.providerVerifiedNotes && (
              <div className="history-block verified">
                <h3>Provider Notes (Verified)</h3>
                <p className="notes">{summary.importantHistory.providerVerifiedNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ACCESS INFORMATION - FOOTER */}
      <div className="section access-info-section">
        <div className="section-header flex items-center gap-2">
          <AlertCircle size={20} />
          <span>Access Information</span>
        </div>
        <div className="access-metadata">
          <div className="metadata-item">
            <span className="label">Access ID:</span>
            <span className="value">{access?.accessId}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Professional:</span>
            <span className="value">{access?.professionalId?.profile?.firstName}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Facility:</span>
            <span className="value">{access?.facilityId?.name || 'Not specified'}</span>
          </div>
          <div className="metadata-item">
            <span className="label">Authorized at:</span>
            <span className="value">
              {access?.authorizationDateTime
                ? new Date(access.authorizationDateTime).toLocaleString()
                : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="actions">
        <button onClick={() => navigate(-1)} className="btn-secondary">
          Close Emergency Access
        </button>
      </div>
    </div>
  );
};

export default EmergencyDashboardPage;
