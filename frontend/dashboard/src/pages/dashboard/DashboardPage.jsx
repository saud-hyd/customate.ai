// frontend/dashboard/src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import analyticsService from '../../services/analyticsService';
import subscriptionService from '../../services/subscriptionService';
import clientService from '../../services/clientService';
import { formatNumber, formatPercentage, formatBytes } from '../../utils/formatters';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon, CreditCardIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    today: {
      sessions: 0,
      messages: 0,
      searches: 0,
      users: 0
    },
    monthly: {
      total_sessions: 0,
      total_messages: 0,
      total_searches: 0
    },
    changes: {
      sessions: 0,
      messages: 0,
      searches: 0,
      users: 0
    },
    time_series: []
  });
  
  const [subscriptionData, setSubscriptionData] = useState({
    plan_type: 'free',
    status: 'active',
    usage: {
      messages: { used: 0, limit: 500, percentage: 0 },
      users: { used: 0, limit: 5, percentage: 0 },
      storage: { used_bytes: 0, limit_bytes: 50 * 1024 * 1024, percentage: 0 }
    }
  });
  
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Chart references
  const conversationChartRef = useRef(null);
  const chartInstancesRef = useRef({
    conversationChart: null
  });

  useEffect(() => {
    // Initial data fetch
    fetchAllData();
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchAllData();
    }, 300000);
    
    // Cleanup charts and interval when component unmounts
    return () => {
      clearInterval(refreshInterval);
      
      if (chartInstancesRef.current.conversationChart) {
        chartInstancesRef.current.conversationChart.destroy();
      }
    };
  }, []);

  // Update charts when data changes
  useEffect(() => {
    if (!loading && !error) {
      initializeCharts();
    }
  }, [dashboardData, loading, error]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all necessary data
      const [overviewData, subscriptionInfo, clientData] = await Promise.all([
        analyticsService.getDashboardOverview(),
        subscriptionService.getCurrentSubscription(),
        clientService.getClientInfo()
      ]);
      
      // Get chat performance data for trends
      const chatData = await analyticsService.getChatPerformance(30);
      
      // Update all data states
      setDashboardData({
        ...overviewData,
        chatTrends: chatData.time_series || []
      });
      
      setSubscriptionData(subscriptionInfo);
      setClientInfo(clientData);
      
      // Update last refresh timestamp
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeCharts = () => {
    // Destroy existing chart to prevent memory leaks
    if (chartInstancesRef.current.conversationChart) {
      chartInstancesRef.current.conversationChart.destroy();
    }
    
    // Get context for conversation chart
    const conversationCtx = conversationChartRef.current?.getContext('2d');
    
    if (conversationCtx && dashboardData.chatTrends && dashboardData.chatTrends.length > 0) {
      // Format data for conversation trends chart
      const labels = dashboardData.chatTrends.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      });
      
      const messageData = dashboardData.chatTrends.map(item => item.total_messages || 0);
      const sessionData = dashboardData.chatTrends.map(item => item.total_sessions || 0);
      
      // Create conversation chart
      chartInstancesRef.current.conversationChart = new Chart(conversationCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Messages',
              data: messageData,
              borderColor: '#4f46e5',
              backgroundColor: 'rgba(79, 70, 229, 0.1)',
              tension: 0.3,
              fill: true,
              borderWidth: 2,
              pointRadius: 3
            },
            {
              label: 'Conversations',
              data: sessionData,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              tension: 0.3,
              fill: true,
              borderWidth: 2,
              pointRadius: 3
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: {
            mode: 'index',
            intersect: false,
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            },
            tooltip: {
              enabled: true,
              mode: 'index',
              intersect: false
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                drawBorder: false
              }
            },
            x: {
              grid: {
                display: false
              }
            }
          }
        }
      });
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const renderChangeIndicator = (value) => {
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-green-600">
          <ArrowUpIcon className="h-3 w-3 mr-1" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-red-600">
          <ArrowDownIcon className="h-3 w-3 mr-1" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    } else {
      return <span className="text-gray-500">0%</span>;
    }
  };
  
  const handleUpgradeClick = () => {
    window.location.href = '/subscription';
  };

  if (loading && !dashboardData.monthly?.total_sessions) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header with refresh button */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Overview of your chatbot performance and subscription status.
            </p>
          </div>
          <button
            onClick={fetchAllData}
            className="flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={loading}
          >
            {loading ? (
              <div className="animate-spin h-4 w-4 mr-1 border-b-2 border-gray-500 rounded-full"></div>
            ) : (
              <svg className="h-4 w-4 mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
            Refresh
          </button>
        </div>
        {lastRefresh && (
          <p className="mt-2 text-xs text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </p>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription plan banner with quick upgrade CTA */}
      <div className={`rounded-lg p-4 ${
        subscriptionData.plan_type === 'free' ? 'bg-indigo-50 border border-indigo-200' :
        subscriptionData.plan_type === 'basic' ? 'bg-blue-50 border border-blue-200' :
        subscriptionData.plan_type === 'professional' ? 'bg-purple-50 border border-purple-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className={`p-2 rounded-md ${
              subscriptionData.plan_type === 'free' ? 'bg-indigo-100 text-indigo-700' :
              subscriptionData.plan_type === 'basic' ? 'bg-blue-100 text-blue-700' :
              subscriptionData.plan_type === 'professional' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              <CreditCardIcon className="h-6 w-6" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold">{subscriptionData.plan_type.charAt(0).toUpperCase() + subscriptionData.plan_type.slice(1)} Plan</p>
              <p className="text-sm text-gray-600">
                {subscriptionData.status === 'active' ? 'Your subscription is active' : 'Your subscription needs attention'}
              </p>
            </div>
          </div>
          
          {subscriptionData.plan_type !== 'enterprise' && (
            <button
              onClick={handleUpgradeClick}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                subscriptionData.plan_type === 'free' ? 'bg-indigo-600 hover:bg-indigo-700' :
                subscriptionData.plan_type === 'basic' ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Upgrade Plan
            </button>
          )}
        </div>
        
        {/* Show warning if usage is near limit */}
        {(subscriptionData.usage.messages.percentage >= 80 || 
         subscriptionData.usage.users.percentage >= 80 || 
         subscriptionData.usage.storage.percentage >= 80) && (
          <div className="mt-3 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">You're approaching your plan limits</p>
              <p className="text-sm text-yellow-700 mt-1">
                {subscriptionData.usage.messages.percentage >= 80 && 'You\'ve used over 80% of your message limit. '}
                {subscriptionData.usage.users.percentage >= 80 && 'You\'ve reached over 80% of your user limit. '}
                {subscriptionData.usage.storage.percentage >= 80 && 'You\'re using over 80% of your storage limit. '}
                Consider upgrading your plan to avoid service interruptions.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Stats cards grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">Total Conversations</h2>
            <div className="text-xs font-medium text-gray-400">vs. previous day</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.sessions || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.sessions || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(dashboardData.monthly?.total_sessions || 0)} this month
          </p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">Total Messages</h2>
            <div className="text-xs font-medium text-gray-400">vs. previous day</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.messages || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.messages || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(dashboardData.monthly?.total_messages || 0)} this month
          </p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">Active Users</h2>
            <div className="text-xs font-medium text-gray-400">vs. previous day</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.users || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.users || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(subscriptionData.usage?.users?.used || 0)} active this month
          </p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">Search Queries</h2>
            <div className="text-xs font-medium text-gray-400">vs. previous day</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.searches || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.searches || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(dashboardData.monthly?.total_searches || 0)} this month
          </p>
        </div>
      </div>

      {/* Subscription usage section */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Messages usage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">Messages</h3>
              <span className="text-sm text-gray-500">
                {formatNumber(subscriptionData.usage?.messages?.used || 0)} / {formatNumber(subscriptionData.usage?.messages?.limit || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${getUsageColor(subscriptionData.usage?.messages?.percentage || 0)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min((subscriptionData.usage?.messages?.percentage || 0), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {subscriptionData.usage?.messages?.percentage >= 90 ? (
                <span className="text-red-600 font-medium">Critical: Only {formatNumber(subscriptionData.usage?.messages?.limit - subscriptionData.usage?.messages?.used)} messages left!</span>
              ) : subscriptionData.usage?.messages?.percentage >= 80 ? (
                <span className="text-orange-600">Warning: {formatPercentage(subscriptionData.usage?.messages?.percentage)} of your limit used</span>
              ) : (
                `${formatPercentage(subscriptionData.usage?.messages?.percentage)} of your monthly message limit used`
              )}
            </p>
          </div>
          
          {/* Active users usage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">Active Users</h3>
              <span className="text-sm text-gray-500">
                {formatNumber(subscriptionData.usage?.users?.used || 0)} / {formatNumber(subscriptionData.usage?.users?.limit || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${getUsageColor(subscriptionData.usage?.users?.percentage || 0)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min((subscriptionData.usage?.users?.percentage || 0), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {subscriptionData.usage?.users?.percentage >= 90 ? (
                <span className="text-red-600 font-medium">Critical: Only {formatNumber(subscriptionData.usage?.users?.limit - subscriptionData.usage?.users?.used)} users left!</span>
              ) : subscriptionData.usage?.users?.percentage >= 80 ? (
                <span className="text-orange-600">Warning: {formatPercentage(subscriptionData.usage?.users?.percentage)} of your limit used</span>
              ) : (
                `${formatPercentage(subscriptionData.usage?.users?.percentage)} of your monthly active user limit used`
              )}
            </p>
          </div>
          
          {/* Storage usage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">Storage</h3>
              <span className="text-sm text-gray-500">
                {formatBytes(subscriptionData.usage?.storage?.used_bytes || 0)} / {formatBytes(subscriptionData.usage?.storage?.limit_bytes || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${getUsageColor(subscriptionData.usage?.storage?.percentage || 0)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min((subscriptionData.usage?.storage?.percentage || 0), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {subscriptionData.usage?.storage?.percentage >= 90 ? (
                <span className="text-red-600 font-medium">Critical: Only {formatBytes(subscriptionData.usage?.storage?.limit_bytes - subscriptionData.usage?.storage?.used_bytes)} left!</span>
              ) : subscriptionData.usage?.storage?.percentage >= 80 ? (
                <span className="text-orange-600">Warning: {formatPercentage(subscriptionData.usage?.storage?.percentage)} of your limit used</span>
              ) : (
                `${formatPercentage(subscriptionData.usage?.storage?.percentage)} of your storage limit used`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Conversation Trends</h2>
        <div className="h-72">
          <canvas ref={conversationChartRef} id="conversation-chart"></canvas>
        </div>
      </div>
      
      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/knowledge" className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition duration-150">
            <h3 className="font-medium text-gray-900">Manage Knowledge Base</h3>
            <p className="mt-1 text-sm text-gray-500">Upload documents, add FAQs, and organize your knowledge base.</p>
          </a>
          
          <a href="/conversations" className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition duration-150">
            <h3 className="font-medium text-gray-900">View Conversations</h3>
            <p className="mt-1 text-sm text-gray-500">Browse chat history and analyze user interactions.</p>
          </a>
          
          <a href="/test" className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition duration-150">
            <h3 className="font-medium text-gray-900">Test Your Chatbot</h3>
            <p className="mt-1 text-sm text-gray-500">Try out your chatbot and see how it responds to queries.</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;