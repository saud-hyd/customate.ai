import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.customate.ai';

/**
 * Service for handling contact and support related API requests
 */
const contactService = {
  /**
   * Send contact form submission
   * @param {Object} formData - Contact form data
   * @param {string} formData.name - Full name
   * @param {string} formData.email - Email address
   * @param {string} formData.company - Company name (optional)
   * @param {string} formData.message - Message content
   * @returns {Promise} - API response
   */
  submitContactForm: async (formData) => {
    try {
      const response = await axios.post(`${API_URL}/contact`, formData);
      return response.data;
    } catch (error) {
      console.error('Error submitting contact form:', error);
      throw error;
    }
  },

  /**
   * Request a product demo
   * @param {Object} demoData - Demo request data
   * @returns {Promise} - API response
   */
  requestDemo: async (demoData) => {
    try {
      const response = await axios.post(`${API_URL}/demo-request`, demoData);
      return response.data;
    } catch (error) {
      console.error('Error requesting demo:', error);
      throw error;
    }
  },

  /**
   * Subscribe to newsletter
   * @param {string} email - Email address
   * @returns {Promise} - API response
   */
  subscribeNewsletter: async (email) => {
    try {
      const response = await axios.post(`${API_URL}/subscribe`, { email });
      return response.data;
    } catch (error) {
      console.error('Error subscribing to newsletter:', error);
      throw error;
    }
  }
};

export default contactService;