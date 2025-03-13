import { useState } from 'react';
import axios from 'axios';
import useAuth from './useAuth';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { token, apiKey } = useAuth();

  // Set up axios instance with auth headers
  const api = axios.create({
    baseURL: 'http://localhost:8000',
  });

  // Add auth headers to requests
  api.interceptors.request.use(
    (config) => {
      // Clear previous auth headers
      delete config.headers.Authorization;
      delete config.headers['X-API-Key'];
      
      // Set appropriate auth header
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      } else if (apiKey) {
        config.headers['X-API-Key'] = apiKey;
      }
      
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Generic request method
  const request = async (method, url, data = null, options = {}) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await api({
        method,
        url,
        data,
        ...options,
      });
      
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    get: (url, options) => request('get', url, null, options),
    post: (url, data, options) => request('post', url, data, options),
    put: (url, data, options) => request('put', url, data, options),
    delete: (url, options) => request('delete', url, options),
  };
};

export default useApi;