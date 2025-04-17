// frontend/dashboard/src/services/authService.js
import api from './api';

const authService = {
  async login(email, password) {
    try {
      console.log('Attempting login for:', email);
      
      // Use correct path with /api prefix
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
        console.log('Login successful, stored token and API key');
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error details:', error.response?.data || error.message);
      throw error;
    }
  },
  
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
  
  async initiateGoogleAuth(isRegistration = false) {
    console.log('Initiating Google auth, isRegistration:', isRegistration);
    
    const redirectUri = `${window.location.origin}/auth/callback`;
    const baseUrl = api.defaults.baseURL;
    
    const authUrl = `${baseUrl}/api/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}&is_registration=${isRegistration}`;
    
    console.log('Redirecting to OAuth URL:', authUrl);
    window.location.href = authUrl;
    return true;
  },
  
  async handleOAuthCallback(params) {
    try {
      console.log('Handling OAuth callback with params:', params);
      const queryString = new URLSearchParams(params).toString();
      const response = await api.get(`/api/auth/oauth/callback?${queryString}`);
      
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
  
  async register(userData) {
    try {
      console.log('Registering user:', userData.email);
      
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
  
  async getCurrentClient() {
    try {
      console.log('Getting current client info');
      const response = await api.get('/api/client');
      console.log('Current client info retrieved');
      return response.data;
    } catch (error) {
      console.error('Error getting client info:', error.response?.data || error.message);
      throw error;
    }
  },
  
  logout() {
    console.log('Logging out');
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('clientId');
    window.location.href = '/login';
  },
  
  isAuthenticated() {
    return !!localStorage.getItem('token') || !!localStorage.getItem('apiKey');
  }
};

export default authService;