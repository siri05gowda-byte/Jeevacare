import React from 'react';
import { useAuthStore } from '../stores/authStore';

export default function DashboardPage() {
  const { user } = useAuthStore();

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Welcome, {user?.profile?.firstName}!
        </h1>
        <p className="text-gray-600 mt-2">JeevaCare - One Life. One Health Journey.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Medical Records</p>
              <p className="text-3xl font-bold text-jeevacare-blue mt-2">0</p>
            </div>
            <div className="text-4xl text-gray-200">📋</div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Upcoming Appointments</p>
              <p className="text-3xl font-bold text-jeevacare-green mt-2">0</p>
            </div>
            <div className="text-4xl text-gray-200">📅</div>
          </div>
        </div>

        <div className="card">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-600 text-sm font-medium">Recent Alerts</p>
              <p className="text-3xl font-bold text-jeevacare-amber mt-2">0</p>
            </div>
            <div className="text-4xl text-gray-200">⚠️</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold text-gray-900 mb-4">System Status</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">API Server</span>
            <span className="badge-success">Connected</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Database</span>
            <span className="badge-success">Connected</span>
          </div>
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
            <span className="text-sm text-gray-700">Authentication</span>
            <span className="badge-success">Active</span>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="font-semibold text-blue-900 mb-2">🚀 Welcome to JeevaCare</h3>
        <p className="text-sm text-blue-800">
          JeevaCare is your lifelong health journey platform. Your medical records, appointments,
          and health information are securely managed in one place. Start by exploring the dashboard
          features or uploading your medical documents.
        </p>
      </div>
    </div>
  );
}
