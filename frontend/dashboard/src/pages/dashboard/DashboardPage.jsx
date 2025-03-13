import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import knowledgeService from '../../services/knowledgeService';
import chatService from '../../services/chatService';

// Register Chart.js components
Chart.register(...registerables);

const DashboardPage = () => {
  const [stats, setStats] = useState({
    totalSessions: 0,
    totalMessages: 0,
    knowledgeUsage: 0,
    responseTimes: []
  });
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Use refs to store chart instances
  const conversationChartRef = useRef(null);
  const knowledgeChartRef = useRef(null);
  const chartInstancesRef = useRef({
    conversationChart: null,
    knowledgeChart: null
  });

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
    
    // Cleanup function to destroy charts when component unmounts
    return () => {
      // Destroy chart instances to prevent memory leaks
      if (chartInstancesRef.current.conversationChart) {
        chartInstancesRef.current.conversationChart.destroy();
      }
      if (chartInstancesRef.current.knowledgeChart) {
        chartInstancesRef.current.knowledgeChart.destroy();
      }
    };
  }, []);

  // Initialize charts when data is available
  useEffect(() => {
    if (!loading && !error) {
      initializeCharts();
    }
  }, [stats, loading, error]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch analytics data
      // This is a placeholder - replace with your actual API calls
      const chatStats = await chatService.getStats();
      const knowledgeStats = await knowledgeService.getDocumentStats();
      
      // Update state with fetched data
      setStats({
        totalSessions: chatStats?.totalSessions || 0,
        totalMessages: chatStats?.totalMessages || 0,
        knowledgeUsage: chatStats?.knowledgeUsage || 0,
        responseTimes: chatStats?.responseTimes || []
      });
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const initializeCharts = () => {
    // Always destroy previous chart instances before creating new ones
    if (chartInstancesRef.current.conversationChart) {
      chartInstancesRef.current.conversationChart.destroy();
    }
    if (chartInstancesRef.current.knowledgeChart) {
      chartInstancesRef.current.knowledgeChart.destroy();
    }
    
    // Get canvas contexts
    const conversationCtx = conversationChartRef.current?.getContext('2d');
    const knowledgeCtx = knowledgeChartRef.current?.getContext('2d');
    
    if (conversationCtx) {
      // Create conversation chart
      chartInstancesRef.current.conversationChart = new Chart(conversationCtx, {
        type: 'line',
        data: {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'],
          datasets: [{
            label: 'Conversations',
            data: [12, 19, 3, 5, 2, 3, 7],
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
      chartInstancesRef.current.knowledgeChart = new Chart(knowledgeCtx, {
        type: 'doughnut',
        data: {
          labels: ['With Knowledge', 'Without Knowledge'],
          datasets: [{
            data: [stats.knowledgeUsage, 100 - stats.knowledgeUsage],
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
          <p className="text-3xl font-bold text-primary-600">{stats.totalSessions}</p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Total Messages</h2>
          <p className="text-3xl font-bold text-primary-600">{stats.totalMessages}</p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-2">Knowledge Usage</h2>
          <p className="text-3xl font-bold text-primary-600">{stats.knowledgeUsage}%</p>
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