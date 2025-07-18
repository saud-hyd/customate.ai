// Path: frontend/dashboard/src/components/analytics/AnalyticsOverview.jsx
import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import subscriptionService from '../../services/subscriptionService';
import { formatBytes } from '../../utils/formatters';
import { ArchiveBoxIcon } from '@heroicons/react/24/outline';
import { ChatBubbleLeftRightIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import LoadingState from '../common/LoadingState';

/**
 * Simple formatter for numbers
 */
const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Analytics Overview Component - Using Real Data Only
 */
const AnalyticsOverview = ({ data, dateRange }) => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const [subscription, storage] = await Promise.all([
          subscriptionService.getCurrentSubscription(),
          analyticsService.getStorageStatistics()
        ]);
        setSubscriptionData(subscription);
        setStorageData(storage);
      } catch (error) {
        console.error('Error fetching real data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchRealData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading analytics data..." />;
  }

  // KPI cards using real data
  const kpiCards = [
    {
      title: 'Assistant Messages',
      value: formatNumber(subscriptionData?.usage?.messages?.used || 0),
      limit: formatNumber(subscriptionData?.usage?.messages?.limit || 0),
      percentage: subscriptionData?.usage?.messages?.percentage || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Storage Used',
      value: formatBytes(storageData?.total_bytes || 0),
      limit: formatBytes(storageData?.limit_bytes || 0), 
      percentage: storageData?.percentage || 0,
      icon: ArchiveBoxIcon,
      color: 'bg-green-500',
    }
  ];

  return (
    <div className="space-y-8">
      {/* KPI summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kpiCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`flex-shrink-0 rounded-md p-3 ${card.color}`}>
                <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 flex-1">
                <h3 className="text-sm font-medium text-gray-500">{card.title}</h3>
                <div className="mt-1">
                  <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                  <div className="text-sm text-gray-500">of {card.limit}</div>
                </div>
              </div>
            </div>
            
            {/* Usage bar */}
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Usage</span>
                <span className="text-gray-600">{card.percentage.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    card.percentage > 90 ? 'bg-red-500' : 
                    card.percentage > 70 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(card.percentage, 100)}%` }}
                />
              </div>
              {card.percentage > 90 && (
                <p className="text-xs text-red-600 mt-1">Near limit - consider upgrading</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Current Plan Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Current Plan: {subscriptionData?.plan_type?.charAt(0).toUpperCase() + subscriptionData?.plan_type?.slice(1) || 'Basic'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Messages</span>
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

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-500">Storage</span>
              <span className="text-sm text-gray-700">
                {formatBytes(storageData?.total_bytes || 0)} / {formatBytes(storageData?.limit_bytes || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full ${
                  (storageData?.percentage || 0) > 90 ? 'bg-red-600' : 'bg-green-600'
                }`}
                style={{ width: `${Math.min(storageData?.percentage || 0, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Storage Breakdown */}
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

      {/* Coming Soon Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 rounded-md p-3 bg-blue-500">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">Engagement Analytics</h3>
              <p className="mt-2 text-sm text-gray-600">
                Detailed conversation analytics and user engagement metrics coming soon.
              </p>
              <span className="mt-3 inline-block text-sm font-medium text-blue-600">
                Coming Soon
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 rounded-md p-3 bg-green-500">
              <MagnifyingGlassIcon className="h-6 w-6 text-white" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">Knowledge Analytics</h3>
              <p className="mt-2 text-sm text-gray-600">
                Knowledge base performance insights and optimization recommendations.
              </p>
              <span className="mt-3 inline-block text-sm font-medium text-green-600">
                In Development
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;