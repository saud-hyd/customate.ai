// Path: frontend/dashboard/src/components/analytics/AnalyticsOverview.jsx
// Usage: Enhanced analytics overview with integrated voice metrics and channel comparison
// MODIFICATION: Add voice analytics alongside existing text analytics

import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  MagnifyingGlassIcon, 
  ArchiveBoxIcon,
  PhoneIcon, // NEW IMPORT
  ClockIcon, // NEW IMPORT
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';
import analyticsService from '../../services/analyticsService';
import telephonyService from '../../services/telephonyService'; // NEW IMPORT
import subscriptionService from '../../services/subscriptionService';
import { formatBytes } from '../../utils/formatters';
import LoadingState from '../common/LoadingState';

/**
 * Enhanced Analytics Overview Component with Voice Integration
 */
const AnalyticsOverview = ({ data, dateRange }) => {
  // EXISTING STATE
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);

  // NEW STATE FOR VOICE ANALYTICS
  const [voiceAnalytics, setVoiceAnalytics] = useState(null);
  const [channelComparison, setChannelComparison] = useState(null);

  // EXISTING: Format number utility
  const formatNumber = (num) => {
    return new Intl.NumberFormat().format(num);
  };

  // NEW: Format duration utility
  const formatDuration = (minutes) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return `${hours}h ${mins}m`;
  };

  // NEW: Get trend indicator
  const getTrendIndicator = (change) => {
    if (!change || change === 0) return null;
    const isPositive = change > 0;
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? (
          <ArrowUpIcon className="w-3 h-3 mr-1" />
        ) : (
          <ArrowDownIcon className="w-3 h-3 mr-1" />
        )}
        <span className="text-xs">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  // ENHANCED: Fetch all analytics data including voice
  useEffect(() => {
    const fetchAllData = async () => {
      try {
        setLoading(true);

        // Fetch existing data
        const [subscription, storage] = await Promise.all([
          subscriptionService.getCurrentSubscription(),
          analyticsService.getStorageStatistics()
        ]);
        
        setSubscriptionData(subscription);
        setStorageData(storage);

        // NEW: Fetch voice analytics
        try {
          const voiceData = await telephonyService.getVoiceAnalytics(dateRange?.days || 30);
          setVoiceAnalytics(voiceData);
        } catch (voiceError) {
          console.warn('Voice analytics not available:', voiceError);
          // Set mock data for demonstration
          setVoiceAnalytics({
            summary: {
              total_calls: 0,
              total_minutes: 0,
              average_duration: 0,
              completion_rate: 0
            },
            changes: {
              total_calls: 0,
              total_minutes: 0,
              average_duration: 0
            }
          });
        }

        // NEW: Generate channel comparison data
        setChannelComparison({
          text: {
            interactions: subscription?.usage?.messages?.used || 0,
            trend: 12.5 // Mock trend data
          },
          voice: {
            interactions: voiceAnalytics?.summary?.total_calls || 0,
            trend: 8.3 // Mock trend data
          }
        });

      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, [dateRange]);

  if (loading) {
    return <LoadingState message="Loading analytics data..." />;
  }

  // ENHANCED: KPI cards with voice integration
  const kpiCards = [
    {
      title: 'Text Messages',
      value: formatNumber(subscriptionData?.usage?.messages?.used || 0),
      limit: formatNumber(subscriptionData?.usage?.messages?.limit || 0),
      percentage: subscriptionData?.usage?.messages?.percentage || 0,
      trend: data?.changes?.messages || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    // NEW: Voice metrics card
    {
      title: 'Voice Calls',
      value: formatNumber(voiceAnalytics?.summary?.total_calls || 0),
      limit: null, // No limit display for calls
      percentage: null,
      trend: voiceAnalytics?.changes?.total_calls || 0,
      icon: PhoneIcon,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700',
      subtitle: `${formatDuration(voiceAnalytics?.summary?.total_minutes || 0)} total`
    },
    {
      title: 'Storage Used',
      value: formatBytes(storageData?.total_bytes || 0),
      limit: formatBytes(storageData?.limit_bytes || 0),
      percentage: storageData?.percentage || 0,
      trend: null, // Storage doesn't typically have trends
      icon: ArchiveBoxIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    }
  ];

  return (
    <div className="space-y-8">
      {/* ENHANCED: KPI summary cards with voice */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpiCards.map((card) => (
          <div key={card.title} className={`${card.bgColor} rounded-lg shadow p-6 border border-gray-200`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className={`${card.color} rounded-md p-3`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                  <dd className={`text-xl font-semibold ${card.textColor}`}>
                    {card.value}
                    {card.limit && (
                      <span className="text-sm font-normal text-gray-500 ml-1">
                        / {card.limit}
                      </span>
                    )}
                  </dd>
                  {card.subtitle && (
                    <div className="text-xs text-gray-600 mt-1">{card.subtitle}</div>
                  )}
                </div>
              </div>
              
              {/* Trend indicator */}
              {card.trend !== null && card.trend !== 0 && (
                <div className="flex-shrink-0">
                  {getTrendIndicator(card.trend)}
                </div>
              )}
            </div>
            
            {/* Progress bar for items with limits */}
            {card.percentage !== null && (
              <div className="mt-4">
                <div className="w-full bg-white rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${
                      card.percentage > 90 ? 'bg-red-600' : card.color
                    }`}
                    style={{ width: `${Math.min(card.percentage, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>{card.percentage.toFixed(1)}% used</span>
                  {card.percentage > 90 && (
                    <span className="text-red-600 font-medium">Near limit!</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* NEW: Channel Performance Comparison */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Channel Performance Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Text Channel Stats */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChatBubbleLeftRightIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Text Conversations</h4>
                <p className="text-sm text-gray-600">Message-based interactions</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">
                  {formatNumber(subscriptionData?.usage?.messages?.used || 0)}
                </div>
                <div className="text-sm text-blue-600">Messages this month</div>
                {data?.changes?.messages && getTrendIndicator(data.changes.messages)}
              </div>
              
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-700">
                  {formatNumber(data?.today?.sessions || 0)}
                </div>
                <div className="text-sm text-blue-600">Active sessions</div>
                {data?.changes?.sessions && getTrendIndicator(data.changes.sessions)}
              </div>
            </div>
          </div>

          {/* Voice Channel Stats */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <PhoneIcon className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-gray-900">Voice Conversations</h4>
                <p className="text-sm text-gray-600">Phone-based interactions</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">
                  {formatNumber(voiceAnalytics?.summary?.total_calls || 0)}
                </div>
                <div className="text-sm text-green-600">Calls this month</div>
                {voiceAnalytics?.changes?.total_calls && 
                  getTrendIndicator(voiceAnalytics.changes.total_calls)}
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-700">
                  {formatDuration(voiceAnalytics?.summary?.total_minutes || 0)}
                </div>
                <div className="text-sm text-green-600">Talk time</div>
                {voiceAnalytics?.changes?.total_minutes && 
                  getTrendIndicator(voiceAnalytics.changes.total_minutes)}
              </div>
            </div>
          </div>
        </div>

        {/* Channel Insights */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {((voiceAnalytics?.summary?.total_calls || 0) / 
                  Math.max((subscriptionData?.usage?.messages?.used || 0) + (voiceAnalytics?.summary?.total_calls || 0), 1) * 100
                ).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Voice preference</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {(voiceAnalytics?.summary?.average_duration || 0).toFixed(1)}m
              </div>
              <div className="text-sm text-gray-600">Avg call duration</div>
            </div>
            
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-lg font-semibold text-gray-900">
                {(voiceAnalytics?.summary?.completion_rate || 0).toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">Call completion rate</div>
            </div>
          </div>
        </div>
      </div>

      {/* ENHANCED: Usage limits section with voice */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Usage & Limits</h3>
        
        <div className="space-y-6">
          {/* Text Messages Usage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500 flex items-center">
                <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                Assistant Messages
              </span>
              <span className="text-sm text-gray-700">
                {formatNumber(subscriptionData?.usage?.messages?.used || 0)} / {formatNumber(subscriptionData?.usage?.messages?.limit || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  (subscriptionData?.usage?.messages?.percentage || 0) > 90 ? 'bg-red-600' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.min(subscriptionData?.usage?.messages?.percentage || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* Storage Usage */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500 flex items-center">
                <ArchiveBoxIcon className="w-4 h-4 mr-2" />
                Storage
              </span>
              <span className="text-sm text-gray-700">
                {formatBytes(storageData?.total_bytes || 0)} / {formatBytes(storageData?.limit_bytes || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  (storageData?.percentage || 0) > 90 ? 'bg-red-600' : 'bg-purple-600'
                }`}
                style={{ width: `${Math.min(storageData?.percentage || 0, 100)}%` }}
              />
            </div>
          </div>

          {/* NEW: Voice Usage (if available) */}
          {voiceAnalytics?.summary?.total_calls > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500 flex items-center">
                  <PhoneIcon className="w-4 h-4 mr-2" />
                  Voice Usage
                </span>
                <span className="text-sm text-gray-700">
                  {formatNumber(voiceAnalytics.summary.total_calls)} calls • {formatDuration(voiceAnalytics.summary.total_minutes)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Voice usage tracking available • {(voiceAnalytics.summary.completion_rate || 0).toFixed(1)}% completion rate
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Storage Breakdown (existing, enhanced) */}
      {storageData && (storageData.document_bytes > 0 || storageData.knowledge_bytes > 0) && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Storage Breakdown</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{formatBytes(storageData.document_bytes || 0)}</div>
              <div className="text-sm text-gray-500">Documents</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{formatBytes(storageData.knowledge_bytes || 0)}</div>
              <div className="text-sm text-gray-500">Knowledge Base</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{formatBytes(storageData.crawled_content_bytes || 0)}</div>
              <div className="text-sm text-gray-500">Crawled Content</div>
            </div>
          </div>
        </div>
      )}

      {/* NEW: Quick Actions for Voice */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg shadow p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Voice AI Features</h3>
            <p className="text-sm text-gray-600 mt-1">
              {voiceAnalytics?.summary?.total_calls > 0 
                ? 'Voice AI is active and processing calls'
                : 'Voice AI ready for configuration'
              }
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              <PhoneIcon className="w-4 h-4 mr-2" />
              Test Voice
            </button>
            <button className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
              <ClockIcon className="w-4 h-4 mr-2" />
              View Analytics
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;