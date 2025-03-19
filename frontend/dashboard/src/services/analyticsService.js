// Path: frontend/dashboard/src/services/analyticsService.js
import api from './api';

/**
 * Service for analytics-related API operations
 */
const analyticsService = {
  getDashboardOverview: async () => {
    try {
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  },

  getChatPerformance: async (days = 30) => {
    try {
      const response = await api.get('/api/analytics/chat', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chat performance:', error);
      throw error;
    }
  },

  getKnowledgeUsage: async (days = 30, collectionId = null) => {
    try {
      const params = { days };
      if (collectionId) params.collection_id = collectionId;
      
      const response = await api.get('/api/analytics/knowledge', { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching knowledge usage:', error);
      throw error;
    }
  },

  getSubscriptionUsage: async (months = 6) => {
    try {
      const response = await api.get('/api/analytics/subscription', {
        params: { months }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      throw error;
    }
  },

  getApiUsage: async (days = 30) => {
    try {
      const response = await api.get('/api/analytics/api-usage', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching API usage:', error);
      throw error;
    }
  },

  getSubscriptionLimits: async () => {
    try {
      const response = await api.get('/api/analytics/subscription/limits');
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
      throw error;
    }
  },

  resetAnalytics: async () => {
    try {
      const response = await api.post('/api/analytics/reset');
      return response.data;
    } catch (error) {
      console.error('Error resetting analytics:', error);
      throw error;
    }
  }
};

export default analyticsService;