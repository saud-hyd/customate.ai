import api from './api';

const analyticsService = {
  // Get dashboard overview
  async getDashboardOverview(days = 30) {
    const response = await api.get(`/analytics/dashboard?days=${days}`);
    return response.data;
  },
  
  // Get chat performance metrics
  async getChatPerformance(days = 30) {
    const response = await api.get(`/analytics/chat?days=${days}`);
    return response.data;
  },
  
  // Get knowledge usage metrics
  async getKnowledgeUsage(days = 30, collectionId = null) {
    let url = `/analytics/knowledge?days=${days}`;
    if (collectionId) {
      url += `&collection_id=${collectionId}`;
    }
    const response = await api.get(url);
    return response.data;
  },
  
  // Get subscription usage data
  async getSubscriptionUsage(months = 6) {
    const response = await api.get(`/analytics/subscription?months=${months}`);
    return response.data;
  },
  
  // Get API usage statistics
  async getApiUsage(days = 30) {
    const response = await api.get(`/analytics/api-usage?days=${days}`);
    return response.data;
  },
  
  // Check subscription limits
  async checkSubscriptionLimits() {
    const response = await api.get('/analytics/subscription/limits');
    return response.data;
  }
};

export default analyticsService;