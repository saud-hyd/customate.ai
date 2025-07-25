import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'https://api.customate.ai';

/**
 * Service for handling payment related API requests
 */
const paymentService = {
  /**
   * Process payment for subscription
   * @param {Object} paymentData - Payment form data
   * @returns {Promise} - API response
   */
  processPayment: async (paymentData) => {
    try {
      const response = await axios.post(`${API_URL}/payments/subscription`, paymentData);
      return response.data;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  },

  /**
   * Get available plans
   * @returns {Promise} - API response with plans data
   */
  getPlans: async () => {
    try {
      const response = await axios.get(`${API_URL}/plans`);
      return response.data;
    } catch (error) {
      console.error('Error fetching plans:', error);
      throw error;
    }
  },

  /**
   * Generate subscription estimate (prices with taxes, etc.)
   * @param {Object} estimateData - Plan and country data for tax calculation
   * @returns {Promise} - API response with price estimate
   */
  generateEstimate: async (estimateData) => {
    try {
      const response = await axios.post(`${API_URL}/payments/estimate`, estimateData);
      return response.data;
    } catch (error) {
      console.error('Error generating estimate:', error);
      throw error;
    }
  },

  /**
   * Validate coupon code
   * @param {string} couponCode - Coupon code to validate
   * @returns {Promise} - API response with coupon data if valid
   */
  validateCoupon: async (couponCode) => {
    try {
      const response = await axios.post(`${API_URL}/payments/validate-coupon`, { couponCode });
      return response.data;
    } catch (error) {
      console.error('Error validating coupon:', error);
      throw error;
    }
  }
};

export default paymentService;