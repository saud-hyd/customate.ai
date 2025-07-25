import React from 'react';
import { Link } from 'react-router-dom';

/**
 * Button component with multiple variants and sizes
 * 
 * @param {Object} props
 * @param {string} [props.variant='primary'] - Button style variant
 * @param {string} [props.size='md'] - Button size
 * @param {boolean} [props.fullWidth=false] - Whether button should take full width
 * @param {string} [props.to] - Link path (for Link buttons)
 * @param {boolean} [props.disabled=false] - Whether button is disabled
 * @param {string} [props.type='button'] - Button type attribute
 * @param {Function} [props.onClick] - Click handler
 * @param {React.ReactNode} props.children - Button content
 * @param {string} [props.className] - Additional classes
 */
const Button = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  to,
  disabled = false,
  type = 'button',
  onClick,
  children,
  className = '',
  ...rest
}) => {
  // Base button styles
  const baseClasses = 'inline-flex items-center justify-center border font-medium rounded-md focus:outline-none transition duration-150 ease-in-out';
  
  // Size classes
  const sizeClasses = {
    xs: 'px-2.5 py-1.5 text-xs',
    sm: 'px-3 py-2 text-sm leading-4',
    md: 'px-4 py-2 text-sm',
    lg: 'px-4 py-2 text-base',
    xl: 'px-6 py-3 text-base'
  };
  
  // Variant classes (when not disabled)
  const variantClasses = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    secondary: 'bg-purple-600 text-white hover:bg-purple-700 border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-purple-500',
    success: 'bg-green-600 text-white hover:bg-green-700 border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
    warning: 'bg-yellow-500 text-white hover:bg-yellow-600 border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500',
    info: 'bg-blue-500 text-white hover:bg-blue-600 border-transparent focus:ring-2 focus:ring-offset-2 focus:ring-blue-500',
    outline: 'bg-white text-gray-700 hover:bg-gray-50 border-gray-300 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    'outline-primary': 'bg-white text-primary-600 hover:bg-primary-50 border-primary-300 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    'danger-outline': 'bg-white text-red-600 hover:bg-red-50 border-red-300 focus:ring-2 focus:ring-offset-2 focus:ring-red-500',
    text: 'bg-transparent text-primary-600 hover:text-primary-800 border-transparent hover:underline'
  };
  
  // Disabled classes
  const disabledClasses = 'opacity-50 cursor-not-allowed';
  
  // Full width class
  const fullWidthClass = fullWidth ? 'w-full' : '';
  
  // Combine classes
  const allClasses = `
    ${baseClasses}
    ${sizeClasses[size] || sizeClasses.md}
    ${disabled ? disabledClasses : variantClasses[variant] || variantClasses.primary}
    ${fullWidthClass}
    ${className}
  `.trim();
  
  // If it's a link button
  if (to && !disabled) {
    return (
      <Link
        to={to}
        className={allClasses}
        {...rest}
      >
        {children}
      </Link>
    );
  }
  
  // Regular button
  return (
    <button
      type={type}
      className={allClasses}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  );
};

export default Button;