import React, { createContext, useState, useCallback, useContext } from 'react';

// Create the context
const ToastContext = createContext();

// Toast types for styling
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info',
};

// Provider component that wraps your app and makes toast functions available
export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  // Add a toast
  const toast = useCallback((message, type = TOAST_TYPES.INFO, duration = 5000) => {
    const id = Date.now();
    setToasts(prevToasts => [...prevToasts, { id, message, type }]);

    // Auto-remove toast after duration
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, []);

  // Remove a toast by id
  const removeToast = useCallback((id) => {
    setToasts(prevToasts => prevToasts.filter(toast => toast.id !== id));
  }, []);

  // Add specialized toast functions
  const success = useCallback((message, duration) => {
    return toast(message, TOAST_TYPES.SUCCESS, duration);
  }, [toast]);

  const error = useCallback((message, duration) => {
    return toast(message, TOAST_TYPES.ERROR, duration);
  }, [toast]);

  const warning = useCallback((message, duration) => {
    return toast(message, TOAST_TYPES.WARNING, duration);
  }, [toast]);

  const info = useCallback((message, duration) => {
    return toast(message, TOAST_TYPES.INFO, duration);
  }, [toast]);

  // Value to be provided by the context
  const value = {
    toasts,
    toast,
    removeToast,
    success,
    error,
    warning,
    info,
  };

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/* Render toasts */}
      <div className="toast-container fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(({ id, message, type }) => (
          <div 
            key={id}
            className={`toast p-4 rounded-lg shadow-lg flex items-start justify-between max-w-md transition-all duration-300 transform translate-y-0 ${
              type === TOAST_TYPES.SUCCESS
                ? 'bg-green-100 text-green-800 border-l-4 border-green-500'
                : type === TOAST_TYPES.ERROR
                ? 'bg-red-100 text-red-800 border-l-4 border-red-500'
                : type === TOAST_TYPES.WARNING
                ? 'bg-yellow-100 text-yellow-800 border-l-4 border-yellow-500'
                : 'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
            }`}
          >
            <div>{message}</div>
            <button
              onClick={() => removeToast(id)}
              className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Custom hook to use the toast context
export const useToast = () => {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export default ToastContext;