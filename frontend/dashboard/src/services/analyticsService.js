// frontend/dashboard/src/services/analyticsService.js
import api from './api';

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Service for analytics-related API operations with improved caching
 */
const analyticsService = {
  // Track last data refresh time and cache state
  lastSyncTime: null,
  dataCache: {},
  
  // Check if data needs refreshing
  needsRefresh: () => {
    if (!analyticsService.lastSyncTime) return true;
    const now = new Date().getTime();
    const lastSync = analyticsService.lastSyncTime.getTime();
    return (now - lastSync) > CACHE_DURATION;
  },
  
  // Manual refresh function to be triggered by button
  refreshAllData: async (showToast = true) => {
    try {
      // Perform the sync operations
      await analyticsService.syncDashboardData();
      await analyticsService.fixMessageCounts();
      
      // Update timestamp
      analyticsService.lastSyncTime = new Date();
      analyticsService.dataCache = {}; // Clear cache after sync
      
      if (showToast && window.toast) {
        window.toast.success('Analytics data refreshed successfully');
      }
      
      return { success: true, timestamp: analyticsService.lastSyncTime };
    } catch (error) {
      console.error('Error refreshing data:', error);
      if (showToast && window.toast) {
        window.toast.error('Failed to refresh analytics data');
      }
      throw error;
    }
  },
  
  // Get dashboard overview without extra operations
  getDashboardOverview: async () => {
    try {
      const cacheKey = 'dashboardOverview';
      
      // Use cached data if available and fresh
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/dashboard');
      analyticsService.dataCache[cacheKey] = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard overview:', error);
      throw error;
    }
  },

  getChatPerformance: async (days = 30) => {
    try {
      const cacheKey = `chatPerformance_${days}`;
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/chat', {
        params: { days }
      });
      
      analyticsService.dataCache[cacheKey] = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching chat performance:', error);
      throw error;
    }
  },

  getKnowledgeUsage: async (days = 30, collectionId = null) => {
    try {
      const cacheKey = `knowledgeUsage_${days}_${collectionId || 'all'}`;
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const params = { days };
      if (collectionId) params.collection_id = collectionId;
      
      const response = await api.get('/api/analytics/knowledge', { params });
      
      analyticsService.dataCache[cacheKey] = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching knowledge usage:', error);
      throw error;
    }
  },

  getSubscriptionUsage: async (months = 6) => {
    try {
      const cacheKey = `subscriptionUsage_${months}`;
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/subscription', {
        params: { months }
      });
      
      analyticsService.dataCache[cacheKey] = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching subscription usage:', error);
      throw error;
    }
  },

  getApiUsage: async (days = 30) => {
    try {
      const cacheKey = `apiUsage_${days}`;
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/api-usage', {
        params: { days }
      });
      
      analyticsService.dataCache[cacheKey] = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching API usage:', error);
      throw error;
    }
  },

  getSubscriptionLimits: async () => {
    try {
      const cacheKey = 'subscriptionLimits';
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/subscription/limits');
      
      analyticsService.dataCache[cacheKey] = response.data;
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
      // Clear cache when analytics are reset
      analyticsService.dataCache = {};
      analyticsService.lastSyncTime = null;
      
      const response = await api.post('/api/analytics/reset');
      return response.data;
    } catch (error) {
      console.error('Error resetting analytics:', error);
      throw error;
    }
  },
  
  getDetailedUsageStats: async (days = 30) => {
    try {
      const cacheKey = `detailedUsage_${days}`;
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/performance', {
        params: { days }
      });
      
      analyticsService.dataCache[cacheKey] = response.data;
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
      analyticsService.lastSyncTime = new Date(); // Update sync time
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
      const cacheKey = 'storageStatistics';
      
      if (analyticsService.dataCache[cacheKey] && !analyticsService.needsRefresh()) {
        return analyticsService.dataCache[cacheKey];
      }
      
      const response = await api.get('/api/analytics/storage');
      
      analyticsService.dataCache[cacheKey] = response.data;
      return response.data;
    } catch (error) {
      console.error('Error fetching storage statistics:', error);
      throw error;
    }
  }
};

export default analyticsService;