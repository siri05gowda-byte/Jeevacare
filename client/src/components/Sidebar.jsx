import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Home, Users, Stethoscope, Calendar, AlertCircle, FileText, ChevronDown, X, Activity, ExternalLink } from 'lucide-react';
import Logo from './Logo';
import { claraMedConfig } from '../config/claramed';

// Roles that see the link to the separate ClaraMed "Radiology AI" website.
const RADIOLOGY_AI_ROLES = ['PATIENT', 'DOCTOR', 'RADIOLOGY_TECHNICIAN'];

export default function Sidebar({ isOpen = true, onClose }) {
  const { user } = useAuthStore();
  const location = useLocation();
  const [expandedMenu, setExpandedMenu] = useState(null);

  const menuItems = {
    PATIENT: [
      { name: 'Dashboard', path: '/dashboard', icon: Home },
      { name: 'My Health', path: '/patient', icon: FileText },
      { name: 'Documents', path: '/documents', icon: FileText },
      { name: 'Radiology & Imaging', path: '/radiology', icon: Activity },
      { name: 'Appointments', path: '/appointments', icon: Calendar },
      { name: 'Emergency Info', path: '/emergency', icon: AlertCircle },
    ],
    DOCTOR: [
      { name: 'Dashboard', path: '/provider', icon: Home },
      { name: 'Patients', path: '/hospital/patients', icon: Users },
      { name: 'Appointments', path: '/hospital/appointments', icon: Calendar },
      { name: 'My Schedule', path: '/hospital/schedule', icon: Stethoscope },
      { name: 'Upload Documents', path: '/staff/upload-documents', icon: FileText },
      { name: 'Register as Staff', path: '/staff/registration', icon: Users },
    ],
    LAB_TECHNICIAN: [
      { name: 'Dashboard', path: '/provider', icon: Home },
      { name: 'Upload Documents', path: '/staff/upload-documents', icon: FileText },
      { name: 'Register as Staff', path: '/staff/registration', icon: Users },
    ],
    RADIOLOGY_TECHNICIAN: [
      { name: 'Dashboard', path: '/provider', icon: Home },
      { name: 'Upload Documents', path: '/staff/upload-documents', icon: FileText },
      { name: 'Register as Staff', path: '/staff/registration', icon: Users },
    ],
    HOSPITAL_ADMIN: [
      { name: 'Dashboard', path: '/hospital/dashboard', icon: Home },
      { name: 'Staff Registrations', path: '/hospital/dashboard', icon: Users },
      { name: 'Staff', path: '/hospital/staff', icon: Users },
      { name: 'Patients', path: '/hospital/patients', icon: Users },
    ],
    SYSTEM_ADMIN: [
      { name: 'Dashboard', path: '/integrated-dashboard', icon: Home },
      { name: 'Staff Management', path: '/hospital/staff', icon: Users },
    ],
    EMERGENCY: [
      { name: 'Emergency Access', path: '/emergency', icon: AlertCircle },
      { name: 'Incidents', path: '/emergency/incidents', icon: FileText },
      { name: 'Responders', path: '/emergency/responders', icon: Users },
    ],
  };

  // "Register as Staff" is for staff who are not verified yet; a hospital's approval removes it.
  const isVerified = user?.verificationStatus === 'verified';
  const roleItems = (menuItems[user?.role] || []).filter(
    (item) => !(isVerified && item.path === '/staff/registration')
  );
  const radiologyAiUrl = RADIOLOGY_AI_ROLES.includes(user?.role) ? claraMedConfig.getRadiologyAiUrl() : null;
  // ClaraMed is a separate site: this item is an external link, not a route in this app.
  // Once ClaraMed is linked, it replaces the in-app Radiology & Imaging entry so patients see one radiology option.
  const items = radiologyAiUrl
    ? [
        ...roleItems.filter((item) => item.path !== '/radiology'),
        { name: 'Radiology AI', href: radiologyAiUrl, icon: Activity, external: true },
      ]
    : roleItems;
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
      <aside className="fixed lg:static inset-y-0 left-0 w-64 lg:h-full bg-gradient-to-b from-jeevacare-blue to-blue-900 text-white p-6 overflow-y-auto z-40 shadow-xl lg:shadow-none flex flex-col animate-slide-in-left lg:animate-none">
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
            <Logo variant="dark" size="md" showText={true} onDark />
          </Link>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-2 flex-1">
          {items.map((item) => {
            const Icon = item.icon;
            const linkClasses =
              'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-sm font-medium focus-visible:outline-offset-2';

            if (item.external) {
              return (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleLinkClick}
                  className={`${linkClasses} text-blue-100 hover:bg-white/10 hover:text-white`}
                >
                  <Icon size={18} className="flex-shrink-0" />
                  <span>{item.name}</span>
                  <ExternalLink size={14} className="ml-auto flex-shrink-0 opacity-70" aria-hidden="true" />
                </a>
              );
            }

            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={handleLinkClick}
                className={`${linkClasses} ${
                  active
                    ? 'bg-white/20 text-white shadow-lg ring-1 ring-white/30'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
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
        <div className="mt-auto pt-6 border-t border-white/20">
          <div className="px-4 py-3">
            <p className="text-sm font-medium text-white truncate">
              {user?.profile?.firstName} {user?.profile?.lastName}
            </p>
            <p className="text-xs text-blue-200 truncate">
              {user?.role === 'HOSPITAL_ADMIN' ? 'Admin' : user?.role?.charAt(0) + user?.role?.slice(1).toLowerCase()}
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
