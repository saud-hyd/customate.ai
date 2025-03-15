import api from './api';

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
        localStorage.setItem('clientId', response.data.client_id);
        localStorage.setItem('apiKey', response.data.api_key || password);
      }
      
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  // Request OTP for email verification
  async requestOTP(email) {
    try {
      const formData = new URLSearchParams();
      formData.append('email', email);
      
      const response = await api.post('/api/auth/request-otp', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error requesting OTP:', error);
      throw error;
    }
  },
  
  // Verify OTP
  async verifyOTP(email, otp) {
    try {
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('otp', otp);
      
      const response = await api.post('/api/auth/verify-otp', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Error verifying OTP:', error);
      throw error;
    }
  },
  
  // Register a new client with OTP verification
  async register(clientData) {
    try {
      // Format data for API
      const formData = new URLSearchParams();
      formData.append('name', clientData.name);
      formData.append('email', clientData.email);
      formData.append('industry', clientData.industry);
      
      if (clientData.website) {
        formData.append('website', clientData.website);
      }
      
      formData.append('password', clientData.password);
      formData.append('otp', clientData.otp);
      
      const response = await api.post('/api/auth/register', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },
  
  // Rest of the code remains the same...
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('clientId');
    localStorage.removeItem('apiKey');
  },
  
  async getCurrentClient() {
    try {
      const response = await api.get('/api/client');
      return response.data;
    } catch (error) {
      // If API call fails, we're not logged in
      return null;
    }
  },
  
  async updateSettings(settingsData) {
    const response = await api.put('/api/client/settings', settingsData);
    return response.data;
  },
  
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};

export default authService;