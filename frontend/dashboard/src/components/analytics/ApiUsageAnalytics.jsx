// Path: frontend/dashboard/src/components/analytics/ApiUsageAnalytics.jsx
// Usage: Simple coming soon page for API usage analytics

import React from 'react';
import { ChartBarIcon } from '@heroicons/react/24/outline';

const ApiUsageAnalytics = ({ data, dateRange }) => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
          <ChartBarIcon className="h-8 w-8 text-blue-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">API Usage Analytics</h2>
        <p className="text-lg text-blue-600 font-medium mb-4">Coming Soon</p>
        <p className="text-gray-500 max-w-sm mx-auto">
          We're working on detailed API usage analytics to help you monitor and optimize your API consumption.
        </p>
      </div>
    </div>
  );
};

export default ApiUsageAnalytics;