import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import PatientDashboardV2 from './PatientDashboardV2';
import ProviderDashboardV2 from './ProviderDashboardV2';
import EmergencyDashboardV2 from './EmergencyDashboardV2';
import IntegratedDashboardPage from './IntegratedDashboardPage';

export default function DashboardPage() {
  const { user } = useAuthStore();

  switch (user?.role) {
    case 'DOCTOR':
      return <ProviderDashboardV2 />;
    case 'EMERGENCY':
      return <EmergencyDashboardV2 />;
    case 'HOSPITAL_ADMIN':
      return <Navigate to="/hospital/dashboard" replace />;
    case 'SYSTEM_ADMIN':
    case 'ADMIN':
      return <IntegratedDashboardPage />;
    case 'PATIENT':
    default:
      return <PatientDashboardV2 />;
  }
}
