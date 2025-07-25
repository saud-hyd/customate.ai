// Path: frontend/dashboard/src/components/dashboard/UsageOverview.jsx
// Usage: Enhanced dashboard usage overview component with voice metrics integration
// MODIFICATION: Add voice usage metrics alongside existing messages and storage

import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  ArchiveBoxIcon,
  PhoneIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  MinusIcon 
} from '@heroicons/react/24/outline';
import { formatBytes } from '../../utils/formatters';
import subscriptionService from '../../services/subscriptionService';
import telephonyService from '../../services/telephonyService'; // NEW IMPORT
import VoiceUsageCard from '../shared/VoiceUsageCard'; // NEW IMPORT

const UsageOverview = ({ className = "" }) => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [voiceUsage, setVoiceUsage] = useState(null); // NEW STATE
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsageData();
  }, []);

  const fetchUsageData = async () => {
    try {
      setLoading(true);
      
      // Fetch existing data
      const [subscription, storage] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        subscriptionService.getStorageBreakdown()
      ]);

      setSubscriptionData(subscription);
      setStorageData(storage);

      // NEW: Fetch voice usage data
      try {
        const voiceData = await telephonyService.getVoiceUsage();
        setVoiceUsage(voiceData);
      } catch (voiceError) {
        console.warn('Voice usage not available:', voiceError);
        // Set default/mock voice data for demonstration
        setVoiceUsage({
          minutes_used: 0,
          minutes_limit: 100,
          calls_count: 0,
          average_duration: 0,
          current_period: 'monthly'
        });
      }

      setError(null);
    } catch (err) {
      console.error('Error fetching usage data:', err);
      setError('Failed to load usage data');
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (percentage) => {
    return `${percentage.toFixed(1)}%`;
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const renderChangeIndicator = (change) => {
    if (change === 0) {
      return (
        <span className="flex items-center text-gray-500">
          <MinusIcon className="w-3 h-3 mr-1" />
          No change
        </span>
      );
    }
    
    const isPositive = change > 0;
    return (
      <span className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpIcon className="w-3 h-3 mr-1" />
        ) : (
          <ArrowDownIcon className="w-3 h-3 mr-1" />
        )}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className}`}>
        {/* Loading skeletons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
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
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-6 ${className}`}>
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchUsageData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* ENHANCED: Usage Cards Grid - Now includes Voice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Messages Usage Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Messages</h3>
              <p className="text-sm text-gray-500">Text conversations</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
              <span className="text-sm text-gray-600">
                {formatNumber(subscriptionData?.usage?.messages?.used || 0)} / {formatNumber(subscriptionData?.usage?.messages?.limit || 100)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(subscriptionData?.usage?.messages?.percentage || 0)}`}
                style={{ width: `${Math.min(subscriptionData?.usage?.messages?.percentage || 0, 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {formatPercentage(subscriptionData?.usage?.messages?.percentage || 0)} used
              </span>
              {subscriptionData?.usage?.messages?.percentage >= 90 && (
                <span className="text-red-600 font-medium">Near limit!</span>
              )}
            </div>
          </div>
        </div>

        {/* NEW: Voice Usage Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <PhoneIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Voice</h3>
              <p className="text-sm text-gray-500">Phone conversations</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Talk Time</span>
              <span className="text-sm text-gray-600">
                {Math.round(voiceUsage?.minutes_used || 0)}m / {voiceUsage?.minutes_limit || 100}m
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(
                  voiceUsage?.minutes_limit > 0 ? (voiceUsage.minutes_used / voiceUsage.minutes_limit) * 100 : 0
                )}`}
                style={{ 
                  width: `${Math.min(
                    voiceUsage?.minutes_limit > 0 ? (voiceUsage.minutes_used / voiceUsage.minutes_limit) * 100 : 0, 
                    100
                  )}%` 
                }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {voiceUsage?.calls_count || 0} calls this month
              </span>
              <div className="flex items-center text-gray-500">
                <ClockIcon className="w-3 h-3 mr-1" />
                <span>{Math.round(voiceUsage?.average_duration || 0)}m avg</span>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Usage Card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <ArchiveBoxIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Storage</h3>
              <p className="text-sm text-gray-500">File storage</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Usage</span>
              <span className="text-sm text-gray-600">
                {formatBytes(storageData?.total_bytes || 0)} / {formatBytes(storageData?.limit_bytes || 0)}
              </span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(storageData?.percentage || 0)}`}
                style={{ width: `${Math.min(storageData?.percentage || 0, 100)}%` }}
              />
            </div>
            
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">
                {formatPercentage(storageData?.percentage || 0)} used
              </span>
              {(storageData?.percentage || 0) >= 90 && (
                <span className="text-red-600 font-medium">Near limit!</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Channel Performance Comparison */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Channel Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-gray-900">Text Conversations</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">This month:</span>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(subscriptionData?.usage?.messages?.used || 0)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Avg per day:</span>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(Math.round((subscriptionData?.usage?.messages?.used || 0) / 30))}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <PhoneIcon className="w-5 h-5 text-green-600" />
              <span className="font-medium text-gray-900">Voice Conversations</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">This month:</span>
                <p className="text-lg font-semibold text-gray-900">
                  {formatNumber(voiceUsage?.calls_count || 0)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Total time:</span>
                <p className="text-lg font-semibold text-gray-900">
                  {Math.round(voiceUsage?.minutes_used || 0)}m
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown (Enhanced) */}
      {storageData && (storageData.document_bytes > 0 || storageData.knowledge_bytes > 0) && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {formatBytes(storageData.document_bytes || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Documents</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {formatBytes(storageData.knowledge_bytes || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Knowledge Base</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {formatBytes(storageData.crawled_content_bytes || 0)}
              </div>
              <div className="text-sm text-gray-600 mt-1">Crawled Content</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsageOverview;