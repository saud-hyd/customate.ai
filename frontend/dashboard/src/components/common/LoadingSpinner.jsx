// Path: frontend/dashboard/src/components/common/LoadingSpinner.jsx
// Usage: Loading spinner component with improved styling and no external dependencies

import React from 'react';

/**
 * Loading spinner component
 * 
 * @param {Object} props
 * @param {string} [props.size='md'] - Spinner size: 'sm', 'md', 'lg', 'xl'
 * @param {string} [props.color='primary'] - Spinner color: 'primary', 'secondary', 'white'
 * @param {string} [props.className] - Additional class names
 */
const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary',
  className = '' 
}) => {
  // Size classes
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
    xl: 'h-12 w-12'
  };
  
  // Color classes - using safe Tailwind classes
  const colorClasses = {
    primary: 'border-orange-600',
    secondary: 'border-gray-600',
    white: 'border-white'
  };
  
  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`
          animate-spin rounded-full 
          ${sizeClasses[size] || sizeClasses.md} 
          border-t-2 border-b-2 border-r-2 border-l-2
          ${colorClasses[color] || colorClasses.primary}
          border-l-transparent
        `}
      />
    </div>
  );
};

export default LoadingSpinner;