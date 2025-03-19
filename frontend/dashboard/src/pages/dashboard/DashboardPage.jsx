// frontend/dashboard/src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'chart.js/auto';
import analyticsService from '../../services/analyticsService';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    today: {
      sessions: 0,
      messages: 0,
      searches: 0,
      users: 0,
      knowledge_usage_ratio: 0
    },
    monthly: {
      total_sessions: 0,
      total_messages: 0,
      total_searches: 0,
      avg_knowledge_usage_ratio: 0
    },
    time_series: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  
  // Chart references
  const conversationChartRef = useRef(null);
  const knowledgeChartRef = useRef(null);
  const chartInstancesRef = useRef({
    conversationChart: null,
    knowledgeChart: null
  });

  useEffect(() => {
    // Initial data fetch
    fetchDashboardData();
    
    // Set up auto-refresh every 30 seconds
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      fetchDashboardData();
    }, 30000);
    
    // Cleanup charts and interval when component unmounts
    return () => {
      clearInterval(refreshInterval);
      
      if (chartInstancesRef.current.conversationChart) {
        chartInstancesRef.current.conversationChart.destroy();
      }
      if (chartInstancesRef.current.knowledgeChart) {
        chartInstancesRef.current.knowledgeChart.destroy();
      }
    };
  }, []);

  // Update charts when data changes
  useEffect(() => {
    if (!loading && !error) {
      initializeCharts();
    }
  }, [dashboardData, loading, error]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to reset analytics, but continue even if it fails
      try {
        if (!lastRefresh || (new Date() - lastRefresh) > 5 * 60 * 1000) { // Every 5 minutes
          console.log('Resetting analytics data...');
          await analyticsService.resetAnalytics();
        }
      } catch (resetError) {
        console.warn('Failed to reset analytics, continuing with fetch:', resetError);
      }
      
      // Fetch dashboard overview data
      console.log('Fetching dashboard overview...');
      const overviewData = await analyticsService.getDashboardOverview();
      console.log('Dashboard overview data:', overviewData);
      
      // Fetch chat performance data for trends
      console.log('Fetching chat performance...');
      const chatData = await analyticsService.getChatPerformance(30);
      console.log('Chat performance data:', chatData);
      
      // Fetch knowledge usage data
      console.log('Fetching knowledge usage...');
      const knowledgeData = await analyticsService.getKnowledgeUsage(30);
      console.log('Knowledge usage data:', knowledgeData);
      
      // Update last refresh timestamp
      setLastRefresh(new Date());
      
      // Combine all data
      setDashboardData({
        ...overviewData,
        chatTrends: chatData.time_series || [],
        knowledgeUsage: knowledgeData
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const initializeCharts = () => {
    // Destroy existing charts to prevent memory leaks
    if (chartInstancesRef.current.conversationChart) {
      chartInstancesRef.current.conversationChart.destroy();
    }
    if (chartInstancesRef.current.knowledgeChart) {
      chartInstancesRef.current.knowledgeChart.destroy();
    }
    
    // Get contexts for charts
    const conversationCtx = conversationChartRef.current?.getContext('2d');
    const knowledgeCtx = knowledgeChartRef.current?.getContext('2d');
    
    if (conversationCtx && dashboardData.chatTrends) {
      // Format data for conversation trends chart
      const labels = dashboardData.chatTrends.map(item => {
        const date = new Date(item.date);
        return date.toLocaleDateString('default', { month: 'short', day: 'numeric' });
      });
      
      const data = dashboardData.chatTrends.map(item => item.total_sessions || 0);
      
      // Create conversation chart
      chartInstancesRef.current.conversationChart = new Chart(conversationCtx, {
        type: 'line',
        data: {
          labels: labels,
          datasets: [{
            label: 'Conversations',
            data: data,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.1)',
            tension: 0.3,
            fill: true
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          }
        }
      });
    }
    
    if (knowledgeCtx) {
      // Create knowledge usage chart
      const knowledgeRatio = dashboardData.monthly?.avg_knowledge_usage_ratio || 0;
      
      chartInstancesRef.current.knowledgeChart = new Chart(knowledgeCtx, {
        type: 'doughnut',
        data: {
          labels: ['With Knowledge', 'Without Knowledge'],
          datasets: [{
            data: [knowledgeRatio, 100 - knowledgeRatio],
            backgroundColor: ['#4f46e5', '#e5e7eb'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'bottom'
            }
          }
        }
      });
    }
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
              Overview of your chatbot performance and knowledge base usage.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Total Conversations</h2>
          <p className="text-3xl font-bold text-primary-600">{dashboardData.monthly?.total_sessions || 0}</p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Total Messages</h2>
          <p className="text-3xl font-bold text-primary-600">{dashboardData.monthly?.total_messages || 0}</p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Knowledge Usage</h2>
          <p className="text-3xl font-bold text-primary-600">
            {Math.round(dashboardData.monthly?.avg_knowledge_usage_ratio || 0)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Conversation Trends</h2>
          <div className="h-64">
            <canvas ref={conversationChartRef} id="conversation-chart"></canvas>
          </div>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Knowledge Base Usage</h2>
          <div className="h-64">
            <canvas ref={knowledgeChartRef} id="knowledge-chart"></canvas>
          </div>
        </div>
      </div>
      
      {/* Debug Information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="mt-8 p-4 bg-gray-100 rounded-lg">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Debug Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p><strong>Last fetched:</strong> {lastRefresh ? lastRefresh.toISOString() : 'Never'}</p>
              <p><strong>Monthly Sessions:</strong> {dashboardData.monthly?.total_sessions || 0}</p>
              <p><strong>Monthly Messages:</strong> {dashboardData.monthly?.total_messages || 0}</p>
              <p><strong>Knowledge Usage:</strong> {dashboardData.monthly?.avg_knowledge_usage_ratio || 0}%</p>
            </div>
            <div>
              <p><strong>Chat Trends Count:</strong> {dashboardData.chatTrends?.length || 0}</p>
              <p><strong>Today's Sessions:</strong> {dashboardData.today?.sessions || 0}</p>
              <p><strong>Today's Messages:</strong> {dashboardData.today?.messages || 0}</p>
              <p><strong>API Status:</strong> {error ? 'Error' : 'OK'}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;