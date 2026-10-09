import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Home, Users, Stethoscope, Calendar, AlertCircle, FileText, ChevronDown, X } from 'lucide-react';
import Logo from './Logo';

export default function Sidebar({ isOpen = true, onClose }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);

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
      { name: 'My Schedule', path: '/hospital/schedule', icon: Stethoscope },
    ],
    HOSPITAL_ADMIN: [
      { name: 'Dashboard', path: '/hospital/dashboard', icon: Home },
      { name: 'Staff', path: '/hospital/staff', icon: Users },
      { name: 'Patients', path: '/hospital/patients', icon: Users },
      { name: 'Facilities', path: '/hospital/facilities', icon: FileText },
    ],
    EMERGENCY: [
      { name: 'Patient Access', path: '/emergency/access', icon: AlertCircle },
      { name: 'Incidents', path: '/emergency/incidents', icon: FileText },
      { name: 'Responders', path: '/emergency/responders', icon: Users },
    ],
  };

  const items = menuItems[user?.role] || [];
  const isActive = (path) => location.pathname === path;

  // Close sidebar on mobile when a link is clicked
  const handleLinkClick = () => {
    if (onClose && window.innerWidth < 1024) {
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Mobile Overlay */}
      <div
        className="fixed inset-0 bg-black/50 lg:hidden z-30"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar */}
      <aside className="fixed lg:static inset-y-0 left-0 w-64 bg-jeevacare-navy text-white p-6 overflow-y-auto z-40 shadow-xl lg:shadow-none flex flex-col animate-slide-in-left lg:animate-none">
        {/* Close button for mobile */}
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-white/10 rounded-lg transition-colors focus-visible:outline-offset-2"
          aria-label="Close navigation"
        >
          <X size={24} />
        </button>

        {/* Logo Section */}
        <div className="mb-8 pt-4 lg:pt-0">
          <Link
            to="/"
            className="flex items-center gap-2 hover:opacity-80 transition-opacity focus-visible:outline-offset-2 rounded"
            onClick={handleLinkClick}
          >
            <img
              src="/assets/logos/jeevacare-icon-dark.svg"
              alt="JeevaCare"
              className="w-8 h-8"
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold">JeevaCare</span>
              <span className="text-xs text-gray-300 leading-tight">One Life. One Health</span>
            </div>
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2 flex-1">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium focus-visible:outline-offset-2 ${
                  active
                    ? 'bg-jeevacare-blue text-white shadow-lg'
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                <Icon size={18} className="flex-shrink-0" />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* User Info Section */}
        <div className="mt-auto pt-6 border-t border-white/10">
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-white truncate">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {user?.role === 'HOSPITAL_ADMIN' ? 'Admin' : user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase()}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
