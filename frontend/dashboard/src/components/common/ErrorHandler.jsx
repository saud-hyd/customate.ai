// frontend/dashboard/src/components/common/ErrorHandler.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

const ErrorHandler = ({ message, onRetry }) => {
  const navigate = useNavigate();

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 my-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-400" aria-hidden="true" />
        </div>
        <div className="ml-3">
          <p className="text-sm text-red-700">{message || 'An error occurred. Please try again.'}</p>
          <div className="mt-2 flex space-x-4">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="text-sm font-medium text-red-700 hover:text-red-600"
              >
                Try again
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-sm font-medium text-red-700 hover:text-red-600"
            >
              Return to dashboard
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorHandler;