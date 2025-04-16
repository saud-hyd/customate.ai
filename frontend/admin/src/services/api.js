// frontend/dashboard/src/services/api.js
import axios from 'axios';

// Determine API URL from environment variables with proper fallbacks
const API_URL = (() => {
  // Check for environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Check if we're in production based on the hostname
  const isProduction = 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';
  
  // Return appropriate URL based on environment
  return isProduction 
    ? 'https://customate-ai-1.onrender.com/api'
    : 'http://localhost:8000/api';
})();

console.log(`API URL configured as: ${API_URL}`);

// Create axios instance with baseURL
const api = axios.create({
  baseURL: API_URL,
});

// Add request interceptor for authentication
api.interceptors.request.use(config => {
  // Get API key from localStorage
  const apiKey = localStorage.getItem('apiKey');
  
  // Add API key to headers if available
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  
  // Add token to headers if available
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor for error handling
api.interceptors.response.use(
  response => response,
  error => {
    // Handle authentication errors
    if (error.response && error.response.status === 401) {
      console.error('Authentication error:', error);
      // Redirect to login if not already there
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('apiKey');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;