import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import analyticsService from '../../services/analyticsService';

/**
 * MessageStats component for displaying message metrics
 * Shows volume, response times, and knowledge usage metrics for the chatbot
 * Used in the analytics dashboard to monitor chatbot performance
 */
const MessageStats = () => {
  const [statsData, setStatsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('volume'); // volume, responseTime, knowledge

  useEffect(() => {
    const fetchStatsData = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getChatPerformance();
        setStatsData(data);
      } catch (err) {
        console.error('Error fetching message stats:', err);
        setError('Failed to load message statistics');
      } finally {
        setLoading(false);
      }
    };

    fetchStatsData();
  }, []);

  const renderChart = () => {
    if (!statsData?.time_series || statsData.time_series.length === 0) {
      return (
        <div className="flex justify-center items-center h-64 bg-gray-50 rounded-md">
          <p className="text-gray-500">No data available</p>
        </div>
      );
    }

    if (viewMode === 'volume') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={statsData.time_series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar name="Total Messages" dataKey="total_messages" fill="#4f46e5" />
            <Bar name="Total Sessions" dataKey="total_sessions" fill="#7c3aed" />
          </BarChart>
        </ResponsiveContainer>
      );
    } else if (viewMode === 'responseTime') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={statsData.time_series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip formatter={(value) => `${value.toFixed(2)} ms`} />
            <Legend />
            <Line 
              name="Average Response Time" 
              type="monotone" 
              dataKey="average_response_time_ms" 
              stroke="#06b6d4" 
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      );
    } else if (viewMode === 'knowledge') {
      return (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={statsData.time_series}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
            <Line 
              name="Knowledge Usage Ratio" 
              type="monotone" 
              dataKey="knowledge_usage_ratio" 
              stroke="#10b981" 
              activeDot={{ r: 8 }} 
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }
  };

  if (loading) {
    return (
      <Card title="Message Statistics">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </Card>
    );
  }

  if (error || !statsData) {
    return (
      <Card title="Message Statistics">
        <div className="bg-red-50 p-4 rounded-md">
          <p className="text-red-800">{error || 'No message statistics available'}</p>
        </div>
      </Card>
    );
  }

  const { summary } = statsData;

  return (
    <Card title="Message Statistics">
      <div className="mb-6 flex justify-center">
        <div className="flex bg-gray-100 p-1 rounded-md">
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'volume' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setViewMode('volume')}
          >
            Volume
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'responseTime' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setViewMode('responseTime')}
          >
            Response Time
          </button>
          <button
            className={`px-4 py-2 text-sm font-medium rounded-md ${
              viewMode === 'knowledge' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setViewMode('knowledge')}
          >
            Knowledge Usage
          </button>
        </div>
      </div>

      {renderChart()}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500">Total Messages</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">{summary.total_messages.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">
            Avg. {summary.messages_per_session.toFixed(1)} messages per session
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500">Response Time</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.avg_response_time_ms?.toFixed(1) || 'N/A'} ms
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Range: {summary.min_response_time_ms?.toFixed(1) || 'N/A'} - {summary.max_response_time_ms?.toFixed(1) || 'N/A'} ms
          </p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-gray-500">Knowledge Usage</h4>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {summary.knowledge_usage_percentage?.toFixed(1) || '0'}%
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Percentage of responses using knowledge base
          </p>
        </div>
      </div>
    </Card>
  );
};

export default MessageStats;