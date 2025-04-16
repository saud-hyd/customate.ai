// Path: frontend/dashboard/src/services/authService.js
import api from './api';

// Get frontend and API base URLs
const FRONTEND_URL = window.location.origin;
const API_URL = api.defaults.baseURL;

const authService = {
  // Login with email and password
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      const response = await api.post('/auth/token', 
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
        console.log('Login successful, stored token and API key');
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
    
    // Build the redirect URI (frontend callback URL)
    const redirectUri = `${FRONTEND_URL}/auth/callback`;
    
    // Build the complete OAuth URL
    const authUrl = `${API_URL}/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}&is_registration=${isRegistration}`;
    
    console.log('Redirecting to OAuth URL:', authUrl);
    
    // Redirect the browser to the OAuth URL
    window.location.href = authUrl;
    return true;
  },
  
  // Handle OAuth callback
  async handleOAuthCallback(params) {
    try {
      console.log('Handling OAuth callback with params:', params);
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/auth/oauth/callback?${queryString}`);
      
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
      console.log('Registering user:', userData.email);
      // Format data for API
      const formData = new URLSearchParams();
      formData.append('email', userData.email);
      formData.append('password', userData.password);
      
      if (userData.name) formData.append('name', userData.name);
      if (userData.industry) formData.append('industry', userData.industry);
      if (userData.website) formData.append('website', userData.website);
      
      const response = await api.post('/auth/register', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
        localStorage.setItem('clientId', response.data.client_id);
        console.log('Registration successful');
      }
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      throw error;
    }
  },
  
  // Logout
  logout() {
    console.log('Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('clientId');
    // Redirect to login page
    window.location.href = '/login';
  },
  
  // Check if authenticated
  isAuthenticated() {
    return !!localStorage.getItem('token') || !!localStorage.getItem('apiKey');
  }
};

export default authService;