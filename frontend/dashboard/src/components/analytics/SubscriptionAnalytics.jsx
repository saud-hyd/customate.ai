// Path: frontend/dashboard/src/components/analytics/SubscriptionAnalytics.jsx
import React from 'react';
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

/**
 * Subscription Analytics Component
 * Shows detailed metrics about subscription usage and limits
 */
const SubscriptionAnalytics = ({ data, dateRange }) => {
  if (!data) {
    return <LoadingState message="Loading subscription data..." />;
  }

  // Add fallbacks for missing data
  const current = data.current || {
    messages: { used: 0, limit: 100, percentage: 0 },
    users: { used: 0, limit: 5, percentage: 0 },
    storage: { 
      used_bytes: 0, 
      limit_bytes: 524288, 
      percentage: 0,
      used_mb: 0,
      limit_mb: 0.5
    }
  };

  const historical = data.historical || [];
  const subscription = data.subscription || { 
    plan_type: 'free', 
    status: 'active',
    expires_at: new Date(Date.now() + 30*24*60*60*1000).toISOString() // 30 days from now
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
  
  // Current usage metrics - ensure safe access with fallbacks
  const usageMetrics = [
    {
      title: 'Messages',
      used: current.messages?.used || 0,
      limit: current.messages?.limit || 1,
      percentage: current.messages?.percentage || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'blue',
    },
    {
      title: 'Active Users',
      used: current.users?.used || 0,
      limit: current.users?.limit || 1,
      percentage: current.users?.percentage || 0,
      icon: UserGroupIcon,
      color: 'purple',
    },
    {
      title: 'Storage',
      used: formatBytes(current.storage?.used_bytes || 0),
      limit: formatBytes(current.storage?.limit_bytes || 0),
      percentage: current.storage?.percentage || 0,
      icon: ArchiveBoxIcon,
      color: 'green',
    },
  ];

  // Only calculate trend metrics if we have at least 2 months of historical data
  const trendMetrics = historical && historical.length >= 2 ? [
    {
      title: 'Messages Growth',
      value: historical[0].messages_used - (historical[1]?.messages_used || 0),
      percentage: historical[1]?.messages_used ? 
        ((historical[0].messages_used - historical[1].messages_used) / Math.max(1, historical[1].messages_used)) * 100 : 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'blue',
    },
    {
      title: 'User Growth',
      value: historical[0].active_users - (historical[1]?.active_users || 0),
      percentage: historical[1]?.active_users ? 
        ((historical[0].active_users - historical[1].active_users) / Math.max(1, historical[1].active_users)) * 100 : 0,
      icon: UserGroupIcon,
      color: 'purple',
    },
    {
      title: 'Storage Growth',
      value: formatBytes(historical[0].storage_used_bytes - (historical[1]?.storage_used_bytes || 0)),
      percentage: historical[1]?.storage_used_bytes ? 
        ((historical[0].storage_used_bytes - historical[1].storage_used_bytes) / Math.max(1, historical[1].storage_used_bytes)) * 100 : 0,
      icon: ArchiveBoxIcon,
      color: 'green',
    },
  ] : [];
  
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

      {/* Historical usage chart */}
      {historical.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Trends (% of Plan Limits)</h3>
          <div className="h-80">
            <Line
              data={historicalChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                      display: true,
                      text: 'Percentage of Plan Limit',
                    },
                    ticks: {
                      callback: function(value) {
                        return value + '%';
                      }
                    }
                  },
                },
                plugins: {
                  tooltip: {
                    callbacks: {
                      label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) {
                          label += ': ';
                        }
                        label += context.parsed.y.toFixed(1) + '%';
                        return label;
                      }
                    }
                  }
                },
              }}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            This chart shows your usage as a percentage of your plan limits over time.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Usage Trends</h3>
          <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg">
            <p className="text-gray-500">Not enough historical data available yet.</p>
          </div>
        </div>
      )}

      {/* Raw usage chart */}
      {historical.length > 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly Message Volume</h3>
          <div className="h-64">
            <Bar
              data={rawUsageData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>
      ) : null}

      {/* Month-over-month trends */}
      {trendMetrics.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {trendMetrics.map((metric) => (
            <div key={metric.title} className="bg-white rounded-lg shadow p-5">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-gray-500">{metric.title}</p>
                  <div className="mt-1 flex items-baseline">
                    <p className="text-2xl font-semibold text-gray-900">
                      {typeof metric.value === 'number' ? (metric.value >= 0 ? '+' : '') + formatNumber(metric.value) : metric.value}
                    </p>
                    <p className={`ml-2 flex items-center text-sm ${
                      metric.percentage >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {metric.percentage >= 0 ? (
                        <ArrowUpIcon className="h-4 w-4 flex-shrink-0 self-center" aria-hidden="true" />
                      ) : (
                        <ArrowDownIcon className="h-4 w-4 flex-shrink-0 self-center" aria-hidden="true" />
                      )}
                      <span className="sr-only">
                        {metric.percentage >= 0 ? 'Increased' : 'Decreased'} by
                      </span>
                      {Math.abs(metric.percentage).toFixed(1)}%
                    </p>
                  </div>
                </div>
                <div className={`p-2 rounded-md ${getColorClass('bgLight', metric.color)}`}>
                  <metric.icon className={`h-6 w-6 ${getColorClass('text', metric.color)}`} aria-hidden="true" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historical usage table */}
      {historical.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-6 pt-6">
            <h3 className="text-lg font-medium text-gray-900">Monthly Usage History</h3>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Messages
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Active Users
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Storage
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usage Level
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {historical.map((month, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{month.month}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {formatNumber(month.messages_used)} / {formatNumber(month.messages_limit)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((month.messages_used / Math.max(1, month.messages_limit)) * 100)}% used
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {formatNumber(month.active_users)} / {formatNumber(month.active_users_limit)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((month.active_users / Math.max(1, month.active_users_limit)) * 100)}% used
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {formatBytes(month.storage_used_bytes)} / {formatBytes(month.storage_limit_bytes)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {Math.round((month.storage_used_bytes / Math.max(1, month.storage_limit_bytes)) * 100)}% used
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {Math.max(
                        (month.messages_used / Math.max(1, month.messages_limit)),
                        (month.active_users / Math.max(1, month.active_users_limit)),
                        (month.storage_used_bytes / Math.max(1, month.storage_limit_bytes))
                      ) * 100 > 90 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          High
                        </span>
                      ) : Math.max(
                        (month.messages_used / Math.max(1, month.messages_limit)),
                        (month.active_users / Math.max(1, month.active_users_limit)),
                        (month.storage_used_bytes / Math.max(1, month.storage_limit_bytes))
                      ) * 100 > 70 ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Medium
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Low
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <p className="text-gray-500">No historical usage data available yet. Check back after using the service for a while.</p>
        </div>
      )}
    </div>
  );
};

export default SubscriptionAnalytics;