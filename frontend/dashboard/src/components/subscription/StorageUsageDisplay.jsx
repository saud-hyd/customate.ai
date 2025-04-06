// frontend/dashboard/src/components/subscription/StorageUsageDisplay.jsx
import React, { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';

/**
 * Component to display storage usage in the knowledge base
 * Can be included in document list pages and upload modals
 */
const StorageUsageDisplay = ({ onRefresh, showRefreshButton = true, compact = false, className = "" }) => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStorageInfo();
  }, []);

  const fetchStorageInfo = async () => {
    try {
      setLoading(true);
      const data = await subscriptionService.getSubscriptionLimits();
      setStorageInfo(data);
      if (onRefresh) onRefresh(data);
    } catch (err) {
      console.error('Error fetching storage info:', err);
      setError('Unable to fetch storage information');
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className={`flex items-center ${compact ? 'py-1' : 'py-3'} ${className}`}>
        <div className="animate-spin h-4 w-4 border-b-2 border-indigo-500 rounded-full mr-2"></div>
        <span className="text-sm text-gray-500">Loading storage info...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-sm text-red-600 ${className}`}>
        {error}
        {showRefreshButton && (
          <button onClick={fetchStorageInfo} className="ml-2 text-indigo-600 hover:text-indigo-800">
            Retry
          </button>
        )}
      </div>
    );
  }

  // If we don't have storage info
  if (!storageInfo || !storageInfo.storage) {
    return (
      <div className={`text-sm text-gray-500 ${className}`}>
        Storage information not available
        {showRefreshButton && (
          <button onClick={fetchStorageInfo} className="ml-2 text-indigo-600 hover:text-indigo-800">
            Refresh
          </button>
        )}
      </div>
    );
  }

  const { used_bytes, limit_bytes, percentage } = storageInfo.storage;
  const isAtLimit = percentage >= 100;
  const isNearLimit = percentage >= 90 && percentage < 100;
  const isWithinLimit = percentage < 90;

  // For compact display, return a simplified version
  if (compact) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {isAtLimit ? (
          <ExclamationTriangleIcon className="h-4 w-4 text-red-600" />
        ) : isNearLimit ? (
          <ExclamationTriangleIcon className="h-4 w-4 text-yellow-600" />
        ) : (
          <CheckCircleIcon className="h-4 w-4 text-green-600" />
        )}
        
        <span className={`text-sm ${
          isAtLimit ? 'text-red-600' : 
          isNearLimit ? 'text-yellow-600' : 
          'text-gray-700'
        }`}>
          {formatBytes(used_bytes)} / {formatBytes(limit_bytes)}
          {' '}({percentage.toFixed(1)}%)
        </span>
        
        {showRefreshButton && (
          <button 
            onClick={fetchStorageInfo} 
            className="text-gray-400 hover:text-gray-600"
            title="Refresh storage info"
          >
            <ArrowPathIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {isAtLimit ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-red-600 mr-1" />
          ) : isNearLimit ? (
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-1" />
          ) : (
            <CheckCircleIcon className="h-5 w-5 text-green-600 mr-1" />
          )}
          
          <h3 className={`text-sm font-medium ${
            isAtLimit ? 'text-red-800' : 
            isNearLimit ? 'text-yellow-800' : 
            'text-gray-700'
          }`}>
            Storage Usage
          </h3>
        </div>
        
        <div className="flex items-center">
          <span className="text-sm text-gray-500">
            {formatBytes(used_bytes)} of {formatBytes(limit_bytes)}
          </span>
          
          {showRefreshButton && (
            <button 
              onClick={fetchStorageInfo} 
              className="ml-2 text-gray-400 hover:text-gray-600"
              title="Refresh storage info"
            >
              <ArrowPathIcon className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className={`h-2 rounded-full ${
            percentage > 90 ? 'bg-red-500' : 
            percentage > 75 ? 'bg-yellow-500' : 
            'bg-green-500'
          }`}
          style={{ width: `${Math.min(percentage, 100)}%` }}
        ></div>
      </div>
      
      <div className="flex justify-between">
        <span className="text-xs text-gray-500">
          {isAtLimit ? (
            <span className="text-red-600">Storage limit reached</span>
          ) : isNearLimit ? (
            <span className="text-yellow-600">Storage nearly full</span>
          ) : (
            'Available space'
          )}
        </span>
        <span className="text-xs text-gray-500">{percentage.toFixed(1)}% used</span>
      </div>

      {isAtLimit && (
        <div className="text-sm text-red-600 mt-1">
          You've reached your storage limit. Please upgrade your plan or delete some documents.
          <a href="/dashboard/subscription" className="ml-1 font-medium underline">
            Upgrade Plan
          </a>
        </div>
      )}
      
      {isNearLimit && (
        <div className="text-sm text-yellow-600 mt-1">
          You're approaching your storage limit. Consider upgrading your plan or deleting unused documents.
          <a href="/dashboard/subscription" className="ml-1 font-medium underline">
            View Plans
          </a>
        </div>
      )}
    </div>
  );
};

export default StorageUsageDisplay;