// Path: frontend/dashboard/src/components/analytics/VoiceAnalytics.jsx
// Usage: Displays voice conversation analytics including call volumes, durations, and quality metrics

import React, { useState, useEffect } from 'react';
import { 
  PhoneIcon, 
  ClockIcon, 
  SignalIcon,
  UserGroupIcon,
  TrendingUpIcon,
  TrendingDownIcon
} from '@heroicons/react/24/outline';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import LoadingState from '../common/LoadingState';
import { DashboardMetrics, MetricsGrid, PerformanceIndicator } from '../dashboard/DashboardMetrics';
import telephonyService from '../../services/telephonyService';

const VoiceAnalytics = ({ timeRange = 30 }) => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchVoiceAnalytics();
  }, [timeRange]);

  const fetchVoiceAnalytics = async () => {
    try {
      setLoading(true);
      const data = await telephonyService.getVoiceAnalytics(timeRange);
      setAnalyticsData(data);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch voice analytics:', err);
      setError('Failed to load voice analytics');
      
      // Mock data for development
      setAnalyticsData({
        summary: {
          total_calls: 156,
          total_minutes: 1340,
          average_duration: 8.6,
          completion_rate: 89.1,
          call_quality_average: 4.2,
          unique_callers: 98
        },
        changes: {
          total_calls: 12.5,
          total_minutes: 15.3,
          average_duration: -2.1,
          completion_rate: 1.2
        },
        call_volume_trend: [
          { date: '2025-01-17', calls: 8, minutes: 65 },
          { date: '2025-01-18', calls: 12, minutes: 98 },
          { date: '2025-01-19', calls: 15, minutes: 134 },
          { date: '2025-01-20', calls: 10, minutes: 87 },
          { date: '2025-01-21', calls: 18, minutes: 156 },
          { date: '2025-01-22', calls: 14, minutes: 112 },
          { date: '2025-01-23', calls: 16, minutes: 142 }
        ],
        quality_distribution: [
          { quality: 'Excellent', count: 89, percentage: 57.1 },
          { quality: 'Good', count: 42, percentage: 26.9 },
          { quality: 'Fair', count: 18, percentage: 11.5 },
          { quality: 'Poor', count: 7, percentage: 4.5 }
        ],
        hourly_distribution: [
          { hour: 0, calls: 2 }, { hour: 1, calls: 1 }, { hour: 2, calls: 0 },
          { hour: 3, calls: 1 }, { hour: 4, calls: 0 }, { hour: 5, calls: 1 },
          { hour: 6, calls: 3 }, { hour: 7, calls: 8 }, { hour: 8, calls: 12 },
          { hour: 9, calls: 18 }, { hour: 10, calls: 22 }, { hour: 11, calls: 19 },
          { hour: 12, calls: 15 }, { hour: 13, calls: 17 }, { hour: 14, calls: 20 },
          { hour: 15, calls: 16 }, { hour: 16, calls: 14 }, { hour: 17, calls: 12 },
          { hour: 18, calls: 8 }, { hour: 19, calls: 6 }, { hour: 20, calls: 4 },
          { hour: 21, calls: 3 }, { hour: 22, calls: 2 }, { hour: 23, calls: 1 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading voice analytics..." />;
  }

  if (error && !analyticsData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchVoiceAnalytics}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const { summary, changes, call_volume_trend, quality_distribution, hourly_distribution } = analyticsData;

  // Colors for quality distribution
  const qualityColors = {
    'Excellent': '#10B981',
    'Good': '#3B82F6', 
    'Fair': '#F59E0B',
    'Poor': '#EF4444'
  };

  const formatHour = (hour) => {
    if (hour === 0) return '12 AM';
    if (hour === 12) return '12 PM';
    if (hour < 12) return `${hour} AM`;
    return `${hour - 12} PM`;
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <MetricsGrid columns={3}>
        <DashboardMetrics
          title="Total Calls"
          value={summary.total_calls}
          icon={PhoneIcon}
          format="number"
          change={changes.total_calls}
          color="green"
        />
        
        <DashboardMetrics
          title="Talk Time"
          value={summary.total_minutes}
          icon={ClockIcon}
          format="custom"
          formatFn={(val) => formatDuration(val)}
          change={changes.total_minutes}
          color="green"
        />
        
        <DashboardMetrics
          title="Avg Duration"
          value={summary.average_duration}
          icon={ClockIcon}
          format="custom"
          formatFn={(val) => `${val.toFixed(1)}m`}
          change={changes.average_duration}
          color="green"
        />
      </MetricsGrid>

      {/* Performance Indicators */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Voice Performance</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Completion Rate</h4>
            <PerformanceIndicator 
              value={summary.completion_rate} 
              threshold={85} 
              format="percentage" 
            />
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Call Quality</h4>
            <div className="flex items-center justify-center space-x-2">
              <span className="text-2xl font-bold text-green-600">
                {summary.call_quality_average.toFixed(1)}
              </span>
              <div className="flex space-x-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <SignalIcon 
                    key={star}
                    className={`w-5 h-5 ${
                      star <= summary.call_quality_average 
                        ? 'text-green-500' 
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Unique Callers</h4>
            <div className="flex items-center justify-center space-x-2">
              <UserGroupIcon className="w-6 h-6 text-blue-500" />
              <span className="text-2xl font-bold text-blue-600">
                {summary.unique_callers}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Call Volume Trend */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Call Volume Trend</h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={call_volume_trend}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(date) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            />
            <YAxis />
            <Tooltip 
              labelFormatter={(date) => new Date(date).toLocaleDateString()}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="calls" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Calls"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="minutes" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Minutes"
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Quality Distribution & Hourly Patterns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quality Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Call Quality Distribution</h3>
          
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={quality_distribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ quality, percentage }) => `${quality} (${percentage}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {quality_distribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={qualityColors[entry.quality]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>

          <div className="mt-4 space-y-2">
            {quality_distribution.map((item) => (
              <div key={item.quality} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: qualityColors[item.quality] }}
                  />
                  <span>{item.quality}</span>
                </div>
                <span className="font-medium">{item.count} calls</span>
              </div>
            ))}
          </div>
        </div>

        {/* Hourly Distribution */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Calls by Hour</h3>
          
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={hourly_distribution}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="hour" 
                tickFormatter={formatHour}
                interval={2}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(hour) => formatHour(hour)}
                formatter={(value) => [value, 'Calls']}
              />
              <Bar 
                dataKey="calls" 
                fill="#10B981" 
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">
            ⚠️ {error} - Showing sample data for demonstration
          </p>
        </div>
      )}
    </div>
  );
};

export default VoiceAnalytics;