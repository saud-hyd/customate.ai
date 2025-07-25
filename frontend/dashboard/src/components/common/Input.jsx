// src/components/common/Input.jsx
import React from 'react';

/**
 * Input component for form fields
 * Provides consistent styling and behavior for all text inputs
 */
const Input = ({
  label,
  id,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  helper = '',
  className = '',
  inputClassName = '',
  disabled = false,
  required = false,
  icon = null,
  ...props
}) => {
  const inputId = id || name;
  
  return (
    <div className={`${className}`}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {icon}
          </div>
        )}
        
        <input
          id={inputId}
          name={name}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`
            w-full px-3 py-2 border rounded-md shadow-sm
            ${icon ? 'pl-10' : ''}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-gray-300 focus:border-orange-500 focus:ring-orange-500'}
            ${disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}
            focus:outline-none focus:ring-1
            ${inputClassName}
          `}
          {...props}
        />
      </div>
      
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {helper && !error && <p className="mt-1 text-sm text-gray-500">{helper}</p>}
    </div>
  );
};

export default Input;