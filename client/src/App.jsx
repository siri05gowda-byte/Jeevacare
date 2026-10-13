import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/State/ErrorBoundary';
import MainLayout from './layouts/MainLayout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import IntegratedDashboardPage from './pages/IntegratedDashboardPage';
import PatientDashboardV2 from './pages/PatientDashboardV2';
import ProviderDashboardV2 from './pages/ProviderDashboardV2';
import EmergencyDashboardV2 from './pages/EmergencyDashboardV2';
import HospitalPatientsPage from './pages/HospitalPatientsPage';
import HospitalAppointmentsPage from './pages/HospitalAppointmentsPage';
import HospitalSchedulePage from './pages/HospitalSchedulePage';
import PatientAppointmentsPage from './pages/PatientAppointmentsPage';
import DocumentsPage from './pages/DocumentsPage';
import AppointmentBookingPage from './pages/AppointmentBookingPage';
import ProviderEncounterPage from './pages/ProviderEncounterPage';
import EmergencyAccessPage from './pages/EmergencyAccessPage';
import DocumentUploadPage from './pages/DocumentUploadPage';
import StaffDocumentUpload from './pages/StaffDocumentUpload';
import RadiologyPage from './pages/RadiologyPage';
import SettingsPage from './pages/SettingsPage';

// Protected route component
function ProtectedRoute({ children }) {
  const { token, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin-slow">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-jeevacare-blue rounded-full"></div>
        </div>
      </div>
    );
  }

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <ErrorBoundary>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="" element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="patient" element={<PatientDashboardV2 />} />
            <Route path="provider" element={<ProviderDashboardV2 />} />
            <Route path="emergency" element={<EmergencyDashboardV2 />} />
            <Route path="documents" element={<DocumentsPage />} />
            <Route path="radiology" element={<RadiologyPage />} />
            <Route path="appointments" element={<PatientAppointmentsPage />} />
            <Route path="appointments/book" element={<AppointmentBookingPage />} />
            <Route path="encounter" element={<ProviderEncounterPage />} />
            <Route path="emergency-access" element={<EmergencyAccessPage />} />
            <Route path="upload-documents" element={<DocumentUploadPage />} />
            <Route path="staff/upload-documents" element={<StaffDocumentUpload />} />
            <Route path="integrated-dashboard" element={<IntegratedDashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            
            {/* Hospital/Doctor routes */}
            <Route path="hospital/patients" element={<HospitalPatientsPage />} />
            <Route path="hospital/appointments" element={<HospitalAppointmentsPage />} />
            <Route path="hospital/schedule" element={<HospitalSchedulePage />} />
          </Route>

          {/* Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </ErrorBoundary>
  );
}

export default App;

