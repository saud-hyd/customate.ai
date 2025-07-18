// Path: frontend/dashboard/src/components/analytics/KnowledgeAnalytics.jsx
// Usage: Simple coming soon page for knowledge analytics

import React from 'react';
import { BookOpenIcon } from '@heroicons/react/24/outline';

const KnowledgeAnalytics = ({ data, dateRange }) => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
          <BookOpenIcon className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Knowledge Analytics</h2>
        <p className="text-lg text-green-600 font-medium mb-4">Coming Soon</p>
        <p className="text-gray-500 max-w-sm mx-auto">
          Discover insights about your knowledge base performance and content effectiveness.
        </p>
      </div>
    </div>
  );
};

export default KnowledgeAnalytics;