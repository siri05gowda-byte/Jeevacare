import React from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Home, Users, Stethoscope, Calendar, AlertCircle, FileText } from 'lucide-react';

export default function Sidebar() {
  const { user } = useAuthStore();

  const menuItems = {
    PATIENT: [
      { name: 'Dashboard', path: '/dashboard', icon: Home },
      { name: 'My Records', path: '/records', icon: FileText },
      { name: 'Appointments', path: '/appointments', icon: Calendar },
      { name: 'Emergency Info', path: '/emergency', icon: AlertCircle },
    ],
    DOCTOR: [
      { name: 'Dashboard', path: '/hospital/dashboard', icon: Home },
      { name: 'Patients', path: '/hospital/patients', icon: Users },
      { name: 'Appointments', path: '/hospital/appointments', icon: Calendar },
    ],
    HOSPITAL_ADMIN: [
      { name: 'Dashboard', path: '/hospital/dashboard', icon: Home },
      { name: 'Staff', path: '/hospital/staff', icon: Users },
      { name: 'Patients', path: '/hospital/patients', icon: Users },
    ],
    EMERGENCY: [
      { name: 'Patient Access', path: '/emergency/access', icon: AlertCircle },
      { name: 'Incidents', path: '/emergency/incidents', icon: FileText },
    ],
  };

  const items = menuItems[user?.role] || [];

  return (
    <aside className="w-64 bg-jeevacare-navy text-white p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">JeevaCare</h1>
        <p className="text-sm text-gray-300">One Life. One Health Journey.</p>
      </div>

      <nav className="space-y-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-jeevacare-blue transition-colors text-sm font-medium"
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
