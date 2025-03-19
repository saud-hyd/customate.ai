import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.customate.ai';
const APP_URL = process.env.REACT_APP_DASHBOARD_URL || 'https://app.customate.ai';

/**
 * Service for handling authentication related API requests
 */
const authService = {
  /**
   * Register a new user
   * @param {Object} userData - User registration data
   * @returns {Promise} - API response
   */
  register: async (userData) => {
    try {
      const response = await axios.post(`${API_URL}/auth/register`, userData);
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  /**
   * Redirect to login page
   * @param {Object} options - Optional redirect parameters
   * @param {string} options.redirect - URL to redirect after login
   * @returns {void}
   */
  redirectToLogin: (options = {}) => {
    const redirectParam = options.redirect ? `?redirect=${encodeURIComponent(options.redirect)}` : '';
    window.location.href = `${APP_URL}/login${redirectParam}`;
  },

  /**
   * Redirect to registration page
   * @param {Object} options - Optional redirect parameters
   * @param {string} options.plan - Plan to select on registration
   * @param {string} options.source - Traffic source for analytics
   * @returns {void}
   */
  redirectToRegister: (options = {}) => {
    let queryParams = [];
    
    if (options.plan) {
      queryParams.push(`plan=${encodeURIComponent(options.plan)}`);
    }
    
    if (options.source) {
      queryParams.push(`source=${encodeURIComponent(options.source)}`);
    }
    
    const queryString = queryParams.length > 0 ? `?${queryParams.join('&')}` : '';
    window.location.href = `${APP_URL}/register${queryString}`;
  },

  /**
   * Check if user is authenticated
   * @returns {boolean} - True if user has a valid token
   */
  isAuthenticated: () => {
    // This is simplistic - in a real app you'd do proper token validation
    return !!localStorage.getItem('token');
  }
};

export default authService;