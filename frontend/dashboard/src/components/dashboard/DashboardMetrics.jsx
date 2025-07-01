// Path: frontend/dashboard/src/components/dashboard/DashboardMetrics.jsx
// Usage: Reusable metrics component for displaying KPIs with trends and status indicators

import React from 'react';
import { 
  ArrowUpIcon, 
  ArrowDownIcon, 
  MinusIcon,
  InformationCircleIcon 
} from '@heroicons/react/24/outline';

const DashboardMetrics = ({ 
  title, 
  value, 
  subtitle,
  change,
  icon: Icon,
  color = 'blue',
  loading = false,
  tooltip,
  format = 'number'
}) => {
  
  const formatValue = (val, type) => {
    if (loading || val === null || val === undefined) return '—';
    
    switch (type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(val);
      
      case 'percentage':
        return `${val.toFixed(1)}%`;
      
      case 'duration':
        if (val < 1000) return `${val.toFixed(0)}ms`;
        return `${(val / 1000).toFixed(1)}s`;
      
      case 'compact':
        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}M`;
        if (val >= 1000) return `${(val / 1000).toFixed(1)}K`;
        return val.toLocaleString();
      
      default:
        return val.toLocaleString();
    }
  };

  const getTrendIndicator = (changeValue) => {
    if (!changeValue || changeValue === 0) {
      return (
        <span className="inline-flex items-center text-gray-500">
          <MinusIcon className="h-3 w-3 mr-1" />
          0%
        </span>
      );
    }

    const isPositive = changeValue > 0;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    const TrendIcon = isPositive ? ArrowUpIcon : ArrowDownIcon;

    return (
      <span className={`inline-flex items-center ${colorClass}`}>
        <TrendIcon className="h-3 w-3 mr-1" />
        {Math.abs(changeValue).toFixed(1)}%
      </span>
    );
  };

  const getColorClasses = (colorName) => {
    const colors = {
      blue: {
        icon: 'text-blue-600',
        bg: 'bg-blue-50',
        border: 'border-blue-200'
      },
      green: {
        icon: 'text-green-600',
        bg: 'bg-green-50',
        border: 'border-green-200'
      },
      purple: {
        icon: 'text-purple-600',
        bg: 'bg-purple-50',
        border: 'border-purple-200'
      },
      orange: {
        icon: 'text-orange-600',
        bg: 'bg-orange-50',
        border: 'border-orange-200'
      },
      red: {
        icon: 'text-red-600',
        bg: 'bg-red-50',
        border: 'border-red-200'
      }
    };
    
    return colors[colorName] || colors.blue;
  };

  const colorClasses = getColorClasses(color);

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          {Icon && (
            <div className={`flex-shrink-0 p-2 ${colorClasses.bg} rounded-lg`}>
              <Icon className={`h-6 w-6 ${colorClasses.icon}`} />
            </div>
          )}
          <div className={Icon ? 'ml-4' : ''}>
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-700">{title}</p>
              {tooltip && (
                <div className="ml-2 group relative">
                  <InformationCircleIcon className="h-4 w-4 text-gray-400 cursor-help" />
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                    {tooltip}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                  </div>
                </div>
              )}
            </div>
            {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
          </div>
        </div>
        
        {change !== undefined && (
          <div className="text-sm font-medium">
            {getTrendIndicator(change)}
          </div>
        )}
      </div>

      <div className="mt-4">
        {loading ? (
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        ) : (
          <p className="text-3xl font-bold text-gray-900">
            {formatValue(value, format)}
          </p>
        )}
      </div>
    </div>
  );
};

// Metrics Grid Component for consistent layout
export const MetricsGrid = ({ children, columns = 4 }) => {
  const gridCols = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5',
    6: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-6`}>
      {children}
    </div>
  );
};

// Status Badge Component
export const StatusBadge = ({ status, label }) => {
  const statusStyles = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    danger: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    neutral: 'bg-gray-100 text-gray-800 border-gray-200'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusStyles[status] || statusStyles.neutral}`}>
      {label}
    </span>
  );
};

// Performance Indicator Component
export const PerformanceIndicator = ({ value, threshold = 80, format = 'percentage' }) => {
  const getStatus = (val, thresh) => {
    if (val >= thresh) return 'success';
    if (val >= thresh * 0.7) return 'warning';
    return 'danger';
  };

  const status = getStatus(value, threshold);
  const formatValue = (val) => {
    if (format === 'percentage') return `${val.toFixed(1)}%`;
    if (format === 'duration') return `${val.toFixed(0)}ms`;
    return val.toLocaleString();
  };

  return (
    <div className="flex items-center space-x-2">
      <span className="text-lg font-semibold">
        {formatValue(value)}
      </span>
      <StatusBadge 
        status={status} 
        label={
          status === 'success' ? 'Excellent' :
          status === 'warning' ? 'Good' : 'Needs Attention'
        } 
      />
    </div>
  );
};

export default DashboardMetrics;