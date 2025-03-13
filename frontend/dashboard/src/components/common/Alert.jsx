// src/components/common/Alert.jsx
import React from 'react';
import {
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

/**
 * Alert component for displaying notifications and feedback
 * Used throughout the application to provide contextual feedback
 */
const Alert = ({
  type = 'info',
  title,
  message,
  onClose,
  className = '',
  showIcon = true,
  showClose = false,
}) => {
  const typeClasses = {
    info: {
      container: 'bg-blue-50 border-blue-400 text-blue-700',
      icon: <InformationCircleIcon className="h-5 w-5 text-blue-400" />,
    },
    success: {
      container: 'bg-green-50 border-green-400 text-green-700',
      icon: <CheckCircleIcon className="h-5 w-5 text-green-400" />,
    },
    warning: {
      container: 'bg-yellow-50 border-yellow-400 text-yellow-700',
      icon: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />,
    },
    error: {
      container: 'bg-red-50 border-red-400 text-red-700',
      icon: <XCircleIcon className="h-5 w-5 text-red-400" />,
    },
  };
  
  return (
    <div className={`rounded-md border-l-4 p-4 ${typeClasses[type].container} ${className}`}>
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0 mr-3">{typeClasses[type].icon}</div>
        )}
        <div className="flex-1">
          {title && <h3 className="text-sm font-medium">{title}</h3>}
          {message && <div className="text-sm mt-1">{message}</div>}
        </div>
        {showClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                onClick={onClose}
                className={`inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  type === 'info' ? 'bg-blue-50 text-blue-500 hover:bg-blue-100 focus:ring-blue-600' :
                  type === 'success' ? 'bg-green-50 text-green-500 hover:bg-green-100 focus:ring-green-600' :
                  type === 'warning' ? 'bg-yellow-50 text-yellow-500 hover:bg-yellow-100 focus:ring-yellow-600' :
                  'bg-red-50 text-red-500 hover:bg-red-100 focus:ring-red-600'
                }`}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;