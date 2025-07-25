// Path: frontend/dashboard/src/components/common/Logo.jsx
// Usage: Reusable logo component used across all dashboard pages, login, register, and navigation

import React from 'react';
import { Link } from 'react-router-dom';

const Logo = ({ 
  size = 'medium', 
  showText = true, 
  variant = 'default', 
  to = '/dashboard',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-6 h-6',
    medium: 'w-8 h-8',
    large: 'w-12 h-12',
    xlarge: 'w-16 h-16'
  };

  const textSizeClasses = {
    small: 'text-lg',
    medium: 'text-xl',
    large: 'text-2xl',
    xlarge: 'text-3xl'
  };

  const containerClasses = {
    default: 'flex items-center space-x-3 group',
    auth: 'flex items-center justify-center space-x-3', // For login/register pages
    sidebar: 'flex items-center space-x-2' // For sidebar navigation
  };

  const LogoContent = () => (
    <>
      <div className={`bg-white rounded-full flex items-center justify-center shadow-md border border-gray-100 group-hover:shadow-lg transition-all duration-300 group-hover:scale-105 ${sizeClasses[size]}`}>
        <img 
          src="/assets/customate-logo.svg" 
          alt="Customate.ai Logo" 
          className={`object-contain ${sizeClasses[size]}`}
        />
      </div>
      {showText && (
        <span className={`font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300 ${textSizeClasses[size]}`}>
          Customate.ai
        </span>
      )}
    </>
  );

  const containerClass = `${containerClasses[variant]} ${className}`;

  // If it's an auth variant (login/register), don't use Link
  if (variant === 'auth') {
    return (
      <div className={containerClass}>
        <LogoContent />
      </div>
    );
  }

  return (
    <Link to={to} className={containerClass}>
      <LogoContent />
    </Link>
  );
};

export default Logo;