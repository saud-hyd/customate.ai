import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  as: Component = 'button',
  disabled = false,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-medium rounded-md focus:outline-none transition-colors';
  
  const variantStyles = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    secondary: 'bg-secondary-600 text-white hover:bg-secondary-700 focus:ring-2 focus:ring-offset-2 focus:ring-secondary-500',
    outline: 'bg-transparent border border-primary-600 text-primary-600 hover:bg-primary-50 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    ghost: 'bg-transparent text-primary-600 hover:bg-primary-50 focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    link: 'bg-transparent text-primary-600 hover:text-primary-700 underline',
  };
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };
  
  const disabledStyles = disabled 
    ? 'opacity-50 cursor-not-allowed' 
    : 'cursor-pointer';
  
  const widthStyles = fullWidth ? 'w-full' : '';
  
  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${disabledStyles} ${className}`;
  
  return (
    <Component 
      className={buttonStyles} 
      disabled={disabled} 
      {...props}
    >
      {children}
    </Component>
  );
};

export default Button;