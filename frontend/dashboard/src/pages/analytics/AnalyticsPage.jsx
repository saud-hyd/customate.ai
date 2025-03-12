import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
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

const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('chat');
  const [timeRange, setTimeRange] = useState(30); // days
  const [chatData, setChatData] = useState(null);
  const [knowledgeData, setKnowledgeData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [apiUsageData, setApiUsageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch data based on active tab
        if (activeTab === 'chat') {
          const data = await analyticsService.getChatPerformance(timeRange);
          setChatData(data);
        } else if (activeTab === 'knowledge') {
          const data = await analyticsService.getKnowledgeUsage(timeRange);
          setKnowledgeData(data);
        } else if (activeTab === 'subscription') {
          const data = await analyticsService.getSubscriptionUsage(Math.ceil(timeRange / 30)); // Convert days to months
          setSubscriptionData(data);
        } else if (activeTab === 'api') {
          const data = await analyticsService.getApiUsage(timeRange);
          setApiUsageData(data);
        }
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [activeTab, timeRange]);

  // Prepare line chart data for chat performance
  const prepareChatLineData = () => {
    if (!chatData?.time_series?.length) return null;
    
    const dates = chatData.time_series.map(item => item.date);
    const messages = chatData.time_series.map(item => item.total_messages);
    const sessions = chatData.time_series.map(item => item.total_sessions);
    
    return {
      labels: dates,
      datasets: [
        {
          label: 'Messages',
          data: messages,
          fill: false,
          borderColor: 'rgb(75, 192, 192)',
          tension: 0.1
        },
        {
          label: 'Sessions',
          data: sessions,
          fill: false,
          borderColor: 'rgb(153, 102, 255)',
          tension: 0.1
        }
      ]
    };
  };
  
  // Prepare bar chart data for knowledge usage
  const prepareKnowledgeBarData = () => {
    if (!knowledgeData?.collection_distribution?.length) return null;
    
    const collections = knowledgeData.collection_distribution.map(item => item.name);
    const searchCounts = knowledgeData.collection_distribution.map(item => item.search_count);
    
    return {
      labels: collections,
      datasets: [
        {
          label: 'Search Count',
          data: searchCounts,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgb(54, 162, 235)',
          borderWidth: 1
        }
      ]
    };
  };

  // Change tab handler
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // Change time range handler
  const handleTimeRangeChange = (e) => {
    setTimeRange(Number(e.target.value));
  };

  // Render loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading analytics data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Monitor performance and usage metrics for your chatbot.
        </p>
      </div>

      {/* Tabs and Time Range Selector */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <div className="flex justify-between items-center px-4 sm:px-6">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              {['chat', 'knowledge', 'subscription', 'api'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => handleTabChange(tab)}
                  className={`${
                    activeTab === tab
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm capitalize`}
                >
                  {tab === 'api' ? 'API Usage' : `${tab} Analytics`}
                </button>
              ))}
            </nav>
            
            {/* Time range dropdown */}
            <div className="flex items-center">
              <label htmlFor="timeRange" className="mr-2 text-sm text-gray-700">Time Range:</label>
              <select
                id="timeRange"
                name="timeRange"
                value={timeRange}
                onChange={handleTimeRangeChange}
                className="border-gray-300 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
        
        {/* Tab content */}
        <div className="p-4 sm:p-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {/* Chat Analytics Tab */}
          {activeTab === 'chat' && chatData && (
            <div className="space-y-6">
              {/* Summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total Messages</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{chatData.summary.total_messages}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total Sessions</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{chatData.summary.total_sessions}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Messages per Session</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{chatData.summary.messages_per_session.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Knowledge Usage</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{chatData.summary.knowledge_usage_percentage.toFixed(1)}%</p>
                </div>
              </div>
              
              {/* Line chart */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Chat Activity Over Time</h3>
                <div className="h-80">
                  {prepareChatLineData() && <Line data={prepareChatLineData()} options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }} />}
                </div>
              </div>
              
              {/* Response Time metrics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Avg. Response Time</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {chatData.summary.avg_response_time_ms?.toFixed(1) || 'N/A'} ms
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Min Response Time</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {chatData.summary.min_response_time_ms?.toFixed(1) || 'N/A'} ms
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Max Response Time</h3>
                  <p className="mt-1 text-2xl font-semibold text-gray-900">
                    {chatData.summary.max_response_time_ms?.toFixed(1) || 'N/A'} ms
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* Knowledge Analytics Tab */}
          {activeTab === 'knowledge' && knowledgeData && (
            <div className="space-y-6">
              {/* Summary metrics */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total Searches</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{knowledgeData.summary.total_searches}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Avg. Relevance Score</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{knowledgeData.summary.avg_relevance_score.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total Knowledge Items</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{knowledgeData.summary.current_items}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-500">Total Documents</h3>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">{knowledgeData.summary.current_documents}</p>
                </div>
              </div>
              
              {/* Bar chart for collection distribution */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Search Distribution by Collection</h3>
                <div className="h-80">
                  {prepareKnowledgeBarData() && <Bar data={prepareKnowledgeBarData()} options={{ 
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true
                      }
                    }
                  }} />}
                </div>
              </div>
              
              {/* Time series table */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Knowledge Usage</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Date</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Search Count</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Avg. Relevance</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Items Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {knowledgeData.time_series.slice(-7).map((day) => (
                        <tr key={day.date}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{day.date}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{day.search_count}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{day.average_relevance_score?.toFixed(2) || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{day.items_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
          
          {/* Subscription Analytics Tab */}
          {activeTab === 'subscription' && subscriptionData && (
            <div className="space-y-6">
              {/* Current usage */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Usage</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subscriptionData.current && Object.keys(subscriptionData.current).map((key) => {
                    const item = subscriptionData.current[key];
                    return (
                      <div key={key} className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-500 capitalize">{key}</h4>
                        <div className="mt-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-700">
                              {item.used} / {item.limit} {key === 'storage' ? 'MB' : ''}
                            </span>
                            <span className={item.percentage > 90 ? 'text-red-600' : 'text-green-600'}>
                              {item.percentage.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div 
                              className={`h-2.5 rounded-full ${item.percentage > 90 ? 'bg-red-600' : 'bg-green-600'}`}
                              style={{ width: `${Math.min(item.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Historical usage */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Historical Usage</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Month</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Messages</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Active Users</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Storage (MB)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {subscriptionData.historical.map((month) => (
                        <tr key={month.month}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{month.month}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {month.messages_used} / {month.messages_limit}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {month.active_users} / {month.active_users_limit}
                          </td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                            {(month.storage_used_bytes / (1024 * 1024)).toFixed(1)} / {(month.storage_limit_bytes / (1024 * 1024)).toFixed(1)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Subscription details */}
              {subscriptionData.subscription && (
                <div className="bg-white p-4 rounded-lg border">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Subscription Details</h3>
                  <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Plan Type</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">{subscriptionData.subscription.plan_type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Status</dt>
                      <dd className="mt-1 text-sm text-gray-900 capitalize">{subscriptionData.subscription.status}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Start Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(subscriptionData.subscription.starts_at).toLocaleDateString()}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Expiry Date</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {subscriptionData.subscription.expires_at 
                          ? new Date(subscriptionData.subscription.expires_at).toLocaleDateString()
                          : 'No expiry date'}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          )}
          
          {/* API Usage Tab */}
          {activeTab === 'api' && apiUsageData && (
            <div className="space-y-6">
              {/* Endpoint stats */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Endpoint Usage</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead>
                      <tr>
                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Endpoint</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Count</th>
                        <th className="py-3.5 px-3 text-left text-sm font-semibold text-gray-900">Avg. Response Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {apiUsageData.endpoint_stats.endpoints.map((endpoint) => (
                        <tr key={endpoint.endpoint}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{endpoint.endpoint}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{endpoint.count}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{endpoint.avg_response_time_ms} ms</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              
              {/* Status codes */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Status Code Distribution</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {apiUsageData.endpoint_stats.status_codes.map((status) => (
                    <div key={status.status_code} className="bg-gray-50 p-4 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-500">
                        Status {status.status_code}
                      </h4>
                      <p className="mt-1 text-2xl font-semibold text-gray-900">{status.count}</p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Daily usage chart */}
              <div className="bg-white p-4 rounded-lg border">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Daily API Requests</h3>
                <div className="h-80">
                  <Line 
                    data={{
                      labels: apiUsageData.daily_usage.map(day => day.date),
                      datasets: [
                        {
                          label: 'API Requests',
                          data: apiUsageData.daily_usage.map(day => day.request_count),
                          fill: true,
                          backgroundColor: 'rgba(75, 192, 192, 0.2)',
                          borderColor: 'rgb(75, 192, 192)',
                          tension: 0.1
                        }
                      ]
                    }} 
                    options={{ 
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true
                        }
                      }
                    }} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;