// src/components/analytics/KnowledgeUsageChart.jsx
import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import Card from '../common/Card';

/**
 * Knowledge usage chart component for analytics dashboard
 * Displays knowledge base usage metrics and distribution
 */
const KnowledgeUsageChart = ({ data, loading = false, className = '' }) => {
  // Default colors
  const COLORS = ['#4f46e5', '#0ea5e9', '#14b8a6', '#f59e0b', '#84cc16', '#ec4899'];
  
  // Format data for pie chart
  const formatData = (data) => {
    if (!data || !data.length) {
      return [
        { name: 'No Data', value: 100 }
      ];
    }
    
    return data.map(item => ({
      name: item.name,
      value: item.count || item.value
    }));
  };
  
  const formattedData = formatData(data);
  
  return (
    <Card 
      title="Knowledge Base Usage" 
      subtitle="Distribution of knowledge base usage across collections"
      className={className}
    >
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={formattedData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {formattedData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} uses`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  );
};

export default KnowledgeUsageChart;