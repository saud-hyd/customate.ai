// frontend/dashboard/src/services/analyticsService.js
import api from './api';
import { isDevelopment } from '../utils/environment';


// Increased cache duration to reduce API load
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Service for analytics-related API operations with improved caching
 */
const analyticsService = {
  // Track last data refresh time and cache state
  lastSyncTime: null,
  dataCache: {},
  pendingRequests: {},
  
  // Check if data needs refreshing
  needsRefresh: () => {
    if (!analyticsService.lastSyncTime) return true;
    const now = new Date().getTime();
    const lastSync = analyticsService.lastSyncTime.getTime();
    return (now - lastSync) > CACHE_DURATION;
  },
  
  // Cache key generator with params
  getCacheKey: (baseKey, params = {}) => {
    return `${baseKey}${Object.keys(params).length ? '_' + JSON.stringify(params) : ''}`;
  },
  
  // Request manager to prevent duplicate requests
  requestManager: async (key, apiCall) => {
    // Return from cache if fresh
    if (analyticsService.dataCache[key] && !analyticsService.needsRefresh()) {
      console.log(`Using cached data for ${key}`);
      return analyticsService.dataCache[key];
    }
    
    // If we already have a pending request for this key, return that promise
    if (analyticsService.pendingRequests[key]) {
      console.log(`Using pending request for ${key}`);
      return analyticsService.pendingRequests[key];
    }
    
    // Otherwise, make a new request
    console.log(`Fetching fresh data for ${key}`);
    try {
      analyticsService.pendingRequests[key] = apiCall();
      const result = await analyticsService.pendingRequests[key];
      
      // Cache the result
      analyticsService.dataCache[key] = result;
      if (!analyticsService.lastSyncTime) {
        analyticsService.lastSyncTime = new Date();
      }
      
      // Clean up the pending request
      delete analyticsService.pendingRequests[key];
      
      return result;
    } catch (error) {
      // Clean up the pending request on error
      delete analyticsService.pendingRequests[key];
      throw error;
    }
  },
  
  // Manual refresh function
  refreshAllData: async (showToast = true) => {
    try {
      // Clear all cache and pending requests
      analyticsService.dataCache = {};
      analyticsService.pendingRequests = {};
      analyticsService.lastSyncTime = null;
      
      // Fetch fresh dashboard data
      await analyticsService.getDashboardOverview();
      
      // Update timestamp
      analyticsService.lastSyncTime = new Date();
      
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
  
  // Get dashboard overview
  getDashboardOverview: async () => {
    const key = 'dashboardOverview';
    return analyticsService.requestManager(key, () => {
      // Use the correct endpoint that exists in backend
      return api.get('/api/analytics/dashboard').then(response => response.data);
    });
  },

  // Get chat performance with improved request management
  getChatPerformance: async (days = 30) => {
    const key = analyticsService.getCacheKey('chatPerformance', { days });
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/chat', {
        params: { days }
      }).then(response => response.data);
    });
  },

  // Get knowledge usage with improved request management
  getKnowledgeUsage: async (days = 30, collectionId = null) => {
    const key = analyticsService.getCacheKey('knowledgeUsage', { days, collectionId });
    return analyticsService.requestManager(key, () => {
      const params = { days };
      if (collectionId) params.collection_id = collectionId;
      
      return api.get('/api/analytics/knowledge', { params }).then(response => response.data);
    });
  },

  // Get subscription usage with improved request management
  getSubscriptionUsage: async (months = 6) => {
    const key = analyticsService.getCacheKey('subscriptionUsage', { months });
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/subscription', {
        params: { months }
      }).then(response => response.data);
    });
  },

  // Get API usage with improved request management
  getSubscriptionLimits: async () => {
    const key = 'subscriptionLimits';
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/subscription/limits').then(response => response.data);
    });
  },
  
  // Fix message counts - clear cache after operation
  fixMessageCounts: async () => {
    try {
      const response = await api.post('/api/client/sync-subscription-messages');
      
      // Clear cache to ensure fresh data
      analyticsService.dataCache = {};
      analyticsService.pendingRequests = {};
      analyticsService.lastSyncTime = new Date();
      
      return response.data;
    } catch (error) {
      console.error('Error fixing message counts:', error);
      throw error;
    }
  },
  
  // Reset analytics
  resetAnalytics: async () => {
    try {
      // Clear cache
      analyticsService.dataCache = {};
      analyticsService.pendingRequests = {};
      analyticsService.lastSyncTime = null;
      
      const response = await api.post('/api/analytics/reset');
      return response.data;
    } catch (error) {
      console.error('Error resetting analytics:', error);
      throw error;
    }
  },
  
  // Get storage statistics
  getStorageStatistics: async () => {
    const key = 'storageStatistics';
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/storage').then(response => response.data);
    });
  }
};
if (isDevelopment) {
  console.log('Analytics Service initialized with cache duration:', CACHE_DURATION);
}

export default analyticsService;