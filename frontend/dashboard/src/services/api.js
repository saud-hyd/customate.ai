// frontend/dashboard/src/services/api.js
import axios from 'axios';

// Explicitly set to your Render backend URL
const API_URL = 'https://customate-ai-1.onrender.com';

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