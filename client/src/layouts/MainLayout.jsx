import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar - responsive: hidden on mobile, visible on lg and up */}
      <div className="hidden lg:flex lg:flex-col lg:w-64">
        <Sidebar isOpen={true} />
      </div>

      {/* Mobile Sidebar - visible only on mobile */}
      <div className="lg:hidden">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 overflow-auto focus:outline-none"
          tabIndex="-1"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
