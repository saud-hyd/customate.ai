// src/components/analytics/UsageChart.jsx
import React, { useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Card from '../common/Card';
import Button from '../common/Button';

/**
 * Usage chart component for analytics dashboard
 * Displays user engagement and platform usage metrics
 */
const UsageChart = ({ data, title, subtitle, type = 'line', dataKeys = [], colors = [], className = '' }) => {
  const [timeRange, setTimeRange] = useState('month'); // month, week, day
  
  const renderChart = () => {
    if (type === 'line') {
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index % colors.length] || '#8884d8'}
              activeDot={{ r: 8 }}
            />
          ))}
        </LineChart>
      );
    } else if (type === 'bar') {
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" />
          <YAxis />
          <Tooltip />
          <Legend />
          {dataKeys.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={colors[index % colors.length] || '#8884d8'}
            />
          ))}
        </BarChart>
      );
    }
    
    return null;
  };
  
  return (
    <Card 
      title={title}
      subtitle={subtitle}
      className={className}
      headerClassName="flex justify-between items-center"
      title={
        <div className="flex justify-between w-full items-center">
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant={timeRange === 'day' ? 'primary' : 'outline'}
              onClick={() => setTimeRange('day')}
            >
              Day
            </Button>
            <Button
              size="sm"
              variant={timeRange === 'week' ? 'primary' : 'outline'}
              onClick={() => setTimeRange('week')}
            >
              Week
            </Button>
            <Button
              size="sm"
              variant={timeRange === 'month' ? 'primary' : 'outline'}
              onClick={() => setTimeRange('month')}
            >
              Month
            </Button>
          </div>
        </div>
      }
    >
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {renderChart()}
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default UsageChart;