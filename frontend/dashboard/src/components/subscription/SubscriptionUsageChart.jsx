import React from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { formatDate } from '../../utils/formatters';

const SubscriptionUsageChart = ({ data, currentPlan }) => {
  // Transform data for the chart
  const chartData = data.map(item => ({
    date: formatDate(item.date || item.month),
    messages: item.messages_used || item.messages?.used || 0,
    storage: Math.round((item.storage_bytes || item.storage?.used_bytes || 0) / (1024 * 1024)), // Convert to MB
    ...item
  }));

  return (
    <div>
      <h3 className="text-base font-medium text-gray-900 mb-4">Usage History</h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis yAxisId="left" label={{ value: 'Messages', angle: -90, position: 'insideLeft' }} />
            <YAxis yAxisId="right" orientation="right" label={{ value: 'Storage (MB)', angle: 90, position: 'insideRight' }} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="messages"
              name="Messages Used"
              stroke="#8884d8"
              activeDot={{ r: 8 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="storage"
              name="Storage Used (MB)"
              stroke="#82ca9d"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default SubscriptionUsageChart;