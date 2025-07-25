// Path: frontend/dashboard/src/services/telephonyService.js
// Usage: Service for telephony operations including phone numbers, calls, and Twilio integration

import api from './api';

/**
 * Service for telephony and phone call operations
 * Handles Twilio integration, phone numbers, and call management
 */
const telephonyService = {
  /**
   * Get available phone numbers for the client
   * @returns {Promise<Array>} List of phone numbers
   */
  getPhoneNumbers: async () => {
    const response = await api.get('/api/telephony/numbers');
    return response.data;
  },

  /**
   * Purchase a new phone number
   * @param {Object} numberRequest - Phone number request details
   * @returns {Promise<Object>} Purchased phone number details
   */
  purchasePhoneNumber: async (numberRequest) => {
    const response = await api.post('/api/telephony/numbers/purchase', numberRequest);
    return response.data;
  },

  /**
   * Search available phone numbers for purchase
   * @param {Object} searchCriteria - Search parameters
   * @returns {Promise<Array>} Available phone numbers
   */
  searchAvailableNumbers: async (searchCriteria) => {
    const params = {
      area_code: searchCriteria.areaCode,
      country: searchCriteria.country || 'US',
      type: searchCriteria.type || 'local',
      contains: searchCriteria.contains
    };

    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    const response = await api.get('/api/telephony/numbers/search', { params });
    return response.data;
  },

  /**
   * Release/delete a phone number
   * @param {string} phoneNumber - Phone number to release
   * @returns {Promise<Object>} Release confirmation
   */
  releasePhoneNumber: async (phoneNumber) => {
    const response = await api.delete(`/api/telephony/numbers/${phoneNumber}`);
    return response.data;
  },

  /**
   * Update phone number configuration
   * @param {string} phoneNumber - Phone number to update
   * @param {Object} config - Configuration updates
   * @returns {Promise<Object>} Updated phone number
   */
  updatePhoneNumberConfig: async (phoneNumber, config) => {
    const response = await api.put(`/api/telephony/numbers/${phoneNumber}`, config);
    return response.data;
  },

  /**
   * Get call history and analytics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Call history data
   */
  getCalls: async (filters = {}) => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      status: filters.status,
      phone_number: filters.phoneNumber,
      start_date: filters.startDate,
      end_date: filters.endDate,
      duration_min: filters.durationMin,
      duration_max: filters.durationMax
    };

    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    const response = await api.get('/api/telephony/calls', { params });
    return response.data;
  },

  /**
   * Get detailed call information
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Detailed call data
   */
  getCallDetails: async (callId) => {
    const response = await api.get(`/api/telephony/calls/${callId}`);
    return response.data;
  },

  /**
   * Get call recording
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Recording URL and metadata
   */
  getCallRecording: async (callId) => {
    const response = await api.get(`/api/telephony/calls/${callId}/recording`);
    return response.data;
  },

  /**
   * Get call transcript
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Call transcript
   */
  getCallTranscript: async (callId) => {
    const response = await api.get(`/api/telephony/calls/${callId}/transcript`);
    return response.data;
  },

  /**
   * Initiate a test call
   * @param {Object} testConfig - Test call configuration
   * @returns {Promise<Object>} Test call details
   */
  initiateTestCall: async (testConfig) => {
    const response = await api.post('/api/telephony/test-call', testConfig);
    return response.data;
  },

  /**
   * Test voice interaction with audio
   * @param {FormData} formData - Audio data and configuration
   * @returns {Promise<Object>} Test result
   */
  testVoiceInteraction: async (formData) => {
    const response = await api.post('/api/telephony/voice/test', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 45000 // 45 second timeout for voice processing
    });

    return response.data;
  },

  /**
   * Get voice analytics data
   * @param {number} days - Number of days to include
   * @returns {Promise<Object>} Voice analytics
   */
  getVoiceAnalytics: async (days = 30) => {
    const response = await api.get('/api/telephony/analytics/calls', {
      params: { days }
    });
    return response.data;
  },

  /**
   * Get voice usage metrics
   * @returns {Promise<Object>} Voice usage statistics
   */
  getVoiceUsage: async () => {
    const response = await api.get('/api/telephony/analytics/usage');
    return response.data;
  },

  /**
   * Get telephony webhook logs
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Webhook logs
   */
  getWebhookLogs: async (filters = {}) => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 50,
      event_type: filters.eventType,
      start_date: filters.startDate,
      end_date: filters.endDate
    };

    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    const response = await api.get('/api/telephony/webhooks/logs', { params });
    return response.data;
  },

  /**
   * Update telephony configuration
   * @param {Object} config - Telephony configuration
   * @returns {Promise<Object>} Updated configuration
   */
  updateTelephonyConfig: async (config) => {
    const response = await api.put('/api/telephony/config', config);
    return response.data;
  },

  /**
   * Get current telephony configuration
   * @returns {Promise<Object>} Current telephony settings
   */
  getTelephonyConfig: async () => {
    const response = await api.get('/api/telephony/config');
    return response.data;
  },

  /**
   * Verify Twilio configuration
   * @returns {Promise<Object>} Verification result
   */
  verifyTwilioConfig: async () => {
    const response = await api.post('/api/telephony/verify');
    return response.data;
  },

  /**
   * Get real-time call status
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Real-time call status
   */
  getCallStatus: async (callId) => {
    const response = await api.get(`/api/telephony/calls/${callId}/status`);
    return response.data;
  },

  /**
   * Terminate an active call
   * @param {string} callId - Call ID
   * @returns {Promise<Object>} Termination result
   */
  terminateCall: async (callId) => {
    const response = await api.post(`/api/telephony/calls/${callId}/terminate`);
    return response.data;
  },

  /**
   * Update call notes/metadata
   * @param {string} callId - Call ID
   * @param {Object} updates - Call updates
   * @returns {Promise<Object>} Updated call data
   */
  updateCallMetadata: async (callId, updates) => {
    const response = await api.patch(`/api/telephony/calls/${callId}`, updates);
    return response.data;
  },

  /**
   * Get telephony account information
   * @returns {Promise<Object>} Account details and limits
   */
  getAccountInfo: async () => {
    const response = await api.get('/api/telephony/account');
    return response.data;
  },

  /**
   * Get call quality metrics
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Call quality data
   */
  getCallQualityMetrics: async (options = {}) => {
    const params = {
      days: options.days || 30,
      phone_number: options.phoneNumber,
      group_by: options.groupBy
    };

    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    const response = await api.get('/api/telephony/analytics/quality', { params });
    return response.data;
  },

  /**
   * Export call data
   * @param {Object} exportOptions - Export configuration
   * @returns {Promise<Object>} Export job details
   */
  exportCallData: async (exportOptions) => {
    const response = await api.post('/api/telephony/export', exportOptions);
    return response.data;
  },

  /**
   * Get export job status
   * @param {string} jobId - Export job ID
   * @returns {Promise<Object>} Export job status
   */
  getExportStatus: async (jobId) => {
    const response = await api.get(`/api/telephony/export/${jobId}/status`);
    return response.data;
  }
};

export default telephonyService;