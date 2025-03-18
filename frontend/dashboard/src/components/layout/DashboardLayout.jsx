// File: frontend/dashboard/src/components/layout/DashboardLayout.jsx
// This file defines the main layout for the dashboard, including the sidebar navigation

import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  // Check which navigation item is active
  const isActive = (path) => {
    return location.pathname.includes(path) ? 'active-nav-item' : '';
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 h-screen bg-white shadow-md fixed">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold text-indigo-600">Customate.AI</h1>
          <p className="text-sm text-gray-500">Chatbot Dashboard</p>
        </div>
        
        <nav className="mt-6">
          <Link to="/dashboard" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/dashboard')}`}>
            <i className="fas fa-tachometer-alt mr-3 text-indigo-600"></i>
            Overview
          </Link>
          <Link to="/conversations" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/conversations')}`}>
            <i className="fas fa-comments mr-3 text-indigo-600"></i>
            Conversations
          </Link>
          <Link to="/knowledge" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/knowledge')}`}>
            <i className="fas fa-brain mr-3 text-indigo-600"></i>
            Knowledge Base
          </Link>
          <Link to="/integrations" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/integrations')}`}>
            <i className="fas fa-plug mr-3 text-indigo-600"></i>
            Integrations
          </Link>
          {/* ADD SUBSCRIPTION LINK HERE */}
          <Link to="/subscription" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/subscription')}`}>
            <i className="fas fa-credit-card mr-3 text-indigo-600"></i>
            Subscription
          </Link>
          <Link to="/settings" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/settings')}`}>
            <i className="fas fa-cog mr-3 text-indigo-600"></i>
            Settings
          </Link>
          <Link to="/test" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/test')}`}>
            <i className="fas fa-vial mr-3 text-indigo-600"></i>
            Test Chatbot
          </Link>
          <Link to="/profile" className={`flex items-center px-6 py-3 text-gray-700 ${isActive('/profile')}`}>
            <i className="fas fa-user-circle mr-3 text-indigo-600"></i>
            Profile
          </Link>
        </nav>
        
        <div className="absolute bottom-0 w-full border-t p-4">
          <div className="flex items-center">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 font-bold">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-700">{user?.company || 'Your Company'}</p>
              <p className="text-xs text-gray-500">Professional Plan</p>
            </div>
          </div>
          <button 
            onClick={logout}
            className="mt-4 block text-sm text-red-600 hover:text-red-800"
          >
            <i className="fas fa-sign-out-alt mr-2"></i> Sign Out
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 ml-64 p-8">
        <Outlet />
      </div>
    </div>
  );
};

export default DashboardLayout;