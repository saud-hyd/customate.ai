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
   * Get standardized plan information with pricing - Updated to match marketing website
   * @returns {Object} Plan configurations
   */
  getPlans: () => {
    return {
      free: {
        name: 'Free',
        description: 'Perfect for trying out Customate.ai',
        price: { monthly: '$0', annually: '$0' },
        messageLimit: 100,
        storageLimit: '500 KB',
        storageLimitMB: 0.5,
        features: [
          '100 messages per month',
          '500 KB storage',
          'Basic chatbot customization'
        ],
        cta: 'Current Plan',
        highlighted: false,
      },
      basic: {
        name: 'Basic',
        description: 'For small businesses and startups',
        price: { monthly: '$25', annually: '$19' },
        messageLimit: 3000,
        storageLimit: '5 MB',
        storageLimitMB: 5,
        features: [
          '3,000 messages per month',
          '5 MB storage',
          'Email support',
          'Analytics dashboard',
          'API access'
        ],
        cta: 'Upgrade',
        highlighted: false,
      },
      standard: {
        name: 'Standard',
        description: 'For growing businesses with advanced needs',
        price: { monthly: '$75', annually: '$59' },
        messageLimit: 10000,
        storageLimit: '25 MB',
        storageLimitMB: 25,
        features: [
          '10,000 messages per month',
          '25 MB storage',
          'Advanced chatbot customization',
          'Priority email support',
          'Advanced analytics'
        ],
        cta: 'Upgrade',
        highlighted: true, // Highlighted as the recommended plan
      },
      professional: {
        name: 'Professional',
        description: 'For organizations with complex requirements',
        price: { monthly: '$225', annually: '$199' },
        messageLimit: 40000,
        storageLimit: '35 MB',
        storageLimitMB: 35,
        features: [
          '40,000 messages per month',
          '35 MB storage',
          'Custom deployment options',
          'Dedicated account manager',
          'Phone & email support',
          'Custom integrations'
        ],
        cta: 'Upgrade',
        highlighted: false,
      },
    };
  },

  /**
   * Change the current subscription plan
   * @param {string} planType - The plan type to change to (free, basic, standard, professional)
   * @param {string} billingCycle - The billing cycle (monthly, annually)
   * @returns {Promise<Object>} Updated subscription data
   */
  changePlan: async (planType, billingCycle = 'monthly') => {
    try {
      // Call the change endpoint
      const response = await api.post('/api/client/subscription/change', { 
        plan_type: planType,
        billing_cycle: billingCycle
      });
      
      // ✅ FIX: Handle checkout redirect for upgrades
      if (response.data.action === 'redirect_to_checkout') {
        // Redirect to Stripe Checkout for payment
        window.location.href = response.data.checkout_url;
        return response.data; // This won't execute due to redirect
      }
      
      // For other plan changes (downgrades, same tier), return normal response
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