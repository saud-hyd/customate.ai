// Path: frontend/dashboard/src/components/analytics/SubscriptionUsage.jsx
import React, { useState, useEffect } from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import Card from '../common/Card';
import analyticsService from '../../services/analyticsService';
import api from '../../services/api';
import { formatNumber } from '../../utils/formatters';

const SubscriptionUsage = ({ usageData: propUsageData, refreshData }) => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (propUsageData) {
      setUsageData(propUsageData);
      setLoading(false);
    } else {
      fetchUsageData();
    }
  }, [propUsageData]);

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

  const handleUpdateUsage = async () => {
    try {
      setLoading(true);
      // Use the API endpoint to sync subscription usage
      await api.post('/api/analytics/sync-subscription-usage');
      
      // Refresh data after update
      if (refreshData) {
        await refreshData();
      } else {
        const data = await analyticsService.getSubscriptionUsage();
        setUsageData(data);
      }
      
      // Show success message
      setMessage({
        type: 'success',
        text: 'Usage data updated successfully'
      });
      
      // Clear message after 3 seconds
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating usage data:', error);
      setMessage({
        type: 'error',
        text: 'Failed to update usage data'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !usageData) {
    return (
      <Card title="Subscription Usage">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (error && !usageData) {
    return (
      <Card title="Subscription Usage">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-800">{error || 'No subscription data available'}</p>
          <button 
            onClick={handleUpdateUsage}
            className="mt-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-md text-sm"
            disabled={loading}
          >
            {loading ? 'Refreshing...' : 'Refresh Data'}
          </button>
        </div>
      </Card>
    );
  }

  const { current, subscription, historical } = usageData || {};
  
  // Calculate MB from bytes for storage display
  const used_mb = current?.storage?.used_bytes 
    ? (current.storage.used_bytes / (1024 * 1024)).toFixed(1) 
    : '0';
  const limit_mb = current?.storage?.limit_bytes 
    ? (current.storage.limit_bytes / (1024 * 1024)).toFixed(1) 
    : '0';

  return (
    <Card 
      title="Subscription Usage" 
      subtitle={`${subscription?.plan_type ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1) : 'Standard'} Plan`}
      actionButton={
        <button
          onClick={handleUpdateUsage}
          className="px-4 py-1 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-md"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Usage Data'}
        </button>
      }
      footer={
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-500">
            Next billing date: {subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString() : 'N/A'}
          </span>
          <a href="/subscription" className="text-sm text-primary-600 hover:text-primary-700">
            Manage Subscription
          </a>
        </div>
      }
    >
      {message && (
        <div className={`mb-4 p-3 rounded-md ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}
      
      <div className="space-y-6">
        {/* Messages usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Messages</span>
            <span className="text-sm text-gray-700">
              {formatNumber(current?.messages?.used || 0)} / {formatNumber(current?.messages?.limit || 0)}
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
              {(current?.messages?.percentage || 0).toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Active users usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Active Users</span>
            <span className="text-sm text-gray-700">
              {formatNumber(current?.users?.used || 0)} / {formatNumber(current?.users?.limit || 0)}
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
              {(current?.users?.percentage || 0).toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Storage usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Storage</span>
            <span className="text-sm text-gray-700">
              {used_mb} MB / {limit_mb} MB
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
              {(current?.storage?.percentage || 0).toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Monthly trend */}
        {historical && historical.length >= 2 && (
          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Usage Trend</h4>
            <div className="flex space-x-3">
              <div className="w-1/3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Messages</span>
                  <span className={`text-xs ${
                    historical[0]?.messages_used > historical[1]?.messages_used 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {historical[0]?.messages_used > historical[1]?.messages_used ? (
                      <ArrowUpIcon className="h-3 w-3 inline" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 inline" />
                    )}
                    {' '}
                    {Math.abs(
                      ((historical[0]?.messages_used || 0) - (historical[1]?.messages_used || 0)) / 
                      Math.max(1, historical[1]?.messages_used || 1) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-semibold mt-1">
                  {formatNumber(historical[0]?.messages_used || 0)}
                </p>
              </div>
              
              <div className="w-1/3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Users</span>
                  <span className={`text-xs ${
                    historical[0]?.active_users > historical[1]?.active_users 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {historical[0]?.active_users > historical[1]?.active_users ? (
                      <ArrowUpIcon className="h-3 w-3 inline" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 inline" />
                    )}
                    {' '}
                    {Math.abs(
                      ((historical[0]?.active_users || 0) - (historical[1]?.active_users || 0)) / 
                      Math.max(1, historical[1]?.active_users || 1) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-semibold mt-1">
                  {formatNumber(historical[0]?.active_users || 0)}
                </p>
              </div>
              
              <div className="w-1/3 bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">Storage</span>
                  <span className={`text-xs ${
                    historical[0]?.storage_used_bytes > historical[1]?.storage_used_bytes 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {historical[0]?.storage_used_bytes > historical[1]?.storage_used_bytes ? (
                      <ArrowUpIcon className="h-3 w-3 inline" />
                    ) : (
                      <ArrowDownIcon className="h-3 w-3 inline" />
                    )}
                    {' '}
                    {Math.abs(
                      ((historical[0]?.storage_used_bytes || 0) - (historical[1]?.storage_used_bytes || 0)) / 
                      Math.max(1, historical[1]?.storage_used_bytes || 1) * 100
                    ).toFixed(1)}%
                  </span>
                </div>
                <p className="text-lg font-semibold mt-1">
                  {((historical[0]?.storage_used_bytes || 0) / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default SubscriptionUsage;