// src/components/common/Card.jsx
import React from 'react';

/**
 * Card component for displaying content in a container with consistent styling
 * Used throughout the dashboard for containing related information
 */
const Card = ({
  children,
  title,
  subtitle,
  footer,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
  padding = true,
}) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${className}`}>
      {(title || subtitle) && (
        <div className={`border-b border-gray-200 ${padding ? 'px-6 py-4' : ''} ${headerClassName}`}>
          {title && <h3 className="text-lg font-medium text-gray-900">{title}</h3>}
          {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}
      
      <div className={`${padding ? 'p-6' : ''} ${bodyClassName}`}>
        {children}
      </div>
      
      {footer && (
        <div className={`border-t border-gray-200 ${padding ? 'px-6 py-4' : ''} ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;