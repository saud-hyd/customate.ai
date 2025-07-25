// Path: frontend/dashboard/src/components/shared/FilterToggle.jsx
// Usage: Reusable filter toggle component for switching between different content types (All/Text/Voice)

import React from 'react';
import { 
  QueueListIcon,
  ChatBubbleLeftRightIcon, 
  PhoneIcon 
} from '@heroicons/react/24/outline';

const FilterToggle = ({ 
  activeFilter, 
  onFilterChange, 
  counts = {},
  unreadCounts = {},
  showCounts = true,
  size = 'default', // 'small', 'default', 'large'
  variant = 'default', // 'default', 'pills', 'tabs'
  className = ""
}) => {
  const filters = [
    {
      id: 'all',
      label: 'All',
      icon: QueueListIcon,
      color: 'gray'
    },
    {
      id: 'text',
      label: 'Text',
      icon: ChatBubbleLeftRightIcon,
      color: 'blue'
    },
    {
      id: 'voice',
      label: 'Voice',
      icon: PhoneIcon,
      color: 'green'
    }
  ];

  const getSizeClasses = () => {
    switch (size) {
      case 'small':
        return {
          button: 'px-2 py-1 text-xs',
          icon: 'w-3 h-3',
          badge: 'px-1 py-0.5 text-xs',
          unread: 'px-1 py-0.5 text-xs'
        };
      case 'large':
        return {
          button: 'px-6 py-3 text-base',
          icon: 'w-6 h-6',
          badge: 'px-3 py-1 text-sm',
          unread: 'px-2 py-1 text-sm'
        };
      default:
        return {
          button: 'px-4 py-2 text-sm',
          icon: 'w-4 h-4',
          badge: 'px-2 py-0.5 text-xs',
          unread: 'px-1.5 py-0.5 text-xs'
        };
    }
  };

  const getVariantClasses = (filter, isActive) => {
    const sizeClasses = getSizeClasses();
    const baseClasses = `relative inline-flex items-center ${sizeClasses.button} font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2`;

    if (variant === 'pills') {
      if (isActive) {
        switch (filter.color) {
          case 'blue':
            return `${baseClasses} bg-blue-500 text-white border-2 border-blue-500 rounded-full focus:ring-blue-500`;
          case 'green':
            return `${baseClasses} bg-green-500 text-white border-2 border-green-500 rounded-full focus:ring-green-500`;
          default:
            return `${baseClasses} bg-gray-600 text-white border-2 border-gray-600 rounded-full focus:ring-gray-500`;
        }
      } else {
        return `${baseClasses} bg-white text-gray-600 border-2 border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 focus:ring-gray-500`;
      }
    } else if (variant === 'tabs') {
      if (isActive) {
        switch (filter.color) {
          case 'blue':
            return `${baseClasses} text-blue-700 border-b-2 border-blue-500 bg-blue-50 focus:ring-blue-500`;
          case 'green':
            return `${baseClasses} text-green-700 border-b-2 border-green-500 bg-green-50 focus:ring-green-500`;
          default:
            return `${baseClasses} text-gray-700 border-b-2 border-gray-500 bg-gray-50 focus:ring-gray-500`;
        }
      } else {
        return `${baseClasses} text-gray-600 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 focus:ring-gray-500`;
      }
    } else {
      // Default variant
      if (isActive) {
        switch (filter.color) {
          case 'blue':
            return `${baseClasses} bg-blue-100 text-blue-700 border-2 border-blue-200 rounded-lg focus:ring-blue-500`;
          case 'green':
            return `${baseClasses} bg-green-100 text-green-700 border-2 border-green-200 rounded-lg focus:ring-green-500`;
          default:
            return `${baseClasses} bg-gray-100 text-gray-700 border-2 border-gray-200 rounded-lg focus:ring-gray-500`;
        }
      } else {
        return `${baseClasses} bg-white text-gray-600 border-2 border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 focus:ring-gray-500`;
      }
    }
  };

  const getBadgeClasses = (filter, isActive) => {
    const sizeClasses = getSizeClasses();
    
    if (isActive) {
      switch (filter.color) {
        case 'blue':
          return `ml-2 inline-flex items-center justify-center ${sizeClasses.badge} rounded-full font-medium bg-blue-200 text-blue-800`;
        case 'green':
          return `ml-2 inline-flex items-center justify-center ${sizeClasses.badge} rounded-full font-medium bg-green-200 text-green-800`;
        default:
          return `ml-2 inline-flex items-center justify-center ${sizeClasses.badge} rounded-full font-medium bg-gray-200 text-gray-800`;
      }
    } else {
      return `ml-2 inline-flex items-center justify-center ${sizeClasses.badge} rounded-full font-medium bg-gray-100 text-gray-600`;
    }
  };

  const getUnreadBadgeClasses = (filter) => {
    const sizeClasses = getSizeClasses();
    
    switch (filter.color) {
      case 'blue':
        return `absolute -top-1 -right-1 inline-flex items-center justify-center ${sizeClasses.unread} rounded-full font-medium bg-blue-500 text-white`;
      case 'green':
        return `absolute -top-1 -right-1 inline-flex items-center justify-center ${sizeClasses.unread} rounded-full font-medium bg-green-500 text-white`;
      default:
        return `absolute -top-1 -right-1 inline-flex items-center justify-center ${sizeClasses.unread} rounded-full font-medium bg-gray-500 text-white`;
    }
  };

  const formatCount = (count) => {
    if (count > 999) return '999+';
    if (count > 99) return '99+';
    return count.toString();
  };

  const containerClasses = variant === 'tabs' 
    ? `flex border-b border-gray-200 ${className}`
    : `flex flex-wrap gap-2 ${className}`;

  return (
    <div className={containerClasses}>
      {filters.map((filter) => {
        const isActive = activeFilter === filter.id;
        const IconComponent = filter.icon;
        const count = counts[filter.id] || 0;
        const unreadCount = unreadCounts[filter.id] || 0;
        const sizeClasses = getSizeClasses();

        return (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={getVariantClasses(filter, isActive)}
          >
            {/* Icon */}
            <IconComponent className={`${sizeClasses.icon} mr-2 flex-shrink-0`} />
            
            {/* Label */}
            <span>{filter.label}</span>
            
            {/* Count Badge */}
            {showCounts && count > 0 && (
              <span className={getBadgeClasses(filter, isActive)}>
                {formatCount(count)}
              </span>
            )}
            
            {/* Unread Badge */}
            {unreadCount > 0 && (
              <span className={getUnreadBadgeClasses(filter)}>
                {formatCount(unreadCount)}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default FilterToggle;