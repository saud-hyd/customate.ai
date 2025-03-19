// Path: frontend/dashboard/src/services/dashboardService.js
import api from './api';

const dashboardService = {
  // Get dashboard overview
  async getDashboardOverview() {
    try {
      const response = await api.get('/api/analytics/dashboard');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      throw error;
    }
  },

  // Get recent activity
  async getRecentActivity() {
    try {
      const response = await api.get('/api/client/activity');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      // Return empty array if endpoint doesn't exist yet
      return { activities: [] };
    }
  },

  // Get subscription status
  async getSubscriptionStatus() {
    try {
      const response = await api.get('/api/analytics/subscription/limits');
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription status:', error);
      throw error;
    }
  }
};

export default dashboardService;