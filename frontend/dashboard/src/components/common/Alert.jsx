import React from 'react';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

/**
 * Alert component for showing notifications and messages
 * 
 * @param {Object} props
 * @param {string} props.type - Alert type: 'success', 'error', 'warning', 'info'
 * @param {string} props.message - Alert message
 * @param {React.ReactNode} [props.title] - Optional title
 * @param {boolean} [props.dismissible=true] - Whether alert can be dismissed
 * @param {Function} [props.onClose] - Function called when alert is dismissed
 * @param {string} [props.className] - Additional class names
 */
const Alert = ({
  type = 'info',
  message,
  title,
  dismissible = true,
  onClose,
  className = '',
}) => {
  // Alert configurations based on type
  const alertConfig = {
    success: {
      bgColor: 'bg-green-50',
      borderColor: 'border-green-400',
      textColor: 'text-green-800',
      icon: <CheckCircleIcon className="h-5 w-5 text-green-400" aria-hidden="true" />
    },
    error: {
      bgColor: 'bg-red-50',
      borderColor: 'border-red-400',
      textColor: 'text-red-800',
      icon: <XCircleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
    },
    warning: {
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-400',
      textColor: 'text-yellow-800',
      icon: <ExclamationCircleIcon className="h-5 w-5 text-yellow-400" aria-hidden="true" />
    },
    info: {
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-800',
      icon: <InformationCircleIcon className="h-5 w-5 text-blue-400" aria-hidden="true" />
    }
  };
  
  // Use the configuration for the specified type, or default to info
  const config = alertConfig[type] || alertConfig.info;
  
  return (
    <div className={`rounded-md p-4 ${config.bgColor} border-l-4 ${config.borderColor} ${className}`}>
      <div className="flex">
        <div className="flex-shrink-0">
          {config.icon}
        </div>
        <div className="ml-3">
          {title && (
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.textColor} ${title ? 'mt-2' : ''}`}>
            <p>{message}</p>
          </div>
        </div>
        {dismissible && onClose && (
          <div className="ml-auto pl-3">
            <div className="-mx-1.5 -my-1.5">
              <button
                type="button"
                className={`inline-flex rounded-md p-1.5 ${config.textColor} hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500`}
                onClick={onClose}
              >
                <span className="sr-only">Dismiss</span>
                <XMarkIcon className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Alert;