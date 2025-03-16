// frontend/dashboard/src/components/layout/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

// Import icons (using heroicons)
import { 
  XMarkIcon,
  HomeIcon, 
  ChatBubbleLeftRightIcon, 
  DocumentTextIcon, 
  ChartBarIcon, 
  Cog6ToothIcon,
  PuzzlePieceIcon // New icon for Integrations
} from '@heroicons/react/24/outline';

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, logout } = useAuth();

  // Navigation items with fixed paths - updated with integrations
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
    { name: 'Chat', href: '/chat', icon: ChatBubbleLeftRightIcon },
    { name: 'Knowledge Base', href: '/knowledge', icon: DocumentTextIcon },
    { name: 'Integrations', href: '/integrations', icon: PuzzlePieceIcon }, // Add this line
    { name: 'Analytics', href: '/analytics', icon: ChartBarIcon },
    { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
  ];

  return (
    <>
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-40 md:hidden ${sidebarOpen ? '' : 'hidden'}`}>
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75" 
          onClick={() => setSidebarOpen(false)} 
          aria-hidden="true"
        ></div>
        
        {/* Sidebar */}
        <div className="relative flex flex-col flex-1 w-full max-w-xs bg-primary-700">
          <div className="absolute top-0 right-0 pt-2 -mr-12">
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 ml-1 rounded-full focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sr-only">Close sidebar</span>
              <XMarkIcon className="w-6 h-6 text-white" aria-hidden="true" />
            </button>
          </div>
          
          {/* Sidebar content */}
          <div className="flex-1 h-0 pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <img
                className="h-8 w-auto"
                src="/logo.svg"
                alt="Customate.ai"
              />
              <span className="ml-2 text-xl font-bold text-white">Customate.ai</span>
            </div>
            <nav className="mt-5 px-2 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => `
                    group flex items-center px-2 py-2 text-base font-medium rounded-md
                    ${isActive 
                      ? 'bg-primary-800 text-white' 
                      : 'text-white hover:bg-primary-600 hover:text-white'}
                  `}
                  end={item.href === '/dashboard'}
                >
                  <item.icon className="mr-4 h-6 w-6 flex-shrink-0" aria-hidden="true" />
                  {item.name}
                </NavLink>
              ))}
            </nav>
          </div>
          
          {/* User menu */}
          <div className="flex-shrink-0 flex border-t border-primary-800 p-4">
            <div className="flex items-center">
              <div>
                <div className="inline-flex items-center justify-center h-10 w-10 rounded-full bg-primary-500">
                  <span className="text-lg font-medium leading-none text-white">
                    {user?.name?.charAt(0) || 'U'}
                  </span>
                </div>
              </div>
              <div className="ml-3">
                <p className="text-base font-medium text-white">{user?.name || 'User'}</p>
                <button 
                  onClick={logout}
                  className="text-sm font-medium text-primary-300 hover:text-white"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Desktop sidebar */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64">
          <div className="flex flex-col flex-1 h-0 bg-primary-700">
            <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
              <div className="flex items-center flex-shrink-0 px-4">
                <img
                  className="h-8 w-auto"
                  src="/logo.svg"
                  alt="Customate.ai"
                />
                <span className="ml-2 text-xl font-bold text-white">Customate.ai</span>
              </div>
              <nav className="mt-5 flex-1 px-2 space-y-1">
                {navigation.map((item) => (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    className={({ isActive }) => `
                      group flex items-center px-2 py-2 text-sm font-medium rounded-md
                      ${isActive 
                        ? 'bg-primary-800 text-white' 
                        : 'text-white hover:bg-primary-600 hover:text-white'}
                    `}
                    end={item.href === '/dashboard'}
                  >
                    <item.icon className="mr-3 h-6 w-6 flex-shrink-0" aria-hidden="true" />
                    {item.name}
                  </NavLink>
                ))}
              </nav>
            </div>
            
            {/* User menu */}
            <div className="flex-shrink-0 flex border-t border-primary-800 p-4">
              <div className="flex items-center">
                <div>
                  <div className="inline-flex items-center justify-center h-9 w-9 rounded-full bg-primary-500">
                    <span className="text-lg font-medium leading-none text-white">
                      {user?.name?.charAt(0) || 'U'}
                    </span>
                  </div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
                  <button 
                    onClick={logout}
                    className="text-xs font-medium text-primary-300 hover:text-white"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;