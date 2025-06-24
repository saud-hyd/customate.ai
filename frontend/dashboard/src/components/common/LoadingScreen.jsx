// Path: frontend/dashboard/src/components/common/LoadingScreen.jsx
// Usage: Loading screen component with animated logo for app initialization, route changes, and async operations

import React from 'react';
import Logo from './Logo';

const LoadingScreen = ({ 
  message = 'Loading...', 
  fullScreen = true, 
  size = 'large',
  className = '' 
}) => {
  const containerClasses = fullScreen 
    ? 'fixed inset-0 z-50 flex items-center justify-center bg-white' 
    : `flex items-center justify-center p-8 ${className}`;

  return (
    <div className={containerClasses}>
      <div className="text-center">
        {/* Animated Logo */}
        <div className="relative">
          <div className="animate-pulse">
            <Logo 
              size={size} 
              showText={true} 
              variant="auth" 
            />
          </div>
          
          {/* Rotating border animation */}
          <div className="absolute inset-0 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin"></div>
        </div>

        {/* Loading message */}
        <div className="mt-6">
          <p className="text-sm font-medium text-gray-600 animate-pulse">
            {message}
          </p>
          
          {/* Loading dots */}
          <div className="flex justify-center items-center mt-3 space-x-1">
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>

        {/* Progress bar (optional) */}
        <div className="mt-6 w-64 bg-gray-200 rounded-full h-1.5">
          <div className="bg-orange-600 h-1.5 rounded-full animate-pulse" style={{ width: '60%' }}></div>
        </div>
      </div>
    </div>
  );
};

// Skeleton loader variant for content loading
export const SkeletonLoader = ({ 
  lines = 3, 
  showLogo = false, 
  className = '' 
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {showLogo && (
        <div className="flex items-center mb-6">
          <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
          <div className="ml-3 h-4 bg-gray-200 rounded w-32"></div>
        </div>
      )}
      
      <div className="space-y-3">
        {Array.from({ length: lines }).map((_, index) => (
          <div key={index} className="grid grid-cols-3 gap-4">
            <div className="h-4 bg-gray-200 rounded col-span-2"></div>
            <div className="h-4 bg-gray-200 rounded col-span-1"></div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Spinner component with logo
export const LogoSpinner = ({ 
  size = 'medium', 
  className = '' 
}) => {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="relative">
        <Logo 
          size={size} 
          showText={false} 
          variant="auth" 
        />
        <div className="absolute inset-0 rounded-full border-2 border-orange-200 border-t-orange-600 animate-spin"></div>
      </div>
    </div>
  );
};

// Page transition loader
export const PageTransition = ({ isLoading }) => {
  if (!isLoading) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-1 bg-orange-600 animate-pulse"></div>
      <div 
        className="h-1 bg-orange-400 transition-all duration-300 ease-out"
        style={{ 
          width: isLoading ? '70%' : '100%',
          transition: isLoading ? 'width 2s ease-out' : 'width 0.3s ease-out'
        }}
      ></div>
    </div>
  );
};

export default LoadingScreen;