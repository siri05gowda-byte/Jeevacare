/**
 * Integrated Dashboard - Phase 8-18 Feature Hub
 * Unified dashboard connecting all clinical features
 * Handles: Appointments, Clinical Records, Hospital Operations, AI Features, Audit Logging
 */

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useAppointmentStore } from '../stores/appointmentStore';
import { useClinicalRecordsStore } from '../stores/clinicalRecordsStore';
import { useHospitalStore } from '../stores/hospitalStore';
import { useAiStore } from '../stores/aiStore';
import { useAuditStore } from '../stores/auditStore';
import '../styles/IntegratedDashboard.css';

const IntegratedDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('overview');

  // Appointment management
  const { 
    appointments, 
    loading: appointmentLoading,
    loadPatientAppointments 
  } = useAppointmentStore();

  // Clinical records
  const { 
    records, 
    dischargeSummaries, 
    labResults,
    radiologyRecords,
    vaccinations,
    loading: recordsLoading,
    loadRecords,
    loadDischargeSummaries,
    loadLabResults,
    loadRadiologyRecords,
    loadVaccinations,
  } = useClinicalRecordsStore();

  // Hospital/encounters
  const { 
    encounters, 
    checkInHistory,
    loading: hospitalLoading,
    loadEncounters,
    loadCheckInHistory,
  } = useHospitalStore();

  // AI features
  const { 
    medicalSummary,
    loading: aiLoading,
    generateMedicalSummary,
    setLanguage,
  } = useAiStore();

  // Audit logging
  const { 
    auditTrail,
    loading: auditLoading,
    loadPatientAuditTrail,
  } = useAuditStore();

  const [patientId, setPatientId] = useState(null);
  const [language, setSelectedLanguage] = useState('en');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }

    const id = user?.patient?.id || user?.id;
    if (id) {
      setPatientId(id);
      loadInitialData(id);
    }
  }, [isAuthenticated, user]);

  const loadInitialData = async (id) => {
    try {
      await Promise.all([
        loadPatientAppointments(id),
        loadRecords(id),
        loadEncounters(id),
        loadPatientAuditTrail(id),
      ]);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  const handleLanguageChange = (lang) => {
    setSelectedLanguage(lang);
    setLanguage(lang);
    if (patientId && activeTab === 'medical-summary') {
      generateMedicalSummary(patientId, lang);
    }
  };

  const handleGenerateSummary = async () => {
    if (patientId) {
      await generateMedicalSummary(patientId, language);
    }
  };

  // Overview Tab
  const renderOverviewTab = () => (
    <div className="overview-tab">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-label">Upcoming Appointments</div>
            <div className="stat-value">{appointments?.length || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-content">
            <div className="stat-label">Clinical Records</div>
            <div className="stat-value">{records?.length || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🏥</div>
          <div className="stat-content">
            <div className="stat-label">Encounters</div>
            <div className="stat-value">{encounters?.length || 0}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🔍</div>
          <div className="stat-content">
            <div className="stat-label">Audit Events</div>
            <div className="stat-value">{auditTrail?.length || 0}</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions">
        <h3>Quick Actions</h3>
        <div className="actions-grid">
          <button 
            className="action-btn"
            onClick={() => setActiveTab('appointments')}
          >
            📅 View Appointments
          </button>
          <button 
            className="action-btn"
            onClick={() => setActiveTab('records')}
          >
            📋 View Records
          </button>
          <button 
            className="action-btn"
            onClick={() => setActiveTab('medical-summary')}
          >
            🧠 AI Summary
          </button>
          <button 
            className="action-btn"
            onClick={() => setActiveTab('audit')}
          >
            🔐 Audit Log
          </button>
        </div>
      </div>
    </div>
  );

  // Appointments Tab
  const renderAppointmentsTab = () => (
    <div className="appointments-tab">
      <h2>Your Appointments</h2>
      {appointmentLoading ? (
        <div className="loading">Loading appointments...</div>
      ) : appointments && appointments.length > 0 ? (
        <div className="appointments-list">
          {appointments.map((apt) => (
            <div key={apt._id} className="appointment-card">
              <div className="appointment-header">
                <div className="appointment-time">
                  {new Date(apt.scheduledDateTime).toLocaleString()}
                </div>
                <span className={`status-badge ${apt.status}`}>
                  {apt.status.toUpperCase()}
                </span>
              </div>
              <div className="appointment-details">
                <p><strong>Doctor:</strong> {apt.doctorId?.profile?.firstName}</p>
                <p><strong>Facility:</strong> {apt.facilityId?.name}</p>
                <p><strong>Type:</strong> {apt.appointmentType}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No appointments scheduled</div>
      )}
    </div>
  );

  // Clinical Records Tab
  const renderRecordsTab = () => (
    <div className="records-tab">
      <h2>Clinical Records</h2>
      <div className="records-section">
        <div className="section">
          <h3>Discharge Summaries ({dischargeSummaries?.length || 0})</h3>
          {dischargeSummaries && dischargeSummaries.length > 0 ? (
            <div className="items-list">
              {dischargeSummaries.map((item) => (
                <div key={item._id} className="record-item">
                  <div className="item-date">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </div>
                  <div className="item-facility">{item.facilityId?.name}</div>
                </div>
              ))}
            </div>
          ) : (
            <p>No discharge summaries</p>
          )}
        </div>

        <div className="section">
          <h3>Lab Results ({labResults?.length || 0})</h3>
          {labResults && labResults.length > 0 ? (
            <div className="items-list">
              {labResults.map((item) => (
                <div key={item._id} className="record-item">
                  <div className="item-type">{item.testName}</div>
                  <div className="item-date">
                    {new Date(item.resultDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No lab results</p>
          )}
        </div>

        <div className="section">
          <h3>Radiology ({radiologyRecords?.length || 0})</h3>
          {radiologyRecords && radiologyRecords.length > 0 ? (
            <div className="items-list">
              {radiologyRecords.map((item) => (
                <div key={item._id} className="record-item">
                  <div className="item-type">{item.studyType}</div>
                  <div className="item-date">
                    {new Date(item.studyDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No radiology records</p>
          )}
        </div>

        <div className="section">
          <h3>Vaccinations ({vaccinations?.length || 0})</h3>
          {vaccinations && vaccinations.length > 0 ? (
            <div className="items-list">
              {vaccinations.map((item) => (
                <div key={item._id} className="record-item">
                  <div className="item-vaccine">{item.vaccineName}</div>
                  <div className="item-date">
                    {new Date(item.administrationDate).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No vaccination records</p>
          )}
        </div>
      </div>
    </div>
  );

  // Medical Summary Tab (AI)
  const renderMedicalSummaryTab = () => (
    <div className="medical-summary-tab">
      <h2>AI-Generated Medical Summary</h2>
      
      <div className="summary-controls">
        <label>Language:</label>
        <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
          <option value="en">English</option>
          <option value="hi">Hindi</option>
          <option value="kn">Kannada</option>
          <option value="te">Telugu</option>
          <option value="ta">Tamil</option>
          <option value="ml">Malayalam</option>
        </select>
        <button 
          onClick={handleGenerateSummary}
          disabled={aiLoading}
          className="btn-primary"
        >
          {aiLoading ? 'Generating...' : 'Generate Summary'}
        </button>
      </div>

      {medicalSummary && (
        <div className="summary-content">
          <div className="summary-text">
            {medicalSummary.summary || medicalSummary}
          </div>
        </div>
      )}
    </div>
  );

  // Audit Tab
  const renderAuditTab = () => (
    <div className="audit-tab">
      <h2>Access Audit Trail</h2>
      {auditLoading ? (
        <div className="loading">Loading audit trail...</div>
      ) : auditTrail && auditTrail.length > 0 ? (
        <div className="audit-list">
          {auditTrail.map((event, idx) => (
            <div key={idx} className="audit-event">
              <div className="event-time">
                {new Date(event.timestamp).toLocaleString()}
              </div>
              <div className="event-action">{event.action}</div>
              <div className="event-actor">{event.actorType}: {event.actorId}</div>
              {event.details && (
                <div className="event-details">{event.details}</div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No audit events recorded</div>
      )}
    </div>
  );

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="integrated-dashboard-container">
      <div className="dashboard-header">
        <h1>Integrated Health Dashboard</h1>
        <p>Manage your appointments, records, and health information in one place</p>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Overview
        </button>
        <button 
          className={`tab-btn ${activeTab === 'appointments' ? 'active' : ''}`}
          onClick={() => setActiveTab('appointments')}
        >
          Appointments
        </button>
        <button 
          className={`tab-btn ${activeTab === 'records' ? 'active' : ''}`}
          onClick={() => setActiveTab('records')}
        >
          Records
        </button>
        <button 
          className={`tab-btn ${activeTab === 'medical-summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('medical-summary')}
        >
          AI Summary
        </button>
        <button 
          className={`tab-btn ${activeTab === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveTab('audit')}
        >
          Audit Log
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === 'overview' && renderOverviewTab()}
        {activeTab === 'appointments' && renderAppointmentsTab()}
        {activeTab === 'records' && renderRecordsTab()}
        {activeTab === 'medical-summary' && renderMedicalSummaryTab()}
        {activeTab === 'audit' && renderAuditTab()}
      </div>
    </div>
  );
};

export default IntegratedDashboardPage;
