// frontend/dashboard/src/services/api.js
import axios from 'axios';

// Determine API URL without /api suffix
const API_URL = (() => {
  if (process.env.REACT_APP_API_URL) {
    // Remove /api if present to avoid duplication
    return process.env.REACT_APP_API_URL.replace(/\/api$/, '');
  }
  
  const isProduction = 
    window.location.hostname !== 'localhost' && 
    window.location.hostname !== '127.0.0.1';
  
  return isProduction 
    ? 'https://customate-ai-1.onrender.com'
    : 'http://localhost:8000';
})();

console.log(`API URL configured as: ${API_URL}`);

const api = axios.create({
  baseURL: API_URL,
});

// FIX: Store a local reference to avoid reading from localStorage on every request
let cachedApiKey = null;
let cachedToken = null;

// Load initial values
try {
  cachedApiKey = localStorage.getItem('apiKey');
  cachedToken = localStorage.getItem('token');
} catch (error) {
  console.error('Error reading auth data from localStorage:', error);
}

api.interceptors.request.use(config => {
  // Only read from localStorage if we don't have a cached value
  if (!cachedApiKey) {
    try {
      cachedApiKey = localStorage.getItem('apiKey');
    } catch (error) {
      console.error('Error reading apiKey from localStorage:', error);
    }
  }
  
  if (!cachedToken) {
    try {
      cachedToken = localStorage.getItem('token');
    } catch (error) {
      console.error('Error reading token from localStorage:', error);
    }
  }
  
  // Check if we have an API key now and add it to headers
  if (cachedApiKey) {
    config.headers['X-API-Key'] = cachedApiKey;
  }
  
  // Check if we have a token now and add it to headers
  if (cachedToken) {
    config.headers['Authorization'] = `Bearer ${cachedToken}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Also update the response interceptor to update our cached values if they change
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      console.error('Authentication error:', error);
      
      // Clear cached values
      cachedApiKey = null;
      cachedToken = null;
      
      if (!window.location.pathname.includes('/login')) {
        try {
          localStorage.removeItem('token');
          localStorage.removeItem('apiKey');
        } catch (err) {
          console.error('Error clearing localStorage:', err);
        }
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Add method to update cached values when login/logout happens
api.updateAuthData = (token, apiKey) => {
  cachedToken = token;
  cachedApiKey = apiKey;
  
  // Also update localStorage
  try {
    if (token) {
      localStorage.setItem('token', token);
    } else {
      localStorage.removeItem('token');
    }
    
    if (apiKey) {
      localStorage.setItem('apiKey', apiKey);
    } else {
      localStorage.removeItem('apiKey');
    }
  } catch (error) {
    console.error('Error updating localStorage:', error);
  }
};

export default api;