// frontend/dashboard/src/services/api.js
import axios from 'axios';

// Use environment variable with fallback to the production URL
const API_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com';

const api = axios.create({
  baseURL: API_URL,
});
  
api.interceptors.request.use(config => {
  const apiKey = localStorage.getItem('apiKey');
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});
  
export default api;