import React, { useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import Card from '../common/Card';
import analyticsService from '../../services/analyticsService';

/**
 * SubscriptionUsage component for displaying subscription limits and usage
 * Provides visual indicators of current usage against plan limits
 * Used in the analytics dashboard to monitor resource consumption
 */
const SubscriptionUsage = () => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUsageData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getSubscriptionUsage();
        setUsageData(data);
      } catch (err) {
        console.error('Error fetching subscription usage:', err);
        setError('Failed to load subscription data');
      } finally {
        setLoading(false);
      }
    };

    fetchUsageData();
  }, []);

  if (loading) {
    return (
      <Card title="Subscription Usage">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (error || !usageData) {
    return (
      <Card title="Subscription Usage">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-800">{error || 'No subscription data available'}</p>
        </div>
      </Card>
    );
  }

  const { current, subscription } = usageData;

  return (
    <Card 
      title="Subscription Usage" 
      subtitle={`${subscription?.plan_type || 'Standard'} Plan`}
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Next billing date: {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'N/A'}
          </span>
          <button className="text-sm text-primary-600 hover:text-primary-700">
            Upgrade Plan
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Messages usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Messages</span>
            <span className="text-sm text-gray-700">
              {current?.messages?.used.toLocaleString()} / {current?.messages?.limit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${current?.messages?.percentage > 90 ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${Math.min(current?.messages?.percentage || 0, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {current?.messages?.percentage > 90 ? 'Approaching limit' : 'Within limit'}
            </span>
            <span className="text-xs text-gray-500">
              {current?.messages?.percentage.toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Active users usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Active Users</span>
            <span className="text-sm text-gray-700">
              {current?.users?.used.toLocaleString()} / {current?.users?.limit.toLocaleString()}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${current?.users?.percentage > 90 ? 'bg-red-600' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(current?.users?.percentage || 0, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {current?.users?.percentage > 90 ? 'Approaching limit' : 'Within limit'}
            </span>
            <span className="text-xs text-gray-500">
              {current?.users?.percentage.toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Storage usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Storage</span>
            <span className="text-sm text-gray-700">
              {current?.storage?.used_mb.toFixed(1)} MB / {current?.storage?.limit_mb.toFixed(1)} MB
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${current?.storage?.percentage > 90 ? 'bg-red-600' : 'bg-purple-600'}`}
              style={{ width: `${Math.min(current?.storage?.percentage || 0, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {current?.storage?.percentage > 90 ? 'Approaching limit' : 'Within limit'}
            </span>
            <span className="text-xs text-gray-500">
              {current?.storage?.percentage.toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Monthly trend */}
        <div className="pt-4 border-t border-gray-200">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Usage Trend</h4>
          <div className="flex space-x-3">
            <div className="w-1/3 bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Messages</span>
                <span className={`text-xs ${
                  usageData.historical[0]?.messages_used > usageData.historical[1]?.messages_used 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {usageData.historical[0]?.messages_used > usageData.historical[1]?.messages_used ? (
                    <ArrowUpIcon className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 inline" />
                  )}
                  {' '}
                  {Math.abs(
                    ((usageData.historical[0]?.messages_used || 0) - (usageData.historical[1]?.messages_used || 0)) / 
                    (usageData.historical[1]?.messages_used || 1) * 100
                  ).toFixed(1)}%
                </span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {usageData.historical[0]?.messages_used.toLocaleString()}
              </p>
            </div>
            
            <div className="w-1/3 bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Users</span>
                <span className={`text-xs ${
                  usageData.historical[0]?.active_users > usageData.historical[1]?.active_users 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {usageData.historical[0]?.active_users > usageData.historical[1]?.active_users ? (
                    <ArrowUpIcon className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 inline" />
                  )}
                  {' '}
                  {Math.abs(
                    ((usageData.historical[0]?.active_users || 0) - (usageData.historical[1]?.active_users || 0)) / 
                    (usageData.historical[1]?.active_users || 1) * 100
                  ).toFixed(1)}%
                </span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {usageData.historical[0]?.active_users.toLocaleString()}
              </p>
            </div>
            
            <div className="w-1/3 bg-gray-50 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">Storage</span>
                <span className={`text-xs ${
                  usageData.historical[0]?.storage_used_bytes > usageData.historical[1]?.storage_used_bytes 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {usageData.historical[0]?.storage_used_bytes > usageData.historical[1]?.storage_used_bytes ? (
                    <ArrowUpIcon className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownIcon className="h-3 w-3 inline" />
                  )}
                  {' '}
                  {Math.abs(
                    ((usageData.historical[0]?.storage_used_bytes || 0) - (usageData.historical[1]?.storage_used_bytes || 0)) / 
                    (usageData.historical[1]?.storage_used_bytes || 1) * 100
                  ).toFixed(1)}%
                </span>
              </div>
              <p className="text-lg font-semibold mt-1">
                {((usageData.historical[0]?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SubscriptionUsage;