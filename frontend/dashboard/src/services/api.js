// frontend/dashboard/src/services/api.js
import axios from 'axios';

// Define the API URL with clear logic
const API_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com/api';
console.log('API Base URL configured as:', API_URL);

// Create API instance WITHOUT /api at the end - this is critical
const api = axios.create({
  baseURL: API_URL,
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

export default api;