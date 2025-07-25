import React from 'react';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

const MetricCard = ({
  title,
  value,
  change = null,
  icon: Icon = null,
  color = 'blue',
  format = 'number',
  subtitle = null,
  className = ''
}) => {
  const colorClasses = {
    blue: {
      icon: 'bg-blue-50 text-blue-600',
      accent: 'text-blue-600'
    },
    green: {
      icon: 'bg-green-50 text-green-600',
      accent: 'text-green-600'
    },
    purple: {
      icon: 'bg-purple-50 text-purple-600',
      accent: 'text-purple-600'
    },
    yellow: {
      icon: 'bg-yellow-50 text-yellow-600',
      accent: 'text-yellow-600'
    },
    red: {
      icon: 'bg-red-50 text-red-600',
      accent: 'text-red-600'
    }
  };

  const formatValue = (val) => {
    if (format === 'number') {
      return new Intl.NumberFormat().format(val);
    }
    if (format === 'percentage') {
      return `${val}%`;
    }
    if (format === 'currency') {
      return new Intl.NumberFormat('en-US', { 
        style: 'currency', 
        currency: 'USD' 
      }).format(val);
    }
    return val;
  };

  const renderChange = () => {
    if (change === null || change === undefined) return null;
    
    const isPositive = change > 0;
    const ChangeIcon = isPositive ? ArrowUpIcon : ArrowDownIcon;
    const colorClass = isPositive ? 'text-green-600' : 'text-red-600';
    
    return (
      <div className={`flex items-center mt-1 ${colorClass}`}>
        <ChangeIcon className="h-4 w-4 mr-1" />
        <span className="text-sm font-medium">
          {Math.abs(change).toFixed(1)}%
        </span>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <div className="flex items-center">
        {Icon && (
          <div className={`p-2 rounded-lg ${colorClasses[color].icon}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div className={Icon ? 'ml-4' : ''}>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-bold text-gray-900">
              {formatValue(value)}
            </p>
            {renderChange()}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default MetricCard;