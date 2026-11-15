import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

function Spinner({ label }) {
  return (
    <div className="flex flex-col items-center justify-center h-screen gap-4">
      <div className="animate-spin-slow">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-jeevacare-blue rounded-full"></div>
      </div>
      {label && <p className="text-sm text-gray-600">{label}</p>}
    </div>
  );
}

/**
 * Shows its page only to a signed-in user whose account has finished loading.
 * After a refresh the stored token is there straight away but the user is not, so the page must wait
 * instead of rendering with no user ("Not authenticated").
 */
export default function ProtectedRoute({ children }) {
  const { token, user, isLoading, isInitialized, connectionError, initialize } = useAuthStore();

  if (isLoading) return <Spinner />;
  if (!token) return <Navigate to="/login" replace />;
  if (!isInitialized) return <Spinner label="Loading your account…" />;

  if (!user) {
    if (connectionError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen gap-4 px-6 text-center">
          <p className="text-lg font-semibold text-gray-900">We couldn&apos;t reach JeevaCare</p>
          <p className="text-sm text-gray-600 max-w-md">
            The server may be waking up or your connection dropped. You are still signed in.
          </p>
          <button type="button" className="btn btn-primary" onClick={() => initialize()}>
            Retry
          </button>
        </div>
      );
    }
    return <Navigate to="/login" replace />;
  }

  return children;
}
