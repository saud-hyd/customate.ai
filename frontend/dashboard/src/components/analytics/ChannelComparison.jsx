// Path: frontend/dashboard/src/components/analytics/ChannelComparison.jsx
// Usage: Compares performance between text and voice channels with side-by-side metrics

import React, { useState, useEffect } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  PhoneIcon,
  TrendingUpIcon,
  TrendingDownIcon,
  ClockIcon,
  UserGroupIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import LoadingState from '../common/LoadingState';
import analyticsService from '../../services/analyticsService';
import telephonyService from '../../services/telephonyService';

const ChannelComparison = ({ timeRange = 30 }) => {
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMetric, setSelectedMetric] = useState('volume');

  useEffect(() => {
    fetchComparisonData();
  }, [timeRange]);

  const fetchComparisonData = async () => {
    try {
      setLoading(true);
      
      // Fetch both text and voice analytics
      const [textData, voiceData] = await Promise.all([
        analyticsService.getChatPerformance(timeRange),
        telephonyService.getVoiceAnalytics(timeRange)
      ]);

      // Combine and process data
      const combinedData = processComparisonData(textData, voiceData);
      setComparisonData(combinedData);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch comparison data:', err);
      setError('Failed to load channel comparison');
      
      // Mock data for development
      setComparisonData({
        summary: {
          text: {
            total_interactions: 1847,
            unique_users: 342,
            avg_session_duration: 4.2,
            satisfaction_score: 4.1,
            resolution_rate: 87.3
          },
          voice: {
            total_interactions: 156,
            unique_users: 98,
            avg_session_duration: 8.6,
            satisfaction_score: 4.4,
            resolution_rate: 89.1
          }
        },
        trends: {
          daily: [
            { date: '2025-01-17', text_interactions: 62, voice_interactions: 8 },
            { date: '2025-01-18', text_interactions: 58, voice_interactions: 12 },
            { date: '2025-01-19', text_interactions: 71, voice_interactions: 15 },
            { date: '2025-01-20', text_interactions: 64, voice_interactions: 10 },
            { date: '2025-01-21', text_interactions: 69, voice_interactions: 18 },
            { date: '2025-01-22', text_interactions: 67, voice_interactions: 14 },
            { date: '2025-01-23', text_interactions: 73, voice_interactions: 16 }
          ]
        },
        performance: {
          response_time: {
            text: { avg: 1.2, trend: -5.2 },
            voice: { avg: 2.8, trend: -8.1 }
          },
          user_satisfaction: {
            text: { avg: 4.1, trend: 2.3 },
            voice: { avg: 4.4, trend: 1.8 }
          },
          conversion_rate: {
            text: { avg: 23.4, trend: 4.1 },
            voice: { avg: 31.2, trend: 6.7 }
          }
        }
      });
    } finally {
      setLoading(false);
    }
  };

  const processComparisonData = (textData, voiceData) => {
    // Process and normalize data from both sources
    return {
      summary: {
        text: {
          total_interactions: textData.summary?.total_messages || 0,
          unique_users: textData.summary?.total_sessions || 0,
          avg_session_duration: textData.summary?.messages_per_session || 0,
          satisfaction_score: 4.1, // Mock - would come from satisfaction surveys
          resolution_rate: 87.3 // Mock - would come from resolution tracking
        },
        voice: {
          total_interactions: voiceData.summary?.total_calls || 0,
          unique_users: voiceData.summary?.unique_callers || 0,
          avg_session_duration: voiceData.summary?.average_duration || 0,
          satisfaction_score: voiceData.summary?.call_quality_average || 0,
          resolution_rate: voiceData.summary?.completion_rate || 0
        }
      },
      trends: {
        daily: combineTimeSeries(textData.time_series, voiceData.call_volume_trend)
      },
      performance: {
        response_time: {
          text: { avg: textData.summary?.avg_response_time_ms / 1000 || 0, trend: 0 },
          voice: { avg: 2.8, trend: 0 } // Mock - would come from voice analytics
        }
      }
    };
  };

  const combineTimeSeries = (textSeries = [], voiceSeries = []) => {
    // Combine time series data from both channels
    const combined = {};
    
    textSeries.forEach(item => {
      combined[item.date] = {
        date: item.date,
        text_interactions: item.total_messages || 0,
        voice_interactions: 0
      };
    });
    
    voiceSeries.forEach(item => {
      if (combined[item.date]) {
        combined[item.date].voice_interactions = item.calls || 0;
      } else {
        combined[item.date] = {
          date: item.date,
          text_interactions: 0,
          voice_interactions: item.calls || 0
        };
      }
    });
    
    return Object.values(combined).sort((a, b) => new Date(a.date) - new Date(b.date));
  };

  const getComparisonMetrics = () => {
    if (!comparisonData) return [];
    
    const { text, voice } = comparisonData.summary;
    
    return [
      {
        id: 'volume',
        label: 'Total Interactions',
        text: { value: text.total_interactions, format: 'number' },
        voice: { value: voice.total_interactions, format: 'number' }
      },
      {
        id: 'users',
        label: 'Unique Users',
        text: { value: text.unique_users, format: 'number' },
        voice: { value: voice.unique_users, format: 'number' }
      },
      {
        id: 'duration',
        label: 'Avg Session',
        text: { value: text.avg_session_duration, format: 'duration', suffix: 'min' },
        voice: { value: voice.avg_session_duration, format: 'duration', suffix: 'min' }
      },
      {
        id: 'satisfaction',
        label: 'Satisfaction',
        text: { value: text.satisfaction_score, format: 'rating' },
        voice: { value: voice.satisfaction_score, format: 'rating' }
      },
      {
        id: 'resolution',
        label: 'Resolution Rate',
        text: { value: text.resolution_rate, format: 'percentage' },
        voice: { value: voice.resolution_rate, format: 'percentage' }
      }
    ];
  };

  const formatValue = (value, format, suffix = '') => {
    switch (format) {
      case 'number':
        return value.toLocaleString();
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'duration':
        return `${value.toFixed(1)}${suffix}`;
      case 'rating':
        return value.toFixed(1);
      default:
        return value.toString();
    }
  };

  const getWinnerIcon = (textValue, voiceValue, higherIsBetter = true) => {
    const textWins = higherIsBetter ? textValue > voiceValue : textValue < voiceValue;
    return textWins ? (
      <TrendingUpIcon className="w-4 h-4 text-blue-500" />
    ) : (
      <TrendingUpIcon className="w-4 h-4 text-green-500" />
    );
  };

  if (loading) {
    return <LoadingState message="Loading channel comparison..." />;
  }

  if (error && !comparisonData) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">{error}</p>
        <button 
          onClick={fetchComparisonData}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  const metrics = getComparisonMetrics();

  return (
    <div className="space-y-6">
      {/* Channel Overview */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-6">Channel Performance Comparison</h3>
        
        <div className="space-y-4">
          {metrics.map((metric) => (
            <div key={metric.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-700">{metric.label}</h4>
                {getWinnerIcon(metric.text.value, metric.voice.value)}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Text Channel */}
                <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-600 font-medium">Text</p>
                    <p className="text-lg font-bold text-blue-800">
                      {formatValue(metric.text.value, metric.text.format, metric.text.suffix)}
                    </p>
                  </div>
                </div>

                {/* Voice Channel */}
                <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <PhoneIcon className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-green-600 font-medium">Voice</p>
                    <p className="text-lg font-bold text-green-800">
                      {formatValue(metric.voice.value, metric.voice.format, metric.voice.suffix)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interaction Trends */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Interaction Trends</h3>
        
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={comparisonData?.trends.daily || []}>
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
              dataKey="text_interactions" 
              stroke="#3B82F6" 
              strokeWidth={2}
              name="Text Interactions"
              dot={{ fill: '#3B82F6', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="voice_interactions" 
              stroke="#10B981" 
              strokeWidth={2}
              name="Voice Interactions"
              dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Performance Insights */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Insights</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <ClockIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <h4 className="font-medium text-gray-900">Response Time</h4>
            <p className="text-sm text-gray-600 mt-1">
              Voice calls typically have longer initial response times but higher engagement
            </p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <StarIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <h4 className="font-medium text-gray-900">User Satisfaction</h4>
            <p className="text-sm text-gray-600 mt-1">
              Voice interactions show higher satisfaction scores due to personal touch
            </p>
          </div>
          
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <UserGroupIcon className="w-8 h-8 mx-auto mb-2 text-gray-600" />
            <h4 className="font-medium text-gray-900">User Preference</h4>
            <p className="text-sm text-gray-600 mt-1">
              Text remains preferred for quick queries, voice for complex issues
            </p>
          </div>
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

export default ChannelComparison;