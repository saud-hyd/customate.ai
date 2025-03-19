// Path: frontend/dashboard/src/components/analytics/EngagementAnalytics.jsx
import React, { useState } from 'react';
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
import { ChatAlt2Icon, UserGroupIcon, ClockIcon, ThumbUpIcon, ThumbDownIcon } from '@heroicons/react/outline';
import LoadingState from '../common/LoadingState';
import { formatNumber, formatDuration } from '../../utils/formatters';

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
 * Engagement Analytics Component
 * Shows detailed metrics about user engagement with the chatbot
 */
const EngagementAnalytics = ({ data, dateRange }) => {
  const [activeMetric, setActiveMetric] = useState('messages');
  
  if (!data) {
    return <LoadingState message="Loading engagement data..." />;
  }

  // Metrics options
  const metricOptions = [
    { id: 'messages', label: 'Messages', color: 'rgba(59, 130, 246, 1)' },
    { id: 'sessions', label: 'Sessions', color: 'rgba(139, 92, 246, 1)' },
    { id: 'responseTime', label: 'Response Time', color: 'rgba(16, 185, 129, 1)' },
    { id: 'knowledge', label: 'Knowledge Usage', color: 'rgba(245, 158, 11, 1)' },
  ];

  // Prepare main chart data
  const mainChartData = {
    labels: data.time_series?.map(item => item.date) || [],
    datasets: [
      {
        label: activeMetric === 'messages' ? 'Messages' : 
               activeMetric === 'sessions' ? 'Sessions' : 
               activeMetric === 'responseTime' ? 'Response Time (ms)' : 
               'Knowledge Usage (%)',
        data: data.time_series?.map(item => 
          activeMetric === 'messages' ? item.total_messages : 
          activeMetric === 'sessions' ? item.total_sessions : 
          activeMetric === 'responseTime' ? item.average_response_time_ms : 
          item.knowledge_usage_ratio
        ) || [],
        fill: true,
        backgroundColor: `${metricOptions.find(m => m.id === activeMetric)?.color.replace('1)', '0.2)')}`,
        borderColor: metricOptions.find(m => m.id === activeMetric)?.color,
        tension: 0.3,
      }
    ],
  };

  // Prepare hourly distribution data
  const hourlyData = {
    labels: [
      '12am', '1am', '2am', '3am', '4am', '5am', '6am', '7am', 
      '8am', '9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', 
      '4pm', '5pm', '6pm', '7pm', '8pm', '9pm', '10pm', '11pm'
    ],
    datasets: [
      {
        label: 'Sessions',
        data: data.hourly_distribution?.map(hour => hour.sessions) || Array(24).fill(0),
        backgroundColor: 'rgba(139, 92, 246, 0.7)',
      }
    ],
  };

  // Summary metrics cards
  const summaryMetrics = [
    {
      title: 'Total Sessions',
      value: formatNumber(data.summary?.total_sessions || 0),
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      description: 'Unique conversations started',
    },
    {
      title: 'Total Messages',
      value: formatNumber(data.summary?.total_messages || 0),
      icon: ChatAlt2Icon,
      color: 'bg-blue-500',
      description: 'Messages exchanged with users',
    },
    {
      title: 'Avg. Response Time',
      value: formatDuration(data.summary?.avg_response_time_ms || 0),
      icon: ClockIcon,
      color: 'bg-green-500',
      description: 'Average time to respond',
    },
    {
      title: 'Messages per Session',
      value: (data.summary?.messages_per_session || 0).toFixed(1),
      icon: ChatAlt2Icon,
      color: 'bg-yellow-500',
      description: 'Average conversation length',
    },
  ];

  // User satisfaction metrics (example data)
  const satisfactionData = {
    positive: 82, // Example percentage
    negative: 18, // Example percentage
  };
  
  return (
    <div className="space-y-8">
      {/* Summary metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryMetrics.map((metric) => (
          <div 
            key={metric.title} 
            className="bg-white rounded-lg shadow overflow-hidden flex flex-col"
          >
            <div className="flex items-center p-5">
              <div className={`flex-shrink-0 rounded-md p-3 ${metric.color}`}>
                <metric.icon className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{metric.title}</dt>
                  <dd>
                    <div className="text-lg font-bold text-gray-900">{metric.value}</div>
                  </dd>
                </dl>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3 flex-1">
              <div className="text-sm text-gray-500">
                {metric.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main chart section */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6">
          <div className="sm:flex sm:items-center sm:justify-between">
            <h3 className="text-lg font-medium text-gray-900">Engagement Trends</h3>
            
            {/* Metric selection tabs */}
            <div className="mt-3 sm:mt-0">
              <div className="flex space-x-1 bg-gray-100 p-1 rounded-md">
                {metricOptions.map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setActiveMetric(option.id)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md ${
                      activeMetric === option.id
                        ? 'bg-white shadow-sm text-gray-900'
                        : 'text-gray-500 hover:text-gray-900'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Chart */}
          <div className="mt-6 h-80">
            <Line
              data={mainChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        if (activeMetric === 'knowledge') {
                          return value + '%';
                        }
                        return value;
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
                        if (activeMetric === 'knowledge') {
                          label += context.parsed.y.toFixed(1) + '%';
                        } else {
                          label += context.parsed.y;
                        }
                        return label;
                      }
                    }
                  }
                },
                interaction: {
                  mode: 'index',
                  intersect: false,
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Secondary charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Hourly Distribution</h3>
          <div className="h-80">
            <Bar
              data={hourlyData}
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
                  tooltip: {
                    callbacks: {
                      title: function(tooltipItems) {
                        return tooltipItems[0].label;
                      },
                      label: function(context) {
                        return `Sessions: ${context.parsed.y}`;
                      }
                    }
                  }
                },
              }}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Peak activity times help you understand when users are most engaged with your chatbot.
          </p>
        </div>

        {/* User satisfaction */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">User Satisfaction</h3>
          <div className="flex items-center justify-center h-80">
            <div className="grid grid-cols-2 gap-6 w-full max-w-md">
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-green-100">
                  <ThumbUpIcon className="h-12 w-12 text-green-600" />
                </div>
                <div className="mt-3">
                  <span className="block text-2xl font-bold text-gray-900">{satisfactionData.positive}%</span>
                  <span className="block text-sm font-medium text-gray-500">Positive Feedback</span>
                </div>
              </div>
              <div className="text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-red-100">
                  <ThumbDownIcon className="h-12 w-12 text-red-600" />
                </div>
                <div className="mt-3">
                  <span className="block text-2xl font-bold text-gray-900">{satisfactionData.negative}%</span>
                  <span className="block text-sm font-medium text-gray-500">Negative Feedback</span>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-4 text-sm text-gray-500">
            Based on user feedback collected at the end of conversations.
          </p>
        </div>
      </div>

      {/* Additional metrics section */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Additional Metrics</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Description
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">Bounce Rate</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900">{Math.round(data.summary?.bounce_rate || 0)}%</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">Percentage of sessions with only one user message</div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">Completion Rate</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900">{Math.round(data.summary?.completion_rate || 0)}%</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">Percentage of conversations that reach a successful conclusion</div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">Knowledge Usage</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900">{Math.round(data.summary?.knowledge_usage_percentage || 0)}%</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">Percentage of responses using your knowledge base</div>
                </td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="font-medium text-gray-900">Avg. Session Duration</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-gray-900">
                    {formatDuration((data.summary?.avg_session_duration_ms || 0))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500">Average time users spend in a conversation</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default EngagementAnalytics;