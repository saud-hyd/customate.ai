import axios from 'axios';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000'
});

api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('adminToken');
    const adminUser = localStorage.getItem('adminUser');
    
    if (adminToken) {
      config.headers['X-Admin-Key'] = adminToken;
    }
    
    if (adminUser) {
      try {
        const parsedUser = JSON.parse(adminUser);
        if (parsedUser.user_id) {
          config.headers['X-Admin-User'] = parsedUser.user_id;
        }
      } catch (error) {
        console.error('Error parsing admin user:', error);
      }
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('adminToken');
      localStorage.removeItem('adminUser');
      
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;
