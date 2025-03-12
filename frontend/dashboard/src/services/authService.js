import api from './api';

const authService = {
  // Login with email and password
  async login(email, password) {
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
      localStorage.setItem('clientId', response.data.client_id);
      localStorage.setItem('apiKey', response.data.api_key || password); // Some APIs return the API key, others use password as key
    }
    
    return response.data;
  },
  
  // Register a new client
  async register(clientData) {
    const response = await api.post('/auth/register', clientData);
    return response.data;
  },
  
  // Logout the user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('clientId');
    localStorage.removeItem('apiKey');
  },
  
  // Get current client info
  async getCurrentClient() {
    try {
      const response = await api.get('/client');
      return response.data;
    } catch (error) {
      // If API call fails, we're not logged in
      return null;
    }
  },
  
  // Update client settings
  async updateSettings(settingsData) {
    const response = await api.put('/client/settings', settingsData);
    return response.data;
  },
  
  // Check if user is logged in
  isAuthenticated() {
    return !!localStorage.getItem('token');
  }
};

export default authService;