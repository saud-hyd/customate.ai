import React from 'react';

const EmptyState = ({
  icon: Icon = null,
  title,
  description = null,
  action = null,
  className = ''
}) => {
  return (
    <div className={`text-center py-12 ${className}`}>
      {Icon && (
        <div className="mx-auto mb-4">
          <Icon className="h-12 w-12 text-gray-400" />
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && (
        <div>{action}</div>
      )}
    </div>
  );
};

export default EmptyState;