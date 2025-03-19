// Path: frontend/dashboard/src/utils/formatters.js

/**
 * Format a number with thousands separators
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export const formatNumber = (num) => {
    if (num === undefined || num === null) return '0';
    return new Intl.NumberFormat().format(num);
  };
  
  /**
   * Format a percentage with fixed decimal places
   * @param {number} percent - Percentage value
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted percentage
   */
  export const formatPercentage = (percent, decimals = 0) => {
    if (percent === undefined || percent === null) return '0%';
    return percent.toFixed(decimals) + '%';
  };
  
  /**
   * Format bytes into a human-readable string
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} Formatted bytes (KB, MB, GB, etc.)
   */
  export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    if (bytes === undefined || bytes === null) return '0 Bytes';
  
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
  };
  
  /**
   * Format milliseconds into a human-readable duration
   * @param {number} ms - Milliseconds to format
   * @returns {string} Formatted duration
   */
  export const formatDuration = (ms) => {
    if (ms === undefined || ms === null) return '0 ms';
    
    if (ms < 1000) {
      return `${Math.round(ms)} ms`;
    }
    
    const seconds = ms / 1000;
    
    if (seconds < 60) {
      return `${seconds.toFixed(1)} sec`;
    }
    
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} min`;
  };
  
  /**
   * Format a date to a standard string format
   * @param {Date|string} date - Date to format
   * @param {object} options - Intl.DateTimeFormat options
   * @returns {string} Formatted date string
   */
  export const formatDate = (date, options = {}) => {
    if (!date) return 'N/A';
    
    const defaultOptions = { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    };
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('default', { ...defaultOptions, ...options }).format(dateObj);
  };
  
  /**
   * Format a date to a time string
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted time string
   */
  export const formatTime = (date) => {
    if (!date) return 'N/A';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('default', { 
      hour: '2-digit', 
      minute: '2-digit'
    }).format(dateObj);
  };
  
  /**
   * Format a date to a date and time string
   * @param {Date|string} date - Date to format
   * @returns {string} Formatted date and time string
   */
  export const formatDateTime = (date) => {
    if (!date) return 'N/A';
    
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    
    return new Intl.DateTimeFormat('default', { 
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(dateObj);
  };