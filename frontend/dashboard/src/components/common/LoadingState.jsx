// Path: frontend/dashboard/src/components/common/LoadingState.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';

/**
 * Loading State Component
 * Provides a consistent loading experience across the app
 */
const LoadingState = ({ message, size = 'default' }) => {
  const { t } = useTranslation('common');
  const spinnerSize = size === 'small' ? 'h-8 w-8' : 'h-12 w-12';
  const displayMessage = message || t('actions.loading');
  
  return (
    <div className="flex flex-col items-center justify-center py-8">
      <div className={`animate-spin rounded-full ${spinnerSize} border-b-2 border-primary-600 mb-4`}></div>
      <p className="text-gray-700">{displayMessage}</p>
    </div>
  );
};

export default LoadingState;