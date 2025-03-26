import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { GlobeAltIcon } from '@heroicons/react/24/outline';

const KnowledgeBaseTabs = () => {
  const location = useLocation();
  
  const tabs = [
    { name: 'FAQs', path: '/knowledge', exact: true },
    { name: 'Documents', path: '/knowledge/documents' },
    { name: 'Training', path: '/knowledge/training' },
    { name: 'Website Crawler', path: '/knowledge/crawler', icon: <GlobeAltIcon className="h-4 w-4 mr-1" /> }
  ];

  return (
    <div className="border-b border-gray-200">
      <nav className="flex -mb-px space-x-8">
        {tabs.map(tab => {
          const isActive = tab.exact 
            ? location.pathname === tab.path 
            : location.pathname.startsWith(tab.path);
          
          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                isActive
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.icon}
              {tab.name}
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default KnowledgeBaseTabs;