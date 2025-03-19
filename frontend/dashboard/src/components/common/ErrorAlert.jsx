// Path: frontend/dashboard/src/components/common/ErrorAlert.jsx
import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/solid';

const ErrorAlert = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
      <div className="flex">
        <ExclamationCircleIcon className="h-5 w-5 text-red-500 mr-2" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <div className="mt-1 text-sm text-red-700">
            {message}
          </div>
        </div>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-red-500 hover:text-red-700"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorAlert;