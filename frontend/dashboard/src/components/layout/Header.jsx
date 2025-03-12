import React from 'react';
import { BellIcon, Bars3Icon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';

const Header = ({ setSidebarOpen }) => {
  const { currentUser } = useAuth();

  return (
    <header className="bg-white shadow-sm z-10">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-between h-16">
        <div className="flex items-center">
          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden bg-white p-2 rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Open sidebar</span>
            <Bars3Icon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          {/* Search bar */}
          <div className="hidden md:block ml-4">
            <div className="flex items-center">
              <input
                type="text"
                placeholder="Search..."
                className="border border-gray-300 rounded-md py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Notification button */}
          <button
            type="button"
            className="p-2 bg-white rounded-full text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          {/* Profile dropdown */}
          <div className="ml-3 relative">
            <div className="flex items-center">
              <span className="hidden md:block text-sm text-gray-700 mr-2">
                {currentUser?.name || 'User'}
              </span>
              <div className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-primary-600">
                <span className="text-sm font-medium leading-none text-white">
                  {currentUser?.name?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;