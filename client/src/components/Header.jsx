import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { LogOut, Settings, Menu, X } from 'lucide-react';
import Logo from './Logo';

export default function Header({ onMenuToggle }) {
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3 flex justify-between items-center sticky top-0 z-40 shadow-sm">
      {/* Left: Logo + Mobile Menu Toggle */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle button */}
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-offset-2"
            aria-label="Toggle navigation menu"
          >
            <Menu size={24} className="text-jeevacare-blue" />
          </button>
        )}
        
        {/* Logo */}
        <Logo
          variant="light"
          size="md"
          href="/"
          showText={false}
          className="flex-shrink-0"
        />
      </div>

      {/* Right: User Controls */}
      <div className="flex items-center gap-4 relative">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium text-gray-800">{user?.profile?.firstName}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-10 h-10 rounded-full bg-jeevacare-blue text-white flex items-center justify-center font-bold hover:bg-jeevacare-navy transition-colors focus-visible:outline-offset-2"
          aria-label="User menu"
          aria-expanded={showDropdown}
        >
          {user?.profile?.firstName?.charAt(0) || 'U'}
        </button>

        {/* Dropdown Menu */}
        {showDropdown && (
          <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg w-48 z-50 animate-slide-in-up">
            <button
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm transition-colors focus-visible:outline-offset-2"
              aria-label="Open settings"
            >
              <Settings size={16} />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-red-50 flex items-center gap-2 text-sm text-jeevacare-red border-t border-gray-200 transition-colors focus-visible:outline-offset-2"
              aria-label="Logout"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
