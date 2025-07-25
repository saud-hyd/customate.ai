// Path: frontend/dashboard/src/services/authService.js
// Usage: Authentication service with OAuth callback support and improved error handling

import api from './api';

const authService = {
  // Login with email and password
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);
      
      const response = await api.post('/api/auth/token', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Store authentication data
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('clientId', response.data.client_id);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      console.log('Login successful');
      return response.data;
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Register with email and password
// Register with email and password
  async register({ email, password, name, industry, website }) {
    try {
      console.log('Attempting registration for:', email);
      
      const formData = new URLSearchParams();
      formData.append('email', email.trim());
      formData.append('password', password);
      formData.append('name', name.trim());
      formData.append('industry', industry || 'other');
      formData.append('website', website || '');
      
      const response = await api.post('/api/auth/register', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Registration successful, verification email sent');
      return {
        message: 'Registration successful! Please check your email for verification.',
        email: email,
        verification_required: true
      };
    } catch (error) {
      console.error('Registration error:', error.response?.data || error.message);
      
      // Extract user-friendly error message before throwing
      if (error.response?.data?.detail) {
        const detail = error.response.data.detail;
        const message = Array.isArray(detail) ? detail[0]?.msg || 'Registration failed' : detail;
        
        // Create a clean error with proper message
        const cleanError = new Error(message);
        cleanError.response = { ...error.response, data: { ...error.response.data, detail: message } };
        throw cleanError;
      }
      
      throw error;
    }
  },

  // Email verification
  async verifyEmail(token) {
    try {
      console.log('Verifying email with token...');
      
      const response = await api.get(`/api/auth/verify-email?token=${token}`);
      
      console.log('Email verification response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Email verification error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Google OAuth registration/login (FIXED VERSION)
  async googleAuth(idToken, industry, website, isRegistration = false) {
    try {
      console.log('Attempting Google OAuth', isRegistration ? '(registration)' : '(login)');
      
      // Use the register endpoint for BOTH login and registration
      // The backend already handles existing users and logs them in
      const endpoint = '/api/auth/google/register';
      const payload = {
        idToken: idToken,
        industry: industry || 'other',
        website: website || ''
      };
      
      const response = await api.post(endpoint, payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Store authentication data
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('clientId', response.data.client_id);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      console.log('Google authentication successful');
      return response.data;
    } catch (error) {
      console.error('Google auth error:', error.response?.data || error.message);
      throw error;
    }
  },

  // FIXED: Add OAuth callback handler
  async handleOAuthCallback(code, state) {
    try {
      console.log('Handling OAuth callback with code and state');
      
      const payload = {
        code: code,
        state: state || ''
      };
      
      const response = await api.get('/api/auth/oauth/callback', {
        params: payload
      });
      
      // Store authentication data
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('clientId', response.data.client_id);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      console.log('OAuth callback processed successfully');
      return response.data;
    } catch (error) {
      console.error('OAuth callback error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Get current client information
  async getCurrentClient() {
    try {
      // Use /api/client instead of /api/auth/me
      const response = await api.get('/api/client');
      return response.data;
    } catch (error) {
      console.error('Get current client error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Password reset request
  async requestPasswordReset(email) {
    try {
      console.log('Requesting password reset for:', email);
      
      const formData = new URLSearchParams();
      formData.append('email', email.trim());
      
      const response = await api.post('/api/auth/password-reset/request', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Password reset email sent');
      return response.data;
    } catch (error) {
      console.error('Password reset request error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Reset password with token
  async resetPassword(token, newPassword) {
    try {
      console.log('Resetting password with token...');
      
      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('new_password', newPassword);
      
      const response = await api.post('/api/auth/password-reset/verify', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      // Auto-login after password reset
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('clientId', response.data.client_id);
        localStorage.setItem('apiKey', response.data.api_key);
      }
      
      console.log('Password reset successful');
      return response.data;
    } catch (error) {
      console.error('Password reset error:', error.response?.data || error.message);
      throw error;
    }
  },

  // Check if user is authenticated
  isAuthenticated() {
    const token = localStorage.getItem('token');
    const apiKey = localStorage.getItem('apiKey');
    return !!(token || apiKey);
  },

  // Logout
  logout() {
    console.log('Logging out...');
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('clientId');
  }
};

export default authService;