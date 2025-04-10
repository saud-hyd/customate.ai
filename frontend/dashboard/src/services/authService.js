// Path: frontend/dashboard/src/services/authService.js
import api from './api';

// Use environment variable with fallback to the production URL
const API_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com';

const authService = {
  // Login with email and password
  async login(email, password) {
    try {
      const response = await api.post('/api/auth/token', 
        new URLSearchParams({
          'username': email,
          'password': password
        }), 
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key || password);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Request magic link
  async requestMagicLink(email, isRegistration = false) {
    try {
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('is_registration', isRegistration);
      
      const response = await api.post('/api/auth/magic-link/request', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error requesting magic link:', error);
      throw error;
    }
  },
  
  // Verify magic link token
  async verifyMagicLink(token) {
    try {
      console.log('Verifying magic link token:', token);
      const response = await api.get(`/api/auth/magic-link/verify?token=${token}`);
      console.log('Magic link verification response:', response.data);
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      return response.data;
    } catch (error) {
      console.error('Error verifying magic link:', error);
      throw error;
    }
  },
  
  // Initiate Google OAuth flow
  async initiateGoogleAuth(isRegistration = false) {
    // This will redirect the browser to Google's OAuth page
    const redirectUri = `${window.location.origin}/auth/callback`;
    // Use absolute URL with API_URL
    window.location.href = `${API_URL}/api/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}&is_registration=${isRegistration}`;
    return true;
  },
  
  // Handle OAuth callback
  async handleOAuthCallback(params) {
    try {
      const response = await api.get(`/api/auth/oauth/callback?${new URLSearchParams(params).toString()}`);
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      return response.data;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  },
  
  // Register with email and password
  async register(userData) {
    try {
      // Format data for API
      const formData = new URLSearchParams();
      formData.append('email', userData.email);
      formData.append('password', userData.password);
      
      if (userData.name) formData.append('name', userData.name);
      if (userData.industry) formData.append('industry', userData.industry);
      if (userData.website) formData.append('website', userData.website);
      
      const response = await api.post('/api/auth/register', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Get current logged-in client information
  async getCurrentClient() {
    try {
      const response = await api.get('/api/client');
      return response.data;
    } catch (error) {
      // If API call fails, we're not logged in
      throw error;
    }
  },
  
  // Logout
  logout() {
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