import React from 'react';

/**
 * Card component for content sections
 * 
 * @param {Object} props
 * @param {React.ReactNode} [props.title] - Card title
 * @param {React.ReactNode} [props.subtitle] - Card subtitle
 * @param {React.ReactNode} props.children - Card content
 * @param {React.ReactNode} [props.footer] - Card footer content
 * @param {React.ReactNode} [props.actionButton] - Action button in the header
 * @param {string} [props.className] - Additional class names for the card
 * @param {string} [props.headerClassName] - Additional class names for the header
 * @param {string} [props.bodyClassName] - Additional class names for the body
 * @param {string} [props.footerClassName] - Additional class names for the footer
 */
const Card = ({
  title,
  subtitle,
  children,
  footer,
  actionButton,
  className = '',
  headerClassName = '',
  bodyClassName = '',
  footerClassName = '',
}) => {
  return (
    <div className={`bg-white shadow-sm rounded-lg overflow-hidden ${className}`}>
      {/* Card header (if title or action button is provided) */}
      {(title || actionButton) && (
        <div className={`px-4 py-5 sm:px-6 border-b border-gray-200 ${headerClassName}`}>
          <div className="flex justify-between items-center">
            <div>
              {typeof title === 'string' ? (
                <h3 className="text-lg font-medium leading-6 text-gray-900">{title}</h3>
              ) : (
                title
              )}
              {subtitle && (
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  {subtitle}
                </p>
              )}
            </div>
            {actionButton && (
              <div>{actionButton}</div>
            )}
          </div>
        </div>
      )}
      
      {/* Card body */}
      <div className={`px-4 py-5 sm:p-6 ${bodyClassName}`}>
        {children}
      </div>
      
      {/* Card footer (if provided) */}
      {footer && (
        <div className={`px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200 ${footerClassName}`}>
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;