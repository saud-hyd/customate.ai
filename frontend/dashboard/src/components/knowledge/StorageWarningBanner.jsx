// frontend/dashboard/src/components/knowledge/StorageWarningBanner.jsx
import React from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';

/**
 * Component that displays a banner warning when storage limits are reached
 * To be used on knowledge management pages
 */
const StorageWarningBanner = ({ storageInfo, className = "" }) => {
  if (!storageInfo || !storageInfo.storage) return null;
  
  const { percentage } = storageInfo.storage;
  
  // Only show when storage is over 90%
  if (percentage < 90) return null;
  
  const isAtLimit = percentage >= 100;
  
  if (isAtLimit) {
    // Storage limit reached
    return (
      <div className={`bg-red-50 border border-red-200 p-4 rounded-lg ${className}`}>
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-red-800">Storage Limit Reached</h3>
            <p className="text-sm text-red-700 mt-1">
              You've reached your storage limit. To upload more documents, 
              please delete some existing documents or upgrade your subscription plan.
            </p>
            <div className="mt-2">
              <a 
                href="/dashboard/subscription" 
                className="text-sm font-medium text-red-600 hover:text-red-500"
              >
                Upgrade Plan →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  } else {
    // Storage approaching limit
    return (
      <div className={`bg-yellow-50 border border-yellow-200 p-4 rounded-lg ${className}`}>
        <div className="flex">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-yellow-800">Storage Nearly Full</h3>
            <p className="text-sm text-yellow-700 mt-1">
              You're using {percentage.toFixed(1)}% of your storage limit. 
              Consider deleting unused documents or upgrading your plan to avoid service interruption.
            </p>
            <div className="mt-2">
              <a 
                href="/dashboard/subscription" 
                className="text-sm font-medium text-yellow-600 hover:text-yellow-500"
              >
                View Plans →
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default StorageWarningBanner;