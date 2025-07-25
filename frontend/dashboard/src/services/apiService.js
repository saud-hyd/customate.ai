// Path: frontend/dashboard/src/services/apiService.js
// Usage: Enhanced API service with voice and telephony endpoint support
// MODIFICATION: Add voice/telephony endpoints to existing API configuration

import axios from 'axios';

// Get base URL from environment or default to current domain
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    return window.location.origin;
  }
  return process.env.REACT_APP_API_URL || 'http://localhost:8000';
};

// Create axios instance with enhanced configuration
const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 30000, // ENHANCED: Increased timeout for voice processing
  headers: {
    'Content-Type': 'application/json',
  },
});

// EXISTING: Request interceptor for authentication
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // NEW: Enhanced timeout for voice endpoints
    if (config.url && (config.url.includes('/voice/') || config.url.includes('/telephony/'))) {
      config.timeout = 45000; // 45 seconds for voice processing
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// EXISTING: Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }

    // NEW: Enhanced error handling for voice/telephony errors
    if (error.response?.status === 503 && error.config?.url?.includes('/telephony/')) {
      console.warn('Telephony service temporarily unavailable');
      error.isTemporaryVoiceError = true;
    }

    // Handle network errors
    if (!error.response) {
      error.isNetworkError = true;
    }

    return Promise.reject(error);
  }
);

// EXISTING: API service object with new voice methods
const apiService = {
  // EXISTING: Authentication methods
  login: (credentials) => api.post('/api/auth/login', credentials),
  logout: () => api.post('/api/auth/logout'),
  refreshToken: () => api.post('/api/auth/refresh'),
  
  // EXISTING: Chat and conversation methods
  sendMessage: (data) => api.post('/api/chatbot/message', data),
  getConversations: (channelId, params = {}) => 
    api.get(`/api/channels/${channelId}/conversations`, { params }),
  getConversationDetails: (channelId, conversationId) =>
    api.get(`/api/channels/${channelId}/conversations/${conversationId}`),
  
  // EXISTING: Analytics methods
  getDashboardOverview: () => api.get('/api/analytics/dashboard'),
  getChatPerformance: (params = {}) => api.get('/api/analytics/chat', { params }),
  getKnowledgeUsage: (params = {}) => api.get('/api/analytics/knowledge', { params }),
  
  // EXISTING: Subscription methods
  getCurrentSubscription: () => api.get('/api/client/subscription'),
  changePlan: (planData) => api.post('/api/client/subscription/change', planData),
  
  // NEW: Voice Processing Endpoints
  voice: {
    // Speech-to-text conversion
    speechToText: (formData) => api.post('/api/voice/stt', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000
    }),
    
    // Text-to-speech conversion
    textToSpeech: (data) => api.post('/api/voice/tts', data, {
      timeout: 30000
    }),
    
    // Full voice interaction pipeline
    processInteraction: (formData) => api.post('/api/voice/interact', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000
    }),
    
    // Test voice synthesis
    testSynthesis: (data) => api.post('/api/voice/test-synthesis', data),
    
    // Get voice capabilities
    getCapabilities: () => api.get('/api/voice/capabilities'),
    
    // Voice configuration
    getConfig: () => api.get('/api/voice/config'),
    updateConfig: (config) => api.put('/api/voice/config', config),
    
    // Voice usage and analytics
    getUsage: (params = {}) => api.get('/api/voice/usage', { params }),
    getAnalytics: (params = {}) => api.get('/api/voice/analytics', { params }),
    
    // Voice conversations
    getConversations: (params = {}) => api.get('/api/voice/conversations', { params }),
    getConversationDetails: (conversationId) => 
      api.get(`/api/voice/conversations/${conversationId}`),
    
    // Audio validation
    validateAudio: (formData) => api.post('/api/voice/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    
    // Cancel voice processing
    cancelProcessing: (sessionId) => api.post(`/api/voice/cancel/${sessionId}`)
  },

  // NEW: Telephony Endpoints
  telephony: {
    // Phone number management
    getPhoneNumbers: () => api.get('/api/telephony/numbers'),
    searchNumbers: (params = {}) => api.get('/api/telephony/numbers/search', { params }),
    purchaseNumber: (numberData) => api.post('/api/telephony/numbers/purchase', numberData),
    releaseNumber: (phoneNumber) => api.delete(`/api/telephony/numbers/${phoneNumber}`),
    updateNumberConfig: (phoneNumber, config) => 
      api.put(`/api/telephony/numbers/${phoneNumber}`, config),
    
    // Call management
    getCalls: (params = {}) => api.get('/api/telephony/calls', { params }),
    getCallDetails: (callId) => api.get(`/api/telephony/calls/${callId}`),
    getCallRecording: (callId) => api.get(`/api/telephony/calls/${callId}/recording`),
    getCallTranscript: (callId) => api.get(`/api/telephony/calls/${callId}/transcript`),
    terminateCall: (callId) => api.post(`/api/telephony/calls/${callId}/terminate`),
    updateCallMetadata: (callId, updates) => 
      api.patch(`/api/telephony/calls/${callId}`, updates),
    
    // Call testing
    initiateTestCall: (testConfig) => api.post('/api/telephony/test-call', testConfig),
    testVoiceInteraction: (formData) => api.post('/api/telephony/voice/test', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 45000
    }),
    
    // Analytics and reporting
    getCallAnalytics: (params = {}) => api.get('/api/telephony/analytics/calls', { params }),
    getVoiceUsage: () => api.get('/api/telephony/analytics/usage'),
    getQualityMetrics: (params = {}) => 
      api.get('/api/telephony/analytics/quality', { params }),
    
    // Configuration and account
    getTelephonyConfig: () => api.get('/api/telephony/config'),
    updateTelephonyConfig: (config) => api.put('/api/telephony/config', config),
    verifyTwilioConfig: () => api.post('/api/telephony/verify'),
    getAccountInfo: () => api.get('/api/telephony/account'),
    
    // Webhook management
    getWebhookLogs: (params = {}) => api.get('/api/telephony/webhooks/logs', { params }),
    
    // Data export
    exportCallData: (exportOptions) => api.post('/api/telephony/export', exportOptions),
    getExportStatus: (jobId) => api.get(`/api/telephony/export/${jobId}/status`),
    
    // Real-time operations
    getCallStatus: (callId) => api.get(`/api/telephony/calls/${callId}/status`)
  },

  // ENHANCED: Existing analytics with voice integration
  analytics: {
    // Dashboard overview (enhanced to include voice metrics)
    getDashboard: () => api.get('/api/analytics/dashboard'),
    
    // Chat analytics (existing)
    getChatPerformance: (params = {}) => api.get('/api/analytics/chat', { params }),
    
    // Knowledge analytics (existing)
    getKnowledgeUsage: (params = {}) => api.get('/api/analytics/knowledge', { params }),
    
    // NEW: Combined channel analytics
    getChannelComparison: (params = {}) => 
      api.get('/api/analytics/channels/comparison', { params }),
    
    // API usage analytics (existing, enhanced)
    getApiUsage: (params = {}) => api.get('/api/analytics/api-usage', { params }),
    
    // Storage analytics (existing)
    getStorageStats: () => api.get('/api/analytics/storage')
  },

  // ENHANCED: Conversation service with voice support
  conversations: {
    // Get mixed conversations (text + voice)
    getAll: (params = {}) => api.get('/api/conversations', { params }),
    
    // Get conversations by type
    getByType: (type, params = {}) => 
      api.get('/api/conversations', { params: { ...params, type } }),
    
    // Text conversations (existing)
    getText: (channelId, params = {}) => 
      api.get(`/api/channels/${channelId}/conversations`, { params }),
    
    // Voice conversations (new)
    getVoice: (params = {}) => api.get('/api/telephony/calls', { params }),
    
    // Unified conversation details
    getDetails: (conversationId, type = 'auto') => {
      if (type === 'voice') {
        return api.get(`/api/telephony/calls/${conversationId}`);
      } else if (type === 'text') {
        // Assumes channelId is included in conversationId or handled separately
        return api.get(`/api/conversations/${conversationId}`);
      } else {
        // Auto-detect based on ID format or try both
        return api.get(`/api/conversations/${conversationId}`);
      }
    }
  },

  // NEW: Health check methods for voice services
  health: {
    checkVoice: () => api.get('/api/voice/health'),
    checkTelephony: () => api.get('/api/telephony/health'),
    checkAll: () => api.get('/api/health')
  }
};

// ENHANCED: Export with additional utilities
export { api };
export default apiService;

// NEW: Utility functions for voice/telephony
export const voiceUtils = {
  // Check if voice features are available
  isVoiceAvailable: async () => {
    try {
      await apiService.health.checkVoice();
      return true;
    } catch {
      return false;
    }
  },
  
  // Check if telephony features are available  
  isTelephonyAvailable: async () => {
    try {
      await apiService.health.checkTelephony();
      return true;
    } catch {
      return false;
    }
  },
  
  // Format phone numbers for display
  formatPhoneNumber: (number) => {
    if (!number) return '';
    const cleaned = number.replace(/\D/g, '');
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return number;
  },
  
  // Format call duration
  formatDuration: (seconds) => {
    if (!seconds) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};