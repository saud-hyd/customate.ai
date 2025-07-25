// Path: frontend/dashboard/src/services/analyticsService.js
// Usage: Enhanced analytics service with voice analytics and channel comparison
// MODIFICATION: Add voice analytics methods to existing analytics service

import api from './api';
import { isDevelopment } from '../utils/environment';

// EXISTING: Increased cache duration to reduce API load
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Enhanced Analytics Service with Voice Integration
 */
const analyticsService = {
  // EXISTING: Track last data refresh time and cache state
  lastSyncTime: null,
  dataCache: {},
  pendingRequests: {},
  
  // EXISTING: Check if data needs refreshing
  needsRefresh: () => {
    if (!analyticsService.lastSyncTime) return true;
    const now = new Date().getTime();
    const lastSync = analyticsService.lastSyncTime.getTime();
    return (now - lastSync) > CACHE_DURATION;
  },
  
  // EXISTING: Cache key generator with params
  getCacheKey: (baseKey, params = {}) => {
    return `${baseKey}${Object.keys(params).length ? '_' + JSON.stringify(params) : ''}`;
  },
  
  // EXISTING: Request manager to prevent duplicate requests
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

  // EXISTING: Get API usage with improved request management
  getApiUsage: async (days = 30) => {
    const key = analyticsService.getCacheKey('apiUsage', { days });
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/api-usage', {
        params: { days }
      }).then(response => response.data);
    });
  },
  
  // EXISTING: Manual refresh function
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
  
  // EXISTING: Get dashboard overview
  getDashboardOverview: async () => {
    const key = 'dashboardOverview';
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/dashboard').then(response => response.data);
    });
  },

  // EXISTING: Get chat performance
  getChatPerformance: async (days = 30) => {
    const key = analyticsService.getCacheKey('chatPerformance', { days });
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/chat', {
        params: { days }
      }).then(response => response.data);
    });
  },

  // EXISTING: Get knowledge usage
  getKnowledgeUsage: async (days = 30, collectionId = null) => {
    const key = analyticsService.getCacheKey('knowledgeUsage', { days, collectionId });
    return analyticsService.requestManager(key, () => {
      const params = { days };
      if (collectionId) params.collection_id = collectionId;
      
      return api.get('/api/analytics/knowledge', { params }).then(response => response.data);
    });
  },

  // EXISTING: Get subscription usage
  getSubscriptionUsage: async (months = 6) => {
    const key = analyticsService.getCacheKey('subscriptionUsage', { months });
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/subscription', {
        params: { months }
      }).then(response => response.data);
    });
  },

  // EXISTING: Get storage statistics
  getStorageStatistics: async () => {
    const key = 'storageStatistics';
    return analyticsService.requestManager(key, () => {
      return api.get('/api/analytics/storage').then(response => response.data);
    });
  },

  // NEW: Voice Analytics Methods
  voice: {
    // Get voice analytics overview
    getAnalytics: async (days = 30) => {
      const key = analyticsService.getCacheKey('voiceAnalytics', { days });
      return analyticsService.requestManager(key, () => {
        return api.get('/api/telephony/analytics/calls', {
          params: { days }
        }).then(response => response.data);
      });
    },

    // Get voice usage metrics
    getUsage: async () => {
      const key = 'voiceUsage';
      return analyticsService.requestManager(key, () => {
        return api.get('/api/telephony/analytics/usage').then(response => response.data);
      });
    },

    // Get call quality metrics
    getQualityMetrics: async (days = 30) => {
      const key = analyticsService.getCacheKey('voiceQuality', { days });
      return analyticsService.requestManager(key, () => {
        return api.get('/api/telephony/analytics/quality', {
          params: { days }
        }).then(response => response.data);
      });
    },

    // Get voice conversation trends
    getTrends: async (days = 30) => {
      const key = analyticsService.getCacheKey('voiceTrends', { days });
      return analyticsService.requestManager(key, () => {
        return api.get('/api/telephony/analytics/trends', {
          params: { days }
        }).then(response => response.data);
      });
    }
  },

  // NEW: Channel Comparison Analytics
  channels: {
    // Compare text vs voice performance
    getComparison: async (days = 30) => {
      const key = analyticsService.getCacheKey('channelComparison', { days });
      return analyticsService.requestManager(key, async () => {
        try {
          // Fetch both text and voice analytics in parallel
          const [textData, voiceData] = await Promise.allSettled([
            analyticsService.getChatPerformance(days),
            analyticsService.voice.getAnalytics(days)
          ]);

          // Process the results
          const textResult = textData.status === 'fulfilled' ? textData.value : null;
          const voiceResult = voiceData.status === 'fulfilled' ? voiceData.value : null;

          return {
            text: textResult,
            voice: voiceResult,
            comparison: analyticsService.channels.generateComparison(textResult, voiceResult)
          };
        } catch (error) {
          console.error('Error fetching channel comparison:', error);
          throw error;
        }
      });
    },

    // Generate comparison metrics between channels
    generateComparison: (textData, voiceData) => {
      const textInteractions = textData?.summary?.total_messages || 0;
      const voiceInteractions = voiceData?.summary?.total_calls || 0;
      const totalInteractions = textInteractions + voiceInteractions;

      return {
        total_interactions: totalInteractions,
        text_percentage: totalInteractions > 0 ? (textInteractions / totalInteractions) * 100 : 0,
        voice_percentage: totalInteractions > 0 ? (voiceInteractions / totalInteractions) * 100 : 0,
        text_engagement: {
          avg_session_length: textData?.summary?.messages_per_session || 0,
          response_time: textData?.summary?.avg_response_time_ms || 0
        },
        voice_engagement: {
          avg_call_duration: voiceData?.summary?.average_duration || 0,
          completion_rate: voiceData?.summary?.completion_rate || 0
        },
        insights: analyticsService.channels.generateInsights(textData, voiceData)
      };
    },

    // Generate insights from channel comparison
    generateInsights: (textData, voiceData) => {
      const insights = [];
      
      const textMessages = textData?.summary?.total_messages || 0;
      const voiceCalls = voiceData?.summary?.total_calls || 0;
      
      if (textMessages > voiceCalls * 10) {
        insights.push({
          type: 'text_dominant',
          message: 'Text conversations are the primary channel',
          recommendation: 'Consider promoting voice features for complex queries'
        });
      } else if (voiceCalls > textMessages) {
        insights.push({
          type: 'voice_dominant',
          message: 'Voice conversations are gaining popularity',
          recommendation: 'Optimize voice response quality and speed'
        });
      }

      const voiceCompletion = voiceData?.summary?.completion_rate || 0;
      if (voiceCompletion < 80) {
        insights.push({
          type: 'voice_quality',
          message: 'Voice call completion rate could be improved',
          recommendation: 'Review voice agent responses and call quality'
        });
      }

      return insights;
    },

    // Get performance trends across channels
    getTrends: async (days = 30) => {
      const key = analyticsService.getCacheKey('channelTrends', { days });
      return analyticsService.requestManager(key, async () => {
        try {
          const [textTrends, voiceTrends] = await Promise.allSettled([
            api.get('/api/analytics/chat', { params: { days } }),
            api.get('/api/telephony/analytics/calls', { params: { days } })
          ]);

          return {
            text: textTrends.status === 'fulfilled' ? textTrends.value.data : null,
            voice: voiceTrends.status === 'fulfilled' ? voiceTrends.value.data : null,
            combined: analyticsService.channels.combineTrends(
              textTrends.status === 'fulfilled' ? textTrends.value.data : null,
              voiceTrends.status === 'fulfilled' ? voiceTrends.value.data : null
            )
          };
        } catch (error) {
          console.error('Error fetching channel trends:', error);
          throw error;
        }
      });
    },

    // Combine trends from different channels
    combineTrends: (textData, voiceData) => {
      if (!textData?.time_series && !voiceData?.call_volume_trend) {
        return [];
      }

      const combined = {};
      
      // Process text data
      if (textData?.time_series) {
        textData.time_series.forEach(item => {
          combined[item.date] = {
            date: item.date,
            text_interactions: item.total_messages || 0,
            voice_interactions: 0
          };
        });
      }
      
      // Process voice data
      if (voiceData?.call_volume_trend) {
        voiceData.call_volume_trend.forEach(item => {
          if (combined[item.date]) {
            combined[item.date].voice_interactions = item.calls || 0;
          } else {
            combined[item.date] = {
              date: item.date,
              text_interactions: 0,
              voice_interactions: item.calls || 0
            };
          }
        });
      }
      
      return Object.values(combined).sort((a, b) => new Date(a.date) - new Date(b.date));
    }
  },

  // ENHANCED: Combined analytics methods
  getCombinedOverview: async (days = 30) => {
    const key = analyticsService.getCacheKey('combinedOverview', { days });
    return analyticsService.requestManager(key, async () => {
      try {
        // Fetch all analytics in parallel
        const [dashboard, textData, voiceData, channelComparison] = await Promise.allSettled([
          analyticsService.getDashboardOverview(),
          analyticsService.getChatPerformance(days),
          analyticsService.voice.getAnalytics(days),
          analyticsService.channels.getComparison(days)
        ]);

        return {
          dashboard: dashboard.status === 'fulfilled' ? dashboard.value : null,
          text: textData.status === 'fulfilled' ? textData.value : null,
          voice: voiceData.status === 'fulfilled' ? voiceData.value : null,
          channels: channelComparison.status === 'fulfilled' ? channelComparison.value : null,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error('Error fetching combined analytics:', error);
        throw error;
      }
    });
  },

  // NEW: Real-time analytics for voice
  realtime: {
    // Get live call status
    getLiveCalls: async () => {
      // This would not be cached as it's real-time data
      return api.get('/api/telephony/calls/live').then(response => response.data);
    },

    // Get real-time metrics
    getMetrics: async () => {
      // This would not be cached as it's real-time data
      return api.get('/api/analytics/realtime').then(response => response.data);
    }
  },

  // ENHANCED: Clear cache methods with voice support
  clearCache: (pattern = null) => {
    if (pattern) {
      // Clear cache entries matching pattern
      Object.keys(analyticsService.dataCache).forEach(key => {
        if (key.includes(pattern)) {
          delete analyticsService.dataCache[key];
        }
      });
    } else {
      // Clear all cache
      analyticsService.dataCache = {};
    }
    analyticsService.lastSyncTime = null;
  },

  clearVoiceCache: () => {
    analyticsService.clearCache('voice');
    analyticsService.clearCache('telephony');
    analyticsService.clearCache('channel');
  },

  // NEW: Voice-specific refresh
  refreshVoiceData: async () => {
    analyticsService.clearVoiceCache();
    
    try {
      await Promise.all([
        analyticsService.voice.getAnalytics(),
        analyticsService.voice.getUsage(),
        analyticsService.channels.getComparison()
      ]);
      
      if (window.toast) {
        window.toast.success('Voice analytics refreshed');
      }
    } catch (error) {
      console.error('Error refreshing voice data:', error);
      if (window.toast) {
        window.toast.error('Failed to refresh voice analytics');
      }
      throw error;
    }
  }
};

export default analyticsService;