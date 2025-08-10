// Path: frontend/dashboard/src/components/common/LoadingOverlay.jsx
// Usage: Overlay component for forms and containers that need loading states

import React from 'react';
import LoadingScreen from './LoadingScreen';

/**
 * LoadingOverlay component for wrapping content with conditional loading state
 * 
 * @param {Object} props
 * @param {boolean} props.isLoading - Whether to show the loading state
 * @param {React.ReactNode} props.children - Content to display when not loading
 * @param {string} [props.message] - Loading message to display
 * @param {string} [props.className] - Additional classes for the overlay
 * @param {string} [props.size] - Loading screen size
 * @param {boolean} [props.fullScreen=false] - Whether to show full screen loading
 */
const LoadingOverlay = ({ 
  isLoading, 
  children, 
  message = 'Loading...', 
  className = '', 
  size = 'medium',
  fullScreen = false 
}) => {
  if (isLoading) {
    return (
      <LoadingScreen 
        message={message}
        fullScreen={fullScreen}
        size={size}
        className={className}
      />
    );
  }

  return children;
};

export default LoadingOverlay;