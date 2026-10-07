import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Menu, LogOut, Settings } from 'lucide-react';

export default function Header() {
  const { user, logout } = useAuthStore();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center">
      <div className="text-2xl font-bold text-jeevacare-blue">JeevaCare</div>

      <div className="flex items-center gap-4 relative">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-800">{user?.profile?.firstName}</p>
          <p className="text-xs text-gray-500">{user?.role}</p>
        </div>

        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-10 h-10 rounded-full bg-jeevacare-blue text-white flex items-center justify-center font-bold hover:bg-jeevacare-navy transition-colors"
        >
          {user?.profile?.firstName?.charAt(0) || 'U'}
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-12 bg-white border border-gray-200 rounded-lg shadow-lg w-48 z-50">
            <button className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm">
              <Settings size={16} />
              Settings
            </button>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-2 hover:bg-gray-50 flex items-center gap-2 text-sm text-jeevacare-red border-t border-gray-200"
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
