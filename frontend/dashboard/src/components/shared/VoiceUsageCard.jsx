// Path: frontend/dashboard/src/components/shared/VoiceUsageCard.jsx
// Usage: Displays voice usage metrics with progress bars and limit warnings

import React from 'react';
import { 
  PhoneIcon, 
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const VoiceUsageCard = ({ 
  usageData,
  showDetails = true,
  className = "",
  variant = 'default' // 'default', 'compact', 'detailed'
}) => {
  if (!usageData) {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-lg"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
              <div className="h-3 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
          <div className="space-y-3">
            <div className="h-2 bg-gray-200 rounded-full"></div>
            <div className="h-3 bg-gray-200 rounded w-32"></div>
          </div>
        </div>
      </div>
    );
  }

  const {
    minutes_used = 0,
    minutes_limit = 100,
    calls_count = 0,
    calls_limit = null,
    average_duration = 0,
    current_period = 'monthly'
  } = usageData;

  const usage_percentage = minutes_limit > 0 ? (minutes_used / minutes_limit) * 100 : 0;
  const is_approaching_limit = usage_percentage >= 80;
  const is_over_limit = usage_percentage >= 100;

  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  const getStatusColor = () => {
    if (is_over_limit) return 'red';
    if (is_approaching_limit) return 'yellow';
    return 'green';
  };

  const getStatusIcon = () => {
    if (is_over_limit) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />;
    }
    if (is_approaching_limit) {
      return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
  };

  const getProgressBarColor = () => {
    const statusColor = getStatusColor();
    switch (statusColor) {
      case 'red':
        return 'bg-red-500';
      case 'yellow':
        return 'bg-yellow-500';
      default:
        return 'bg-green-500';
    }
  };

  const getProgressBarBg = () => {
    const statusColor = getStatusColor();
    switch (statusColor) {
      case 'red':
        return 'bg-red-100';
      case 'yellow':
        return 'bg-yellow-100';
      default:
        return 'bg-green-100';
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`bg-white rounded-lg border border-gray-200 p-4 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <PhoneIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-900">Voice</h3>
              <p className="text-xs text-gray-500">
                {formatDuration(minutes_used)} / {formatDuration(minutes_limit)}
              </p>
            </div>
          </div>
          {getStatusIcon()}
        </div>
        
        <div className="mt-3">
          <div className={`w-full h-2 rounded-full ${getProgressBarBg()}`}>
            <div 
              className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
              style={{ width: `${Math.min(usage_percentage, 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-green-100 rounded-lg">
            <PhoneIcon className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-900">Voice Usage</h3>
            <p className="text-sm text-gray-500 capitalize">{current_period} limits</p>
          </div>
        </div>
        {getStatusIcon()}
      </div>

      {/* Usage Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Talk Time</span>
          <span className="text-sm text-gray-600">
            {formatDuration(minutes_used)} / {formatDuration(minutes_limit)}
          </span>
        </div>
        
        <div className={`w-full h-3 rounded-full ${getProgressBarBg()}`}>
          <div 
            className={`h-full rounded-full transition-all duration-300 ${getProgressBarColor()}`}
            style={{ width: `${Math.min(usage_percentage, 100)}%` }}
          />
        </div>
        
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-gray-500">
            {usage_percentage.toFixed(1)}% used
          </span>
          {is_over_limit && (
            <span className="text-xs text-red-600 font-medium">
              Over limit
            </span>
          )}
        </div>
      </div>

      {/* Status Message */}
      {(is_over_limit || is_approaching_limit) && (
        <div className={`
          mb-4 p-3 rounded-lg border
          ${is_over_limit 
            ? 'bg-red-50 border-red-200 text-red-800' 
            : 'bg-yellow-50 border-yellow-200 text-yellow-800'
          }
        `}>
          <div className="flex items-start space-x-2">
            <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              {is_over_limit ? (
                <>
                  <p className="font-medium">Usage limit exceeded</p>
                  <p>Voice calls may be restricted. Consider upgrading your plan.</p>
                </>
              ) : (
                <>
                  <p className="font-medium">Approaching usage limit</p>
                  <p>You've used {usage_percentage.toFixed(0)}% of your voice allowance.</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Additional Details */}
      {showDetails && variant === 'detailed' && (
        <div className="space-y-3 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <PhoneIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Total Calls</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">{calls_count.toLocaleString()}</p>
              {calls_limit && (
                <p className="text-xs text-gray-500">
                  of {calls_limit.toLocaleString()} limit
                </p>
              )}
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center space-x-1 mb-1">
                <ClockIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Avg Duration</span>
              </div>
              <p className="text-lg font-semibold text-gray-900">
                {formatDuration(average_duration)}
              </p>
              <p className="text-xs text-gray-500">per call</p>
            </div>
          </div>

          {/* Usage Tips */}
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Usage Tips</p>
                <ul className="mt-1 space-y-1 text-xs">
                  <li>• Monitor your usage regularly to avoid overages</li>
                  <li>• Consider upgrading if you consistently approach limits</li>
                  <li>• Voice usage resets at the start of each billing period</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoiceUsageCard;