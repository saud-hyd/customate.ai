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

api.interceptors.request.use(config => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      console.error('Authentication error:', error);
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