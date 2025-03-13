// src/services/analyticsService.js
import api from './api';

/**
 * Service for fetching analytics data from the API
 * Provides methods to access various analytics endpoints
 */
const analyticsService = {
  // Get dashboard overview analytics
  async getDashboardOverview() {
    const response = await api.get('/analytics/dashboard');
    return response.data;
  },
  
  // Get chat performance report
  async getChatPerformance(days = 30) {
    const response = await api.get('/analytics/chat-performance', {
      params: { days }
    });
    return response.data;
  },
  
  // Get knowledge usage report
  async getKnowledgeUsage(days = 30, collectionId = null) {
    const params = { days };
    if (collectionId) params.collection_id = collectionId;
    
    const response = await api.get('/analytics/knowledge-usage', { params });
    return response.data;
  },
  
  // Get subscription usage report
  async getSubscriptionUsage(months = 6) {
    const response = await api.get('/analytics/subscription-usage', {
      params: { months }
    });
    return response.data;
  },
  
  // Get API usage report
  async getApiUsage(days = 30) {
    const response = await api.get('/analytics/api-usage', {
      params: { days }
    });
    return response.data;
  },
  
  // Get user activity report
  async getUserActivity(days = 30) {
    const response = await api.get('/analytics/user-activity', {
      params: { days }
    });
    return response.data;
  }
};

export default analyticsService;