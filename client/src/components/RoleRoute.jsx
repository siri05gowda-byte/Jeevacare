import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { homeFor } from '../utils/roleHome';

/**
 * Shows its page only to the listed roles. Anyone else is sent to their own home page, so for
 * example a hospital admin never lands on a doctor's workspace.
 */
export default function RoleRoute({ roles, children }) {
  const role = useAuthStore((state) => state.user?.role);
  if (!roles.includes(role)) return <Navigate to={homeFor(role)} replace />;
  return children;
}
