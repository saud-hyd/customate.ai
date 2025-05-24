import React from 'react';
import { NavLink } from 'react-router-dom';

const Sidebar = () => {
  return (
    <div className="w-64 min-h-screen bg-slate-800 text-white flex flex-col">
      {/* Enhanced Logo Header */}
      <div className="bg-slate-900 p-4 flex items-center border-b border-slate-700 shadow-sm">
        <div className="flex items-center">
          <div className="h-9 w-9 bg-orange-600 p-1.5 rounded-full flex items-center justify-center">
            <img src="/images/customate.ai/jose_logo.svg" alt="Customate.ai" className="h-full w-full" />
          </div>
          <h1 className="ml-3 text-xl font-bold text-white">Customate.ai</h1>
        </div>
      </div>
      
      {/* Navigation Links */}
      <nav className="flex-1 mt-6">
        <NavLink 
          to="/dashboard" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 12L5 10M5 10L12 3L19 10M5 10V20C5 20.5523 5.44772 21 6 21H9M19 10L21 12M19 10V20C19 20.5523 18.5523 21 18 21H15M9 21C9.55228 21 10 20.5523 10 20V16C10 15.4477 10.4477 15 11 15H13C13.5523 15 14 15.4477 14 16V20C14 20.5523 14.4477 21 15 21M9 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Dashboard
            </>
          )}
        </NavLink>

        <NavLink 
          to="/conversations" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M8 12H8.01M12 12H12.01M16 12H16.01M21 12C21 16.4183 16.9706 20 12 20C10.4607 20 9.01172 19.6565 7.74467 19.0511L3 20L4.39499 16.28C3.51156 15.0423 3 13.5743 3 12C3 7.58172 7.02944 4 12 4C16.9706 4 21 7.58172 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Conversations
            </>
          )}
        </NavLink>

        <NavLink 
          to="/knowledge" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 6.25278V19.2528M12 6.25278C10.8321 5.47686 9.24649 5 7.5 5C5.75351 5 4.16789 5.47686 3 6.25278V19.2528C4.16789 18.4769 5.75351 18 7.5 18C9.24649 18 10.8321 18.4769 12 19.2528M12 6.25278C13.1679 5.47686 14.7535 5 16.5 5C18.2465 5 19.8321 5.47686 21 6.25278V19.2528C19.8321 18.4769 18.2465 18 16.5 18C14.7535 18 13.1679 18.4769 12 19.2528" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Knowledge Base
            </>
          )}
        </NavLink>

        <NavLink 
          to="/channels" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M14 9.50006C14 11.9853 11.9853 14 9.5 14C7.01472 14 5 11.9853 5 9.50006C5 7.01478 7.01472 5 9.5 5C11.9853 5 14 7.01478 14 9.50006Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M9.5 19C5.50004 19 5.50004 15 5.50004 15H13.5C13.5 15 13.5 19 9.5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 10.5H21.5M16 14H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Channels
            </>
          )}
        </NavLink>

        <NavLink 
          to="/integrations" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Integrations
            </>
          )}
        </NavLink>

        <NavLink 
          to="/analytics" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Analytics
            </>
          )}
        </NavLink>

        <NavLink 
          to="/settings" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Settings
            </>
          )}
        </NavLink>

        <NavLink 
          to="/test" 
          className={({ isActive }) => 
            `flex items-center px-6 py-3 relative transition-colors duration-200 ${
              isActive 
                ? 'bg-slate-700 text-orange-400 border-r-3 border-orange-500' 
                : 'text-gray-300 hover:bg-slate-700 hover:text-orange-300'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-orange-500"></div>}
              <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19.428 15.428a2.571 2.571 0 11-5.143 0 2.571 2.571 0 015.143 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.242 12.57l10.15 5.85" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8.85 5.578L19 11.428l-2.286 1.315" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.428 7.428a2.571 2.571 0 11-5.143 0 2.571 2.571 0 015.143 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4.857 9.142v9.715" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Test Chatbot
            </>
          )}
        </NavLink>
      </nav>
    </div>
  );
};

export default Sidebar;