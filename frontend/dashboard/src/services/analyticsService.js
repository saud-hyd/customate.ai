// frontend/dashboard/src/services/analyticsService.js
import api from './api';

const analyticsService = {
  // Get dashboard overview analytics
  async getDashboardOverview() {
    try {
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  },
  
  // Get chat performance report
  async getChatPerformance(days = 30) {
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
  
  // Get knowledge usage report
  async getKnowledgeUsage(days = 30, collectionId = null) {
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
  
  // Get subscription usage report
  async getSubscriptionUsage(months = 6) {
    try {
      const response = await api.get('/api/analytics/subscription', {
        params: { months }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      throw error;
    }
  }
};

export default analyticsService;