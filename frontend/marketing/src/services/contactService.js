import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.customate.ai';

/**
 * Service for handling contact form submissions
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
  }
};

export default contactService;