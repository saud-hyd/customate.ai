import React, { useState, useEffect } from 'react';
import Card from '../common/Card';
import analyticsService from '../../services/analyticsService';
import { formatNumber } from '../../utils/formatters';

const SubscriptionUsage = ({ usageData: propUsageData, refreshData }) => {
  const [usageData, setUsageData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    if (propUsageData) {
      setUsageData(propUsageData);
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
      // Fix the message counts
      await analyticsService.fixMessageCounts();
      
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
  
  // Ensure we have default values if fields are missing
  const messageUsed = current?.messages?.used || 0;
  const messageLimit = current?.messages?.limit || 100;
  const messagePercentage = current?.messages?.percentage || 0;
  
  const usersUsed = current?.users?.used || 0;
  const usersLimit = current?.users?.limit || 10;
  const usersPercentage = current?.users?.percentage || 0;
  
  // Calculate MB from bytes for storage display
  const used_mb = current?.storage?.used_bytes 
    ? (current.storage.used_bytes / (1024 * 1024)).toFixed(1) 
    : '0';
  const limit_mb = current?.storage?.limit_bytes 
    ? (current.storage.limit_bytes / (1024 * 1024)).toFixed(1) 
    : '0';
  const storagePercentage = current?.storage?.percentage || 0;

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
              {formatNumber(messageUsed)} / {formatNumber(messageLimit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${messagePercentage > 90 ? 'bg-red-600' : 'bg-green-600'}`}
              style={{ width: `${Math.min(messagePercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {messagePercentage > 90 ? 'Approaching limit' : 'Within limit'}
            </span>
            <span className="text-xs text-gray-500">
              {messagePercentage.toFixed(1)}% used
            </span>
          </div>
        </div>

        {/* Active users usage */}
        <div>
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Active Users</span>
            <span className="text-sm text-gray-700">
              {formatNumber(usersUsed)} / {formatNumber(usersLimit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`h-2.5 rounded-full ${usersPercentage > 90 ? 'bg-red-600' : 'bg-blue-600'}`}
              style={{ width: `${Math.min(usersPercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {usersPercentage > 90 ? 'Approaching limit' : 'Within limit'}
            </span>
            <span className="text-xs text-gray-500">
              {usersPercentage.toFixed(1)}% used
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
              className={`h-2.5 rounded-full ${storagePercentage > 90 ? 'bg-red-600' : 'bg-purple-600'}`}
              style={{ width: `${Math.min(storagePercentage, 100)}%` }}
            ></div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">
              {storagePercentage > 90 ? 'Approaching limit' : 'Within limit'}
            </span>
            <span className="text-xs text-gray-500">
              {storagePercentage.toFixed(1)}% used
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default SubscriptionUsage;