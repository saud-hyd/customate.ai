// Path: frontend/dashboard/src/components/conversations/ConversationFilters.jsx
// Usage: Filter toggle component for switching between all/text/voice conversations with badges

import React from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PhoneIcon,
  QueueListIcon 
} from '@heroicons/react/24/outline';

const ConversationFilters = ({ 
  activeFilter, 
  onFilterChange, 
  counts = { all: 0, text: 0, voice: 0 },
  unreadCounts = { all: 0, text: 0, voice: 0 },
  className = "" 
}) => {
  const filters = [
    {
      id: 'all',
      label: 'All',
      icon: QueueListIcon,
      count: counts.all,
      unread: unreadCounts.all,
      color: 'gray'
    },
    {
      id: 'text',
      label: 'Text',
      icon: ChatBubbleLeftRightIcon,
      count: counts.text,
      unread: unreadCounts.text,
      color: 'blue'
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: PhoneIcon,
      count: counts.voice,
      unread: unreadCounts.voice,
      color: 'green'
    }
  ];

  const getFilterStyles = (filter, isActive) => {
    const baseStyles = "relative inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2";
    
    if (isActive) {
      switch (filter.color) {
        case 'blue':
          return `${baseStyles} bg-blue-100 text-blue-700 border-2 border-blue-200 focus:ring-blue-500`;
        case 'green':
          return `${baseStyles} bg-green-100 text-green-700 border-2 border-green-200 focus:ring-green-500`;
        default:
          return `${baseStyles} bg-gray-100 text-gray-700 border-2 border-gray-200 focus:ring-gray-500`;
      }
    } else {
      return `${baseStyles} bg-white text-gray-600 border-2 border-gray-200 hover:bg-gray-50 hover:text-gray-700 focus:ring-gray-500`;
    }
  };

  const getBadgeStyles = (filter, isActive) => {
    if (isActive) {
      switch (filter.color) {
        case 'blue':
          return "bg-blue-200 text-blue-800";
        case 'green':
          return "bg-green-200 text-green-800";
        default:
          return "bg-gray-200 text-gray-800";
      }
    } else {
      return "bg-gray-100 text-gray-600";
    }
  };

  const getUnreadBadgeStyles = (filter) => {
    switch (filter.color) {
      case 'blue':
        return "bg-blue-500 text-white";
      case 'green':
        return "bg-green-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const IconComponent = filter.icon;

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={getFilterStyles(filter, isActive)}
          >
            {/* Icon */}
            <IconComponent className="w-4 h-4 mr-2 flex-shrink-0" />
            
            {/* Label */}
            <span>{filter.label}</span>
            
            {/* Count Badge */}
            {filter.count > 0 && (
              <span className={`
                ml-2 inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-medium
                ${getBadgeStyles(filter, isActive)}
              `}>
                {filter.count > 999 ? '999+' : filter.count}
              </span>
            )}
            
            {/* Unread Badge */}
            {filter.unread > 0 && (
              <span className={`
                absolute -top-1 -right-1 inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-xs font-medium
                ${getUnreadBadgeStyles(filter)}
              `}>
                {filter.unread > 99 ? '99+' : filter.unread}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ConversationFilters;