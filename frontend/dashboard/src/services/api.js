// Path: frontend/dashboard/src/services/api.js
// This file configures the Axios instance for all API calls

import axios from 'axios';

// Define the base URL without /api
const BASE_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com';
console.log('API Base URL configured as:', BASE_URL);

// Create API instance with /api at the end for proper path construction
const api = axios.create({
  baseURL: BASE_URL, // Remove /api from here - we'll handle it in the interceptor
});

// Request interceptor to add auth token and fix URL paths
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Fix duplicate /api prefixes in URLs
  // If the URL starts with /api/api, replace it with just /api
  if (config.url && config.url.startsWith('/api/api')) {
    config.url = config.url.replace('/api/api', '/api');
    console.log(`Fixed duplicated API path to: ${config.url}`);
  }
  // If URL starts with /api but baseURL doesn't end with /api, we're good
  // If URL doesn't start with /api, add it
  else if (config.url && !config.url.startsWith('/api')) {
    config.url = `/api${config.url}`;
    console.log(`Added API prefix to path: ${config.url}`);
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;