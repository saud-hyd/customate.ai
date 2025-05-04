// Path: frontend/dashboard/src/services/api.js
// This file configures the Axios instance for all API calls

import axios from 'axios';
import { API_BASE_URL } from '../utils/environment';

// Create API instance
const api = axios.create({
  baseURL: API_BASE_URL,
});

// Request interceptor to add auth token and fix URL paths
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // Ensure URL has /api prefix but avoid duplicates
  if (config.url && !config.url.startsWith('/api')) {
    config.url = `/api${config.url}`;
  }
  
  return config;
}, error => {
  return Promise.reject(error);
});

export default api;