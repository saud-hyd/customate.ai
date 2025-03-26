import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  FolderIcon, 
  DocumentIcon, 
  GlobeAltIcon, 
  QuestionMarkCircleIcon
} from '@heroicons/react/outline';

const KnowledgeNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      name: 'Knowledge Base',
      path: '/dashboard/knowledge',
      icon: <FolderIcon className="h-5 w-5" />,
      exact: true
    },
    {
      name: 'Documents',
      path: '/dashboard/knowledge/documents',
      icon: <DocumentIcon className="h-5 w-5" />
    },
    {
      name: 'Website Crawler',
      path: '/dashboard/knowledge/crawler',
      icon: <GlobeAltIcon className="h-5 w-5" />
    },
    {
      name: 'FAQs',
      path: '/dashboard/knowledge/faqs',
      icon: <QuestionMarkCircleIcon className="h-5 w-5" />
    }
  ];

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <nav className="border-b border-gray-200">
        <div className="flex space-x-8 overflow-x-auto px-4">
          {navItems.map((item) => {
            const isActive = item.exact 
              ? location.pathname === item.path 
              : location.pathname.startsWith(item.path);
              
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{item.icon}</span>
                {item.name}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};

export default KnowledgeNavigation;