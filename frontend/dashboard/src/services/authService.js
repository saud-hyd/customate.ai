// Path: frontend/dashboard/src/services/authService.js
import api from './api';

// Use environment variable with fallback to the production URL
const API_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com';

const authService = {
  // Login with email and password
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      // Ensure proper formatting of credentials
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      // Use the full URL to avoid any path issues
      const response = await axios.post(`https://customate-ai-1.onrender.com/api/auth/token`, 
        formData,
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
      
      // If the error is 401 Unauthorized, try to get the API key via magic link
      if (error.response?.status === 401 && email) {
        console.log('Login failed, suggesting magic link instead');
        throw new Error('Login failed. Try using "Magic Link" login option instead, or reset your password.');
      }
      
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
      
      const response = await api.post('/api/auth/magic-link/request', formData, {
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
      const response = await api.get(`/api/auth/magic-link/verify?token=${token}`);
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
      const response = await api.get(`/api/auth/oauth/callback?${new URLSearchParams(params).toString()}`);
      
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
      
      const response = await api.post('/api/auth/register', formData, {
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
  
  // Request password reset
  async requestPasswordReset(email) {
    try {
      console.log('Requesting password reset for:', email);
      const formData = new URLSearchParams();
      formData.append('email', email);
      
      const response = await api.post('/api/auth/password-reset/request', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error requesting password reset:', error.response?.data || error.message);
      throw error;
    }
  },

  async verifyPasswordReset(token, newPassword) {
    try {
      console.log('Verifying password reset token and setting new password');
      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('new_password', newPassword);
      
      const response = await api.post('/api/auth/password-reset/verify', formData, {
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
      const response = await api.get('/api/client');
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