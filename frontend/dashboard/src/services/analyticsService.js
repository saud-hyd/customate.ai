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
      // Return some default structure to avoid breaking the UI
      return {
        today: {
          sessions: 0,
          messages: 0,
          searches: 0,
          users: 0,
          knowledge_usage_ratio: 0
        },
        monthly: {
          total_sessions: 0,
          total_messages: 0,
          total_searches: 0,
          avg_knowledge_usage_ratio: 0
        },
        time_series: []
      };
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
      // Return default structure
      return {
        summary: {
          total_sessions: 0,
          total_messages: 0,
          avg_response_time_ms: 0,
          knowledge_usage_percentage: 0,
          messages_per_session: 0
        },
        time_series: []
      };
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
      // Return default structure
      return {
        summary: {
          total_searches: 0,
          avg_relevance_score: 0,
          current_items: 0,
          current_documents: 0
        },
        collection_distribution: [],
        time_series: []
      };
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
      // Return default structure
      return {
        current: {
          messages: {
            used: 0,
            limit: 1000,
            percentage: 0
          },
          users: {
            used: 0,
            limit: 100,
            percentage: 0
          },
          storage: {
            used_bytes: 0,
            limit_bytes: 104857600, // 100MB
            used_mb: 0,
            limit_mb: 100,
            percentage: 0
          }
        },
        historical: [],
        subscription: {
          plan_type: 'Free',
          status: 'active'
        }
      };
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
      // Return default structure
      return {
        summary: {
          total_requests: 0,
          avg_response_time_ms: 0,
          success_rate: 100,
          error_rate: 0
        },
        daily_usage: [],
        endpoint_stats: {
          endpoints: [],
          status_codes: []
        }
      };
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
      // Return default structure
      return {
        summary: {
          avg_session_duration_ms: 0,
          messages_per_session: 0,
          bounce_rate: 0,
          completion_rate: 0
        },
        time_series: [],
        hourly_distribution: Array(24).fill().map((_, i) => ({ hour: i, sessions: 0 }))
      };
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
      console.warn('Analytics reset endpoint not available:', error);
      // Return a default success response instead of throwing an error
      return { success: true, message: 'Analytics reset not available' };
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