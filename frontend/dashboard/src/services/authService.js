// Path: frontend/dashboard/src/services/authService.js
// This service handles all authentication API calls

import api from './api';

// Use environment variable with fallback to the production URL
const API_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com';

const authService = {
// Path: frontend/dashboard/src/services/authService.js

// Update the login method 
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      // Ensure proper formatting of credentials
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      // Use the configured API URL
      const response = await api.post('/api/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data.access_token) {
        // Store JWT token for user authentication
        localStorage.setItem('token', response.data.access_token);
        
        // If API key is included, store it separately for widget use
        if (response.data.api_key) {
          localStorage.setItem('apiKey', response.data.api_key);
          console.log('Stored API key for widget use');
        }
        
        if (response.data.client_id) {
          localStorage.setItem('clientId', response.data.client_id);
        }
        
        console.log('Login successful with password');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      throw error;
    }
  },  
  // Request magic link
  async requestMagicLink(email, isRegistration = false) {
    try {
      console.log('Requesting magic link for:', email, 'isRegistration:', isRegistration);
      
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('is_registration', isRegistration);
      
      const response = await api.post('/auth/magic-link/request', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Magic link requested successfully');
      return response.data;
    } catch (error) {
      console.error('Error requesting magic link:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Verify magic link token
  async verifyMagicLink(token) {
    try {
      console.log('Verifying magic link token');
      const response = await api.get(`/auth/magic-link/verify?token=${token}`);
      console.log('Magic link verification response:', response.data);
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
        localStorage.setItem('clientId', response.data.client_id);
        console.log('Stored auth data from magic link');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error verifying magic link:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Initiate Google OAuth flow
  async initiateGoogleAuth(isRegistration = false) {
    console.log('Initiating Google auth, isRegistration:', isRegistration);
    // This will redirect the browser to Google's OAuth page
    const redirectUri = `${window.location.origin}/auth/callback`;
    // Use absolute URL with API_URL
    window.location.href = `${API_URL}/api/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}&is_registration=${isRegistration}`;
    return true;
  },
  
  // Handle OAuth callback
  async handleOAuthCallback(params) {
    try {
      console.log('Handling OAuth callback');
      const response = await api.get(`/auth/oauth/callback?${new URLSearchParams(params).toString()}`);
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
        localStorage.setItem('clientId', response.data.client_id);
        console.log('OAuth login successful');
      }
      
      return response.data;
    } catch (error) {
      console.error('OAuth callback error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Register with email and password
  async register(userData) {
    try {
      console.log('Registering user with unified method:', userData.email);
      // Format data for API
      const formData = new URLSearchParams();
      formData.append('email', userData.email);
      formData.append('password', userData.password);
      
      // Optional fields - only include if they have values
      if (userData.name) formData.append('name', userData.name);
      if (userData.industry) formData.append('industry', userData.industry);
      if (userData.website) formData.append('website', userData.website);
      
      // Use the correct path - fix URL to match backend
      const response = await api.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Store auth tokens if they're in the response
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
        localStorage.setItem('clientId', response.data.client_id);
        console.log('Registration successful, stored auth data');
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },

  async verifyPasswordReset(token, newPassword) {
    try {
      console.log('Verifying password reset token and setting new password');
      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('new_password', newPassword);
      
      const response = await api.post('/auth/password-reset/verify', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
        localStorage.setItem('clientId', response.data.client_id);
        console.log('Password reset successful, stored auth data');
      }
      
      return response.data;
    } catch (error) {
      console.error('Error verifying password reset:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Get current logged-in client information
  async getCurrentClient() {
    try {
      console.log('Getting current client info');
      const response = await api.get('/client');
      console.log('Current client info retrieved');
      return response.data;
    } catch (error) {
      console.error('Error getting client info:', error.response?.data || error.message);
      // If API call fails, we're not logged in
      throw error;
    }
  },
  
  // Logout
  logout() {
    console.log('Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('clientId');
  },
  
  // Check if authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token') || !!localStorage.getItem('apiKey');
  }
};

export default authService;