// Path: frontend/dashboard/src/components/analytics/SubscriptionAnalytics.jsx
import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  ChatBubbleLeftRightIcon, 
  UserGroupIcon, 
  CurrencyDollarIcon, 
  ArchiveBoxIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ExclamationTriangleIcon,
  CheckBadgeIcon
} from '@heroicons/react/24/outline';
import LoadingState from '../common/LoadingState';
import { formatNumber, formatBytes } from '../../utils/formatters';
import analyticsService from '../../services/analyticsService';
import subscriptionService from '../../services/subscriptionService';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const SubscriptionAnalytics = () => {
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRealData = async () => {
      try {
        const [subscriptionInfo, storageStats] = await Promise.all([
          subscriptionService.getCurrentSubscription(),
          analyticsService.getStorageStatistics()
        ]);
        setSubscriptionData(subscriptionInfo);
        setStorageData(storageStats);
      } catch (error) {
        console.error('Error fetching subscription data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchRealData();
  }, []);

  if (loading) {
    return <LoadingState message="Loading subscription data..." />;
  }

  // Add fallbacks for missing data
  const data = {};
  const current = data.current || {};

  const historical = data.historical || [];
  const subscription = data.subscription || { 
    plan_type: 'free', 
    status: 'active',
    expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString() // 30 days from now
  };
  const subscriptionLimits = {};
  const subscriptionUsage = {};
  const correctLimits = {
    messages: {
      used: subscriptionLimits?.limits?.messages?.used || 0,
      limit: subscriptionUsage?.usage?.messages?.limit || 0,
      percentage: subscriptionLimits?.limits?.messages?.percentage || 0
    }
  };

  // Generate historical usage data for chart
  const historicalChartData = {
    labels: historical.map(item => item.month),
    datasets: [
      {
        label: 'Messages',
        data: historical.map(item => (item.messages_used / Math.max(1, item.messages_limit)) * 100),
        fill: false,
        borderColor: 'rgba(59, 130, 246, 1)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Users',
        data: historical.map(item => (item.active_users / Math.max(1, item.active_users_limit)) * 100),
        fill: false,
        borderColor: 'rgba(139, 92, 246, 1)',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Storage',
        data: historical.map(item => (item.storage_used_bytes / Math.max(1, item.storage_limit_bytes)) * 100),
        fill: false,
        borderColor: 'rgba(16, 185, 129, 1)',
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Generate raw usage data for bar chart
  const rawUsageData = {
    labels: historical.map(item => item.month),
    datasets: [
      {
        label: 'Messages',
        data: historical.map(item => item.messages_used),
        backgroundColor: 'rgba(59, 130, 246, 0.7)',
      },
    ],
  };
  
  // REPLACE THE ENTIRE usageMetrics ARRAY WITH:
  const usageMetrics = [
    {
      title: 'Messages',
      used: subscriptionData?.usage?.messages?.used || 0,
      limit: subscriptionData?.usage?.messages?.limit || 0,
      percentage: subscriptionData?.usage?.messages?.percentage || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'blue',
    },

    {
      title: 'Storage',
      used: formatBytes(storageData?.total_bytes || 0),
      limit: formatBytes(storageData?.limit_bytes || 0),
      percentage: storageData?.percentage || 0,
      icon: ArchiveBoxIcon,
      color: 'green',
    },
  ];
  
  // Helper function to get color classes
  const getColorClass = (type, color) => {
    const colorMap = {
      bg: {
        blue: 'bg-blue-500',
        green: 'bg-green-500',
        purple: 'bg-purple-500',
        red: 'bg-red-500'
      },
      text: {
        blue: 'text-blue-500',
        green: 'text-green-500',
        purple: 'text-purple-500',
        red: 'text-red-500'
      },
      bgLight: {
        blue: 'bg-blue-100',
        green: 'bg-green-100',
        purple: 'bg-purple-100',
        red: 'bg-red-100'
      }
    };
    
    return colorMap[type][color] || '';
  };
  
  return (
    <div className="space-y-8">
      {/* Current Plan */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-lg shadow-lg overflow-hidden">
        <div className="px-6 py-8 md:px-8 flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <div className="flex items-center">
              <CurrencyDollarIcon className="h-8 w-8 text-white" aria-hidden="true" />
              <h2 className="ml-3 text-2xl font-bold text-white">
                {subscription?.plan_type ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1) : 'Standard'} Plan
              </h2>
              <CheckBadgeIcon className="ml-2 h-6 w-6 text-green-300" />
            </div>
            <p className="mt-2 text-blue-100">
              {subscription?.status === 'active' ? 'Active Subscription' : 'Subscription Status: ' + (subscription?.status || 'Unknown')}
            </p>
          </div>
          
          <div className="mt-4 md:mt-0">
            {subscription?.expires_at && (
              <div className="text-white">
                <span className="text-blue-100">Next billing: </span>
                {new Date(subscription.expires_at).toLocaleDateString()}
              </div>
            )}
            <a 
              href="/subscription"
              className="mt-2 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-indigo-600 bg-white hover:bg-indigo-50"
            >
              Manage Subscription
            </a>
          </div>
        </div>
      </div>

      {/* Current usage metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Current Usage</h3>
        <div className="space-y-6">
          {usageMetrics.map((metric) => (
            <div key={metric.title} className="space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  <metric.icon className={`h-5 w-5 ${getColorClass('text', metric.color)} mr-2`} aria-hidden="true" />
                  <span className="text-sm font-medium text-gray-700">{metric.title}</span>
                </div>
                <span className="text-sm text-gray-700">
                  {typeof metric.used === 'number' ? formatNumber(metric.used) : metric.used} / {typeof metric.limit === 'number' ? formatNumber(metric.limit) : metric.limit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${getColorClass('bg', metric.color)} ${
                    metric.percentage > 90 ? 'animate-pulse' : ''
                  }`}
                  style={{ width: `${Math.min(metric.percentage, 100)}%` }}
                ></div>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">
                  {metric.percentage > 90 ? (
                    <span className="text-red-500 flex items-center">
                      <ExclamationTriangleIcon className="h-4 w-4 mr-1" />
                      Near limit
                    </span>
                  ) : (
                    `${Math.round(metric.percentage)}% used`
                  )}
                </span>
                {metric.percentage > 90 && (
                  <a href="/subscription" className="text-xs text-blue-600 hover:text-blue-800">
                    Upgrade plan
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
};

export default SubscriptionAnalytics;