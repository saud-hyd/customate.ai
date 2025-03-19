// Path: frontend/dashboard/src/utils/formatters.js

/**
 * Format number with commas for thousands
 * @param {number} number - Number to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} - Formatted number
 */
export const formatNumber = (number, decimals = 0) => {
    if (number === null || number === undefined) return '0';
    
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(number);
  };
  
  /**
   * Format percentage value
   * @param {number} value - Value to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} - Formatted percentage
   */
  export const formatPercentage = (value, decimals = 1) => {
    if (value === null || value === undefined) return '0%';
    
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value)}%`;
  };
  
  /**
   * Format bytes to human-readable format
   * @param {number} bytes - Bytes to format
   * @param {number} decimals - Number of decimal places
   * @returns {string} - Formatted bytes
   */
  export const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
  
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
  
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(decimals))} ${sizes[i]}`;
  };
  
  /**
   * Format date to local string
   * @param {Date|string} date - Date to format
   * @param {boolean} includeTime - Whether to include time
   * @returns {string} - Formatted date
   */
  export const formatDate = (date, includeTime = false) => {
    if (!date) return '';
    
    const dateObj = new Date(date);
    
    if (includeTime) {
      return dateObj.toLocaleString();
    }
    
    return dateObj.toLocaleDateString();
  };
  
  /**
   * Format duration in milliseconds to readable format
   * @param {number} milliseconds - Duration in milliseconds
   * @returns {string} - Formatted duration
   */
  export const formatDuration = (milliseconds) => {
    if (!milliseconds) return '0 ms';
    
    if (milliseconds < 1000) {
      return `${Math.round(milliseconds)} ms`;
    }
    
    const seconds = milliseconds / 1000;
    if (seconds < 60) {
      return `${seconds.toFixed(1)} sec`;
    }
    
    const minutes = seconds / 60;
    return `${minutes.toFixed(1)} min`;
  };