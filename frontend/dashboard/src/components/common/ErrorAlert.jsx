// Path: frontend/dashboard/src/components/common/ErrorAlert.jsx
// Usage: Error alert component with fallback icon to prevent import issues

import React from 'react';

const ErrorAlert = ({ message, onDismiss }) => {
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
      <div className="flex">
        {/* Fallback SVG icon instead of @heroicons/react */}
        <svg 
          className="h-5 w-5 text-red-500 mr-2" 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z" 
          />
        </svg>
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