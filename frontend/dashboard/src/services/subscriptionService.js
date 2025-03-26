import api from './api';

/**
 * Service for subscription-related API operations
 */
const subscriptionService = {
  /**
   * Get current subscription information
   * @returns {Promise<Object>} Current subscription data
   */
  getCurrentSubscription: async () => {
    try {
      const response = await api.get('/api/client/subscription');
      return response.data;
    } catch (error) {
      console.error('Error getting subscription info:', error);
      throw error;
    }
  },

  /**
   * Change the current subscription plan
   * @param {string} planType - The plan type to change to (free, basic, professional, enterprise)
   * @returns {Promise<Object>} Updated subscription data
   */
  changePlan: async (planType) => {
    try {
      // For free plan downgrades, directly change
      if (planType === 'free') {
        const response = await api.post('/api/client/subscription/change', { 
          plan_type: planType 
        });
        return response.data;
      }
      
      // For paid plans, create a checkout session and redirect
      const response = await api.post('/api/client/subscription/checkout-session', {
        plan_type: planType,
        success_url: `${window.location.origin}/subscription?success=true`,
        cancel_url: `${window.location.origin}/subscription?cancelled=true`
      });
      
      // Redirect to checkout URL if available
      if (response.data && response.data.checkout_url) {
        window.location.href = response.data.checkout_url;
      }
      
      return response.data;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw error;
    }
  },

  /**
   * Get subscription limits and usage
   * @returns {Promise<Object>} Subscription limits and usage data
   */
  getSubscriptionLimits: async () => {
    try {
      const response = await api.get('/api/analytics/subscription/limits');
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
      throw error;
    }
  },

  /**
   * Get payment methods
   * @returns {Promise<Array>} List of payment methods
   */
  getPaymentMethods: async () => {
    try {
      const response = await api.get('/api/client/subscription/payment-methods');
      return response.data || [];
    } catch (error) {
      console.error('Error getting payment methods:', error);
      return [];
    }
  },

  /**
   * Get invoices
   * @returns {Promise<Array>} List of invoices
   */
  getInvoices: async () => {
    try {
      const response = await api.get('/api/client/subscription/invoices');
      return response.data || [];
    } catch (error) {
      console.error('Error getting invoices:', error);
      return [];
    }
  },

  /**
   * Get recommended plan based on usage
   * @returns {Promise<Object>} Recommended plan data
   */
  getRecommendedPlan: async () => {
    try {
      const response = await api.get('/api/client/subscription/recommended');
      return response.data;
    } catch (error) {
      console.error('Error getting recommended plan:', error);
      return null;
    }
  }
};

export default subscriptionService;