// Path: frontend/dashboard/src/components/analytics/EngagementAnalytics.jsx
// Usage: Simple coming soon page for engagement analytics

import React from 'react';
import { HeartIcon } from '@heroicons/react/24/outline';
import { useTranslation } from 'react-i18next';

const EngagementAnalytics = ({ data, dateRange }) => {
  const { t } = useTranslation('analytics');
  
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-purple-100 mb-6">
          <HeartIcon className="h-8 w-8 text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t('engagement.title')}</h2>
        <p className="text-lg text-purple-600 font-medium mb-4">{t('comingSoon')}</p>
        <p className="text-gray-500 max-w-sm mx-auto">
          {t('engagement.description')}
        </p>
      </div>
    </div>
  );
};

export default EngagementAnalytics;