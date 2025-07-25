// Path: frontend/dashboard/src/components/analytics/EngagementAnalytics.jsx
// Usage: Simple coming soon page for engagement analytics

import React from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';

const EngagementAnalytics = ({ data, dateRange }) => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-6">
          <HeartIcon className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Engagement Analytics</h2>
        <p className="text-lg text-purple-600 font-medium mb-4">Coming Soon</p>
        <p className="text-gray-500 max-w-sm mx-auto">
          Track user engagement patterns and conversation quality to improve your chatbot's performance.
        </p>
      </div>
    </div>
  );
};

export default EngagementAnalytics;