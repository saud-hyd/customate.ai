// Path: frontend/dashboard/src/components/analytics/ApiUsageAnalytics.jsx
import React, { useState } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { 
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { 
  CloudIcon, 
  CodeBracketIcon, 
  ClockIcon, 
  ServerIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import LoadingState from '../common/LoadingState';
import { formatNumber, formatDuration } from '../../utils/formatters';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * API Usage Analytics Component
 * Shows detailed metrics about API usage and performance
 */
const ApiUsageAnalytics = ({ data, dateRange }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState(null);
  
  if (!data) {
    return <LoadingState message="Loading API usage data..." />;
  }

  // Prepare daily usage chart data
  const dailyUsageData = {
    labels: data.daily_usage?.map(day => day.date) || [],
    datasets: [
      {
        label: 'API Requests',
        data: data.daily_usage?.map(day => day.request_count) || [],
        fill: true,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgba(59, 130, 246, 1)',
        tension: 0.3,
      },
    ],
  };

  // Prepare status code distribution data
  const statusCodeData = {
    labels: data.endpoint_stats?.status_codes?.map(status => `${status.status_code}`) || [],
    datasets: [
      {
        data: data.endpoint_stats?.status_codes?.map(status => status.count) || [],
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',  // 2xx - Success (Green)
          'rgba(245, 158, 11, 0.7)',  // 3xx - Redirection (Amber)
          'rgba(239, 68, 68, 0.7)',   // 4xx - Client Error (Red)
          'rgba(124, 58, 237, 0.7)',  // 5xx - Server Error (Purple)
          'rgba(156, 163, 175, 0.7)', // Others (Gray)
        ],
        borderWidth: 1,
      },
    ],
  };

  // Generate colors for endpoints
  const getEndpointColor = (index) => {
    const colors = [
      'rgba(59, 130, 246, 0.7)', // blue
      'rgba(139, 92, 246, 0.7)',  // purple
      'rgba(16, 185, 129, 0.7)',  // green
      'rgba(245, 158, 11, 0.7)',  // amber
      'rgba(236, 72, 153, 0.7)',  // pink
    ];
    return colors[index % colors.length];
  };

  // Prepare endpoint usage data
  const endpointData = {
    labels: data.endpoint_stats?.endpoints?.map(endpoint => {
      // Shorten endpoint names for display
      const parts = endpoint.endpoint.split('/');
      return parts[parts.length - 1] || endpoint.endpoint;
    }) || [],
    datasets: [
      {
        label: 'Request Count',
        data: data.endpoint_stats?.endpoints?.map(endpoint => endpoint.count) || [],
        backgroundColor: data.endpoint_stats?.endpoints?.map((_, index) => getEndpointColor(index)) || [],
        borderWidth: 1,
      },
    ],
  };

  // Summary metrics
  const summaryMetrics = [
    {
      title: 'Total Requests',
      value: formatNumber(data.summary?.total_requests || 0),
      icon: CloudIcon,
      color: 'bg-blue-500',
      description: 'Total API requests',
    },
    {
      title: 'Avg. Response Time',
      value: formatDuration(data.summary?.avg_response_time_ms || 0),
      icon: ClockIcon,
      color: 'bg-green-500',
      description: 'Average API response time',
    },
    {
      title: 'Success Rate',
      value: `${Math.round(data.summary?.success_rate || 0)}%`,
      icon: CheckCircleIcon,
      color: 'bg-indigo-500',
      description: 'Percentage of successful requests',
    },
    {
      title: 'Error Rate',
      value: `${Math.round(data.summary?.error_rate || 0)}%`,
      icon: ExclamationCircleIcon,
      color: 'bg-red-500',
      description: 'Percentage of failed requests',
    },
  ];

  // Handle endpoint click for detail view
  const handleEndpointClick = (event, elements) => {
    if (elements.length > 0) {
      const index = elements[0].index;
      const endpoint = data.endpoint_stats.endpoints[index];
      setSelectedEndpoint(endpoint);
    }
  };

  // Example response time distribution data
  const responseTimeData = {
    labels: ['<100ms', '100-200ms', '200-500ms', '500ms-1s', '>1s'],
    datasets: [
      {
        label: 'Response Time Distribution',
        data: [45, 30, 15, 8, 2], // Example data - replace with actual if available
        backgroundColor: [
          'rgba(16, 185, 129, 0.7)',
          'rgba(59, 130, 246, 0.7)',
          'rgba(245, 158, 11, 0.7)',
          'rgba(244, 114, 182, 0.7)',
          'rgba(239, 68, 68, 0.7)',
        ],
        borderWidth: 1,
      },
    ],
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

      {/* Daily usage chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily API Usage</h3>
        <div className="h-80">
          <Line
            data={dailyUsageData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Request Count',
                  },
                },
              },
              plugins: {
                tooltip: {
                  mode: 'index',
                  intersect: false,
                },
              },
            }}
          />
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Daily API request volume shows usage patterns over time.
        </p>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Endpoint usage chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Top Endpoints</h3>
          <div className="h-80">
            <Bar
              data={endpointData}
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
                onClick: handleEndpointClick,
              }}
            />
          </div>
          <p className="mt-4 text-sm text-gray-500 text-center">
            Click on an endpoint to see detailed metrics
          </p>
        </div>

        {/* Status code distribution chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Status Code Distribution</h3>
          <div className="h-80 flex items-center justify-center">
            <div className="w-full max-w-xs">
              <Doughnut
                data={statusCodeData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'bottom',
                      labels: {
                        boxWidth: 12,
                        padding: 15,
                      },
                    },
                    tooltip: {
                      callbacks: {
                        label: function(context) {
                          const label = context.label || '';
                          const value = context.raw || 0;
                          const total = context.dataset.data.reduce((a, b) => a + b, 0);
                          const percentage = ((value / total) * 100).toFixed(1);
                          return `${label}: ${value} requests (${percentage}%)`;
                        }
                      }
                    }
                  },
                }}
              />
            </div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2">
            <div className="text-xs text-gray-500 flex items-center">
              <span className="inline-block w-3 h-3 bg-green-500 rounded-full mr-2"></span>
              2xx: Success responses
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-2"></span>
              3xx: Redirection responses
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <span className="inline-block w-3 h-3 bg-red-500 rounded-full mr-2"></span>
              4xx: Client error responses
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <span className="inline-block w-3 h-3 bg-purple-500 rounded-full mr-2"></span>
              5xx: Server error responses
            </div>
          </div>
        </div>
      </div>

      {/* Endpoint detail section - shown when an endpoint is selected */}
      {selectedEndpoint && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Endpoint Details: {selectedEndpoint.endpoint}
            </h3>
            <button
              type="button"
              className="text-sm text-gray-500 hover:text-gray-700"
              onClick={() => setSelectedEndpoint(null)}
            >
              Close
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Total Requests</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatNumber(selectedEndpoint.count || 0)}
              </div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Avg. Response Time</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {formatDuration(selectedEndpoint.avg_response_time_ms || 0)}
              </div>
            </div>
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500">Success Rate</div>
              <div className="mt-1 text-2xl font-semibold text-gray-900">
                {Math.round(selectedEndpoint.success_rate || 0)}%
              </div>
            </div>
          </div>
          
          {/* Example status code breakdown for the endpoint - replace with actual data if available */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status Code
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Count
                  </th>
                  <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {[
                  { status: 200, count: Math.round(selectedEndpoint.count * 0.93) },
                  { status: 400, count: Math.round(selectedEndpoint.count * 0.04) },
                  { status: 401, count: Math.round(selectedEndpoint.count * 0.02) },
                  { status: 500, count: Math.round(selectedEndpoint.count * 0.01) },
                ].map((status) => (
                  <tr key={status.status}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{status.status}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{status.count}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">
                        {((status.count / selectedEndpoint.count) * 100).toFixed(1)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Response time distribution chart */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Response Time Distribution</h3>
        <div className="h-64">
          <Bar
            data={responseTimeData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Request Count',
                  },
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
        <p className="mt-4 text-sm text-gray-500">
          Distribution of API response times helps identify performance bottlenecks.
        </p>
      </div>

      {/* Top API clients */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Top API Clients</h3>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client ID
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Request Count
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg. Response Time
                </th>
                <th className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Error Rate
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {/* Example client data - replace with actual data */}
              {[
                { id: "client_1", name: "Website Integration", count: 1250, time: 145, error: 1.2 },
                { id: "client_2", name: "Mobile App", count: 980, time: 132, error: 2.5 },
                { id: "client_3", name: "Analytics Dashboard", count: 630, time: 95, error: 0.8 },
                { id: "client_4", name: "Partner API", count: 420, time: 220, error: 3.4 },
                { id: "client_5", name: "Internal Tools", count: 310, time: 88, error: 0.5 },
              ].map((client) => (
                <tr key={client.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{client.name}</div>
                    <div className="text-xs text-gray-500">{client.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{formatNumber(client.count)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-gray-900">{client.time} ms</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      client.error > 3 ? 
                        'bg-red-100 text-red-800' : 
                        client.error > 1 ? 
                          'bg-yellow-100 text-yellow-800' : 
                          'bg-green-100 text-green-800'
                    }`}>
                      {client.error}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ApiUsageAnalytics;