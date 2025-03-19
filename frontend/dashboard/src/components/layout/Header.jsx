import React from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import useAuth from '../../hooks/useAuth';

const Header = () => {
  const { currentUser } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 z-10">
      <div className="px-4 sm:px-6 lg:px-8 flex justify-between h-16">
        {/* Search bar */}
        <div className="flex-1 flex items-center justify-center px-2 lg:ml-6 lg:justify-start">
          <div className="max-w-lg w-full lg:max-w-xs">
            <label htmlFor="search" className="sr-only">Search</label>
            <div className="relative">
              <input
                id="search"
                className="block w-full pl-4 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Search..."
                type="search"
              />
            </div>
          </div>
        </div>
        
        <div className="flex items-center">
          {/* Notification bell */}
          <button
            type="button"
            className="ml-auto flex-shrink-0 bg-white p-2 rounded-full text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <span className="sr-only">View notifications</span>
            <BellIcon className="h-6 w-6" aria-hidden="true" />
          </button>
          
          {/* User dropdown */}
          <div className="ml-3 relative">
            <div className="flex items-center">
              <div className="h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center text-white uppercase font-medium text-sm">
                {currentUser?.name?.charAt(0) || 'U'}
              </div>
              <span className="ml-2 text-sm text-gray-700 hidden md:block">
                User
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;