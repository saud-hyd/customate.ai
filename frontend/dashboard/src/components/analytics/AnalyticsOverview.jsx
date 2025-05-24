// Path: frontend/dashboard/src/components/analytics/AnalyticsOverview.jsx
import React from 'react';
import { ArrowUpIcon, ArrowDownIcon, ChatBubbleLeftRightIcon, MagnifyingGlassIcon, UserGroupIcon, ClockIcon } from '@heroicons/react/24/outline';
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
import LoadingState from '../common/LoadingState';

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
 * Simple formatter for numbers
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
const formatNumber = (num) => {
  return new Intl.NumberFormat().format(num);
};

/**
 * Analytics Overview Component
 * Shows key metrics and trends from all analytics sections
 */
const AnalyticsOverview = ({ data, dateRange }) => {
  if (!data) {
    return <LoadingState message="Loading overview data..." />;
  }

  const { chat, knowledge, subscription } = data;

  // Prepare KPI cards data
  const kpiCards = [
    {
      title: 'Total Conversations',
      value: formatNumber(chat?.summary?.total_sessions || 0),
      change: 5.2, // Example percentage change
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
    },
    {
      title: 'Total Messages',
      value: formatNumber(chat?.summary?.total_messages || 0),
      change: 12.5, // Example percentage change
      icon: MagnifyingGlassIcon,
      color: 'bg-purple-500',
    },
    {
      title: 'Knowledge Usage',
      value: `${Math.round(chat?.summary?.knowledge_usage_percentage || 0)}%`,
      change: 3.8, // Example percentage change
      icon: MagnifyingGlassIcon,
      color: 'bg-green-500',
    },
    {
      title: 'Avg. Response Time',
      value: `${Math.round(chat?.summary?.avg_response_time_ms || 0)} ms`,
      change: -8.4, // Example percentage change (negative is good for response time)
      icon: ClockIcon,
      color: 'bg-yellow-500',
      reverseColors: true, // For metrics where decrease is positive
    },
  ];

  // Prepare chart data for conversations trend
  const conversationsChartData = {
    labels: chat?.time_series?.map(item => item.date) || [],
    datasets: [
      {
        label: 'Conversations',
        data: chat?.time_series?.map(item => item.total_sessions) || [],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        tension: 0.3,
      },
      {
        label: 'Messages',
        data: chat?.time_series?.map(item => item.total_messages) || [],
        fill: false,
        borderColor: 'rgba(139, 92, 246, 1)',
        borderDash: [5, 5],
        tension: 0.3,
      },
    ],
  };

  // Prepare chart data for knowledge usage
  const knowledgeChartData = {
    labels: knowledge?.collection_distribution?.map(item => item.name) || [],
    datasets: [
      {
        label: 'Search Count',
        data: knowledge?.collection_distribution?.map(item => item.search_count) || [],
        backgroundColor: [
          'rgba(34, 197, 94, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(168, 85, 247, 0.7)',
          'rgba(249, 115, 22, 0.7)',
          'rgba(236, 72, 153, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
  };

  // Subscription usage data
  const subscriptionData = subscription?.current || {};

  return (
    <div className="space-y-8">
      {/* KPI summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.title} className="bg-white rounded-lg shadow overflow-hidden">
            <div className="p-5">
              <div className="flex items-center">
                <div className={`flex-shrink-0 rounded-md p-3 ${card.color}`}>
                  <card.icon className="h-6 w-6 text-white" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{card.title}</dt>
                    <dd>
                      <div className="text-lg font-bold text-gray-900">{card.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <div className="flex items-center">
                  {card.change > 0 ? (
                    <ArrowUpIcon
                      className={`h-5 w-5 flex-shrink-0 ${
                        card.reverseColors ? 'text-red-500' : 'text-green-500'
                      }`}
                      aria-hidden="true"
                    />
                  ) : (
                    <ArrowDownIcon
                      className={`h-5 w-5 flex-shrink-0 ${
                        card.reverseColors ? 'text-green-500' : 'text-red-500'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className={`ml-1 ${
                      card.change > 0
                        ? card.reverseColors
                          ? 'text-red-500'
                          : 'text-green-500'
                        : card.reverseColors
                        ? 'text-green-500'
                        : 'text-red-500'
                    }`}
                  >
                    {Math.abs(card.change)}%
                  </span>
                  <span className="ml-2 text-gray-500">vs previous period</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversations chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Conversation Trends</h3>
          <div className="h-80">
            <Line
              data={conversationsChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Knowledge usage chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Knowledge Usage Distribution</h3>
          <div className="h-80">
            <Bar
              data={knowledgeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                  },
                },
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Subscription summary */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Subscription Usage - {subscription?.subscription?.plan_type || 'Standard'} Plan
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {subscriptionData.messages && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Messages</span>
                <span className="text-sm text-gray-700">
                  {formatNumber(subscriptionData.messages.used)} / {formatNumber(subscriptionData.messages.limit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    subscriptionData.messages.percentage > 90 ? 'bg-red-600' : 'bg-primary-600'
                  }`}
                  style={{ width: `${Math.min(subscriptionData.messages.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {subscriptionData.messages.percentage > 90 ? 
                  'Near limit - consider upgrading' : 
                  `${subscriptionData.messages.percentage.toFixed(1)}% used`}
              </p>
            </div>
          )}

          {subscriptionData.users && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Active Users</span>
                <span className="text-sm text-gray-700">
                  {formatNumber(subscriptionData.users.used)} / {formatNumber(subscriptionData.users.limit)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    subscriptionData.users.percentage > 90 ? 'bg-red-600' : 'bg-primary-600'
                  }`}
                  style={{ width: `${Math.min(subscriptionData.users.percentage, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {subscriptionData.users.percentage > 90 ? 
                  'Near limit - consider upgrading' : 
                  `${subscriptionData.users.percentage.toFixed(1)}% used`}
              </p>
            </div>
          )}

          {subscriptionData.storage && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-500">Storage</span>
                <span className="text-sm text-gray-700">
                  {(subscriptionData.storage.used_mb || 0).toFixed(1)} MB / {(subscriptionData.storage.limit_mb || 0).toFixed(1)} MB
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className={`h-2.5 rounded-full ${
                    (subscriptionData.storage.percentage || 0) > 90 ? 'bg-red-600' : 'bg-purple-600'
                  }`}
                  style={{ width: `${Math.min(subscriptionData.storage.percentage || 0, 100)}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">
                {(subscriptionData.storage.percentage || 0) > 90 ? 
                  'Near limit - consider upgrading' : 
                  `${(subscriptionData.storage.percentage || 0).toFixed(1)}% used`}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Insights cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-orange-50 rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 rounded-md p-3 bg-blue-500">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">Engagement Insights</h3>
              <p className="mt-2 text-sm text-gray-600">
                {chat?.summary?.messages_per_session > 3 
                  ? 'Your users are highly engaged with an average of ' + chat?.summary?.messages_per_session.toFixed(1) + ' messages per conversation.' 
                  : 'User engagement could be improved. Try adding more interactive elements to increase messages per conversation.'}
              </p>
              <a href="/analytics/engagement" className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-500">
                View detailed engagement analytics →
              </a>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-teal-50 rounded-lg shadow p-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 rounded-md p-3 bg-green-500">
              <MagnifyingGlassIcon className="h-6 w-6 text-white" aria-hidden="true" />
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">Knowledge Insights</h3>
              <p className="mt-2 text-sm text-gray-600">
                {knowledge?.summary?.avg_relevance_score > 0.8
                  ? 'Your knowledge base is performing well with a high relevance score of ' + knowledge?.summary?.avg_relevance_score.toFixed(2) + '.'
                  : 'Consider improving your knowledge base content to increase the relevance score of responses.'}
              </p>
              <a href="/analytics/knowledge" className="mt-3 text-sm font-medium text-green-600 hover:text-green-500">
                View detailed knowledge analytics →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsOverview;