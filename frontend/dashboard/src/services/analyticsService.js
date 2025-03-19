// Path: frontend/dashboard/src/services/analyticsService.js
import api from './api';

/**
 * Service for analytics-related API operations
 */
const analyticsService = {
  /**
   * Get dashboard overview data
   * @returns {Promise<Object>} Dashboard overview data
   */
  getDashboardOverview: async () => {
    try {
      const response = await api.get('/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  },

  /**
   * Get chat performance metrics
   * @param {number} days - Number of days to include in the time series
   * @returns {Promise<Object>} Chat performance metrics
   */
  getChatPerformance: async (days = 30) => {
    try {
      const response = await api.get('/analytics/chat', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chat performance:', error);
      throw error;
    }
  },

  /**
   * Get knowledge base usage metrics
   * @param {number} days - Number of days to include in the time series
   * @returns {Promise<Object>} Knowledge base usage metrics
   */
  getKnowledgeUsage: async (days = 30) => {
    try {
      const response = await api.get('/analytics/knowledge', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching knowledge usage:', error);
      throw error;
    }
  },

  /**
   * Get subscription usage metrics
   * @param {number} months - Number of months of historical data to include
   * @returns {Promise<Object>} Subscription usage metrics
   */
  getSubscriptionUsage: async (months = 6) => {
    try {
      const response = await api.get('/analytics/subscription', {
        params: { months }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      throw error;
    }
  },

  /**
   * Get API usage metrics
   * @param {number} days - Number of days to include in the time series
   * @returns {Promise<Object>} API usage metrics
   */
  getApiUsage: async (days = 30) => {
    try {
      const response = await api.get('/analytics/api', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching API usage:', error);
      throw error;
    }
  },

  /**
   * Get user engagement metrics
   * @param {number} days - Number of days to include in the time series
   * @returns {Promise<Object>} User engagement metrics
   */
  getUserEngagement: async (days = 30) => {
    try {
      const response = await api.get('/analytics/engagement', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching user engagement:', error);
      throw error;
    }
  },

  /**
   * Get analytics for a specific conversation
   * @param {string} sessionId - Chat session ID
   * @returns {Promise<Object>} Conversation analytics
   */
  getConversationAnalytics: async (sessionId) => {
    try {
      const response = await api.get(`/analytics/conversation/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation analytics:', error);
      throw error;
    }
  },

  /**
   * Reset analytics cache (for debugging or when data is stale)
   * @returns {Promise<Object>} Success status
   */
  resetAnalytics: async () => {
    try {
      const response = await api.post('/analytics/reset');
      return response.data;
    } catch (error) {
      console.error('Error resetting analytics:', error);
      throw error;
    }
  },

  /**
   * Export analytics data (CSV/JSON)
   * @param {string} type - Type of analytics to export (chat, knowledge, subscription, api)
   * @param {string} format - Export format (csv, json)
   * @param {number} days - Number of days of data to export
   * @returns {Promise<Blob>} Exported data blob
   */
  exportAnalytics: async (type, format = 'csv', days = 30) => {
    try {
      const response = await api.get(`/analytics/export/${type}`, {
        params: { format, days },
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting analytics:', error);
      throw error;
    }
  }
};

export default analyticsService;