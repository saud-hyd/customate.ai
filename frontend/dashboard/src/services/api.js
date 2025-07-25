// Path: frontend/dashboard/src/services/api.js
// This file configures the Axios instance for all API calls

import axios from 'axios';

// Get API base URL from environment or default to localhost
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

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

// Response interceptor to handle subscription limit errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle subscription limit errors (402 Payment Required)
    if (error.response?.status === 402) {
      const errorData = error.response.data;
      
      // Create and show subscription limit error
      const showSubscriptionError = () => {
        // Create error element
        const errorDiv = document.createElement('div');
        errorDiv.className = 'fixed top-4 right-4 z-50 bg-red-50 border-l-4 border-red-500 p-4 rounded-md shadow-lg max-w-md';
        errorDiv.innerHTML = `
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
              </svg>
            </div>
            <div class="ml-3 flex-1">
              <h3 class="text-sm font-medium text-red-800">Subscription Limit Reached</h3>
              <p class="mt-1 text-sm text-red-700">${errorData.message || 'You have reached your subscription limit.'}</p>
              <div class="mt-3">
                <a href="/subscription" class="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700">
                  Upgrade Plan
                </a>
                <button onclick="this.closest('div[class*=fixed]').remove()" class="ml-2 text-xs text-red-600 hover:text-red-800">
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        `;
        
        // Add to page
        document.body.appendChild(errorDiv);
        
        // Auto remove after 10 seconds
        setTimeout(() => {
          if (document.body.contains(errorDiv)) {
            document.body.removeChild(errorDiv);
          }
        }, 10000);
      };
      
      // Show the error
      showSubscriptionError();
    }
    
    return Promise.reject(error);
  }
);

export default api;