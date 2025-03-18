// frontend/dashboard/src/services/subscriptionService.js
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
      const response = await api.post('/api/client/subscription/change', { plan_type: planType });
      return response.data;
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      throw error;
    }
  },

  /**
   * Cancel the current subscription
   * @param {boolean} immediately - Whether to cancel immediately or at the end of the billing period
   * @returns {Promise<Object>} Cancellation result
   */
  cancelSubscription: async (immediately = false) => {
    try {
      const response = await api.post('/api/client/subscription/cancel', { 
        cancel_immediately: immediately 
      });
      return response.data;
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      throw error;
    }
  },

  /**
   * Get saved payment methods
   * @returns {Promise<Array>} List of payment methods
   */
  getPaymentMethods: async () => {
    try {
      const response = await api.get('/api/client/payment-methods');
      return response.data;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  },

  /**
   * Add a new payment method
   * @param {string} paymentMethodId - Stripe payment method ID
   * @param {boolean} setAsDefault - Whether to set as default payment method
   * @returns {Promise<Object>} Added payment method
   */
  addPaymentMethod: async (paymentMethodId, setAsDefault = true) => {
    try {
      const response = await api.post('/api/client/payment-methods', { 
        payment_method_id: paymentMethodId,
        set_as_default: setAsDefault
      });
      return response.data;
    } catch (error) {
      console.error('Error adding payment method:', error);
      throw error;
    }
  },

  /**
   * Remove a payment method
   * @param {string} paymentMethodId - Stripe payment method ID
   * @returns {Promise<Object>} Removal result
   */
  removePaymentMethod: async (paymentMethodId) => {
    try {
      const response = await api.delete(`/api/client/payment-methods/${paymentMethodId}`);
      return response.data;
    } catch (error) {
      console.error('Error removing payment method:', error);
      throw error;
    }
  },

  /**
   * Get recent invoices
   * @param {number} limit - Maximum number of invoices to return
   * @returns {Promise<Array>} List of invoices
   */
  getInvoices: async (limit = 10) => {
    try {
      const response = await api.get('/api/client/invoices', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error getting invoices:', error);
      throw error;
    }
  },

  /**
   * Get a stripe checkout session for subscription signup
   * @param {string} planType - Plan type to subscribe to
   * @returns {Promise<Object>} Checkout session data with URL
   */
  createCheckoutSession: async (planType) => {
    try {
      const response = await api.post('/api/client/checkout-session', {
        plan_type: planType,
        success_url: `${window.location.origin}/subscription?success=true`,
        cancel_url: `${window.location.origin}/subscription?cancelled=true`
      });
      return response.data;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  /**
   * Get a Stripe billing portal session for subscription management
   * @param {string} returnUrl - URL to return to after billing portal
   * @returns {Promise<Object>} Billing portal session data with URL
   */
  getBillingPortal: async (returnUrl) => {
    try {
      const response = await api.post('/api/client/billing-portal', {
        return_url: returnUrl || `${window.location.origin}/subscription`
      });
      return response.data;
    } catch (error) {
      console.error('Error getting billing portal:', error);
      throw error;
    }
  },

  /**
   * Get recommended subscription plan based on usage
   * @returns {Promise<Object>} Recommendation data
   */
  getRecommendedPlan: async () => {
    try {
      const response = await api.get('/api/client/subscription/recommended');
      return response.data;
    } catch (error) {
      console.error('Error getting recommended plan:', error);
      throw error;
    }
  },

  /**
   * Check if current usage exceeds limits
   * @returns {Promise<Object>} Usage status with limit information
   */
  checkLimits: async () => {
    try {
      const response = await api.get('/api/analytics/subscription/limits');
      return response.data;
    } catch (error) {
      console.error('Error checking subscription limits:', error);
      throw error;
    }
  }
};

export default subscriptionService;