import axios from 'axios';

// Add explicit debug logging 
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
console.log('API Base URL configured as:', API_URL);

// Check if API_URL already ends with /api
const baseURL = API_URL.endsWith('/api') 
  ? API_URL.substring(0, API_URL.length - 4) // Remove trailing /api
  : API_URL;

console.log('Using corrected baseURL:', baseURL);

const api = axios.create({
  baseURL: baseURL,
});

// Request interceptor to add auth token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

// Response interceptor for authentication errors
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      // If not already on login page, redirect to login
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        localStorage.removeItem('clientId');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;