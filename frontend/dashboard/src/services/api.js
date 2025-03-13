import axios from 'axios';
const api = axios.create({
    baseURL: 'http://localhost:8000/api',
  });
  
  api.interceptors.request.use(config => {
    const apiKey = localStorage.getItem('apiKey');
    if (apiKey) {
      config.headers['X-API-Key'] = apiKey;
    }
    return config;
  });
  
  export default api;