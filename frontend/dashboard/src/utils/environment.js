/**
 * Environment utility to handle API URLs and environment detection
 * This centralizes all environment-specific logic
 */

// Detect current environment
export const isProduction = process.env.NODE_ENV === 'production';
export const isDevelopment = process.env.NODE_ENV === 'development';

// Base API URL with fallback
export const API_BASE_URL = process.env.REACT_APP_API_URL || 
  (isProduction ? 'https://customate-ai-1.onrender.com' : 'http://localhost:8000');

// API URL with /api path
export const API_URL = `${API_BASE_URL}/api`;

// Widget URL
export const WIDGET_URL = `${API_BASE_URL}/api/widget/widget.js`;

// Log environment in development
if (isDevelopment) {
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Base URL:', API_BASE_URL);
}

// Helper to get environment-specific value
export const getEnvValue = (productionValue, developmentValue) => {
  return isProduction ? productionValue : developmentValue;
};