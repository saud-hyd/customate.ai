import api from './api';

/**
 * Service for analytics-related API operations
 */
const analyticsService = {
  getDashboardOverview: async () => {
    try {
      // First sync the data to ensure metrics are accurate
      await analyticsService.syncDashboardData();
      
      // Then fix message counts to ensure correct values
      await analyticsService.fixMessageCounts();
      
      // Now fetch the overview with corrected data
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  },

  getChatPerformance: async (days = 30) => {
    try {
      // First fix message counts to ensure correct metrics
      await analyticsService.fixMessageCounts();
      
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
      // First fix message counts to ensure correct metrics
      await analyticsService.fixMessageCounts();
      
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
      // First fix message counts to ensure correct metrics
      await analyticsService.fixMessageCounts();
      
      const response = await api.get('/api/analytics/subscription/limits');
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription limits:', error);
      throw error;
    }
  },
  
  syncSubscriptionMessages: async () => {
    try {
      const response = await api.post('/api/client/sync-subscription-messages');
      return response.data;
    } catch (error) {
      console.error('Error syncing subscription messages:', error);
      throw error;
    }
  },
  
  fixMessageCounts: async () => {
    try {
      const response = await api.post('/api/client/fix-message-counts');
      return response.data;
    } catch (error) {
      console.error('Error fixing message counts:', error);
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
  },
  
  getDetailedUsageStats: async (days = 30) => {
    try {
      const response = await api.get('/api/analytics/performance', {
        params: { days }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching detailed usage stats:', error);
      throw error;
    }
  },
  
  syncSubscriptionUsage: async () => {
    try {
      const response = await api.post('/api/client/sync-message-counts');
      return response.data;
    } catch (error) {
      console.error('Error syncing subscription usage:', error);
      throw error;
    }
  },
  
  updateUsageData: async () => {
    try {
      const response = await api.post('/api/analytics/update-usage');
      return response.data;
    } catch (error) {
      console.error('Error updating usage data:', error);
      throw error;
    }
  },
  
  syncDashboardData: async () => {
    try {
      const response = await api.post('/api/client/sync-dashboard-data');
      return response.data;
    } catch (error) {
      console.error('Error syncing dashboard data:', error);
      throw error;
    }
  },
  
  getStorageStatistics: async () => {
    try {
      const response = await api.get('/api/analytics/storage');
      return response.data;
    } catch (error) {
      console.error('Error fetching storage statistics:', error);
      throw error;
    }
  }
};

export default analyticsService;