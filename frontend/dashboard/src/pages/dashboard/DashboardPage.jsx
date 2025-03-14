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
  
  // Chart references
  const conversationChartRef = useRef(null);
  const knowledgeChartRef = useRef(null);
  const chartInstancesRef = useRef({
    conversationChart: null,
    knowledgeChart: null
  });

  useEffect(() => {
    fetchDashboardData();
    
    // Cleanup charts when component unmounts
    return () => {
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
      
      // Fetch dashboard overview data
      const overviewData = await analyticsService.getDashboardOverview();
      
      // Fetch chat performance data for trends
      const chatData = await analyticsService.getChatPerformance(30);
      
      // Fetch knowledge usage data
      const knowledgeData = await analyticsService.getKnowledgeUsage(30);
      
      // Combine all data
      setDashboardData({
        ...overviewData,
        chatTrends: chatData.time_series || [],
        knowledgeUsage: knowledgeData
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
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

  if (loading) {
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
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Overview of your chatbot performance and knowledge base usage.
        </p>
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
    </div>
  );
};

export default DashboardPage;