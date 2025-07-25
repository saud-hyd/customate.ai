// Path: frontend/dashboard/src/services/voiceService.js
// Usage: Service for voice-related API operations including STT, TTS, and voice processing

import api from './api';

/**
 * Service for voice-related operations
 * Handles speech-to-text, text-to-speech, and voice processing
 */
const voiceService = {
  /**
   * Convert speech to text using OpenAI Whisper
   * @param {Blob} audioBlob - Audio file to transcribe
   * @param {Object} options - Transcription options
   * @returns {Promise<Object>} Transcription result
   */
  speechToText: async (audioBlob, options = {}) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('model', options.model || 'whisper-1');
    formData.append('language', options.language || 'en');
    formData.append('response_format', options.format || 'json');
    
    if (options.prompt) {
      formData.append('prompt', options.prompt);
    }

    const response = await api.post('/api/voice/stt', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout for audio processing
    });

    return response.data;
  },

  /**
   * Convert text to speech using OpenAI TTS
   * @param {string} text - Text to convert to speech
   * @param {Object} options - TTS options
   * @returns {Promise<Object>} Audio file URL and metadata
   */
  textToSpeech: async (text, options = {}) => {
    const payload = {
      text: text,
      model: options.model || 'tts-1',
      voice: options.voice || 'alloy',
      response_format: options.format || 'mp3',
      speed: options.speed || 1.0
    };

    const response = await api.post('/api/voice/tts', payload, {
      timeout: 30000
    });

    return response.data;
  },

  /**
   * Process voice interaction through the AI pipeline
   * @param {Blob} audioBlob - Input audio
   * @param {Object} config - Chat configuration
   * @returns {Promise<Object>} Complete voice response
   */
  processVoiceInteraction: async (audioBlob, config = {}) => {
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('config', JSON.stringify(config));

    const response = await api.post('/api/voice/interact', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 45000 // Longer timeout for full pipeline
    });

    return response.data;
  },

  /**
   * Test voice synthesis with sample text
   * @param {string} text - Text to synthesize
   * @param {Object} voiceSettings - Voice configuration
   * @returns {Promise<Object>} Test result with audio URL
   */
  testVoiceSynthesis: async (text, voiceSettings = {}) => {
    const payload = {
      text: text,
      voice_settings: voiceSettings
    };

    const response = await api.post('/api/voice/test-synthesis', payload);
    return response.data;
  },

  /**
   * Get available voice models and settings
   * @returns {Promise<Object>} Available voices and models
   */
  getVoiceCapabilities: async () => {
    const response = await api.get('/api/voice/capabilities');
    return response.data;
  },

  /**
   * Get voice usage statistics
   * @param {number} days - Number of days to include
   * @returns {Promise<Object>} Voice usage metrics
   */
  getVoiceUsage: async (days = 30) => {
    const response = await api.get('/api/voice/usage', {
      params: { days }
    });
    return response.data;
  },

  /**
   * Get voice conversation history
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Voice conversation list
   */
  getVoiceConversations: async (filters = {}) => {
    const params = {
      page: filters.page || 1,
      limit: filters.limit || 20,
      status: filters.status,
      start_date: filters.startDate,
      end_date: filters.endDate,
      caller_number: filters.callerNumber
    };

    // Remove undefined values
    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    const response = await api.get('/api/voice/conversations', { params });
    return response.data;
  },

  /**
   * Get detailed voice conversation data
   * @param {string} conversationId - Conversation ID
   * @returns {Promise<Object>} Detailed conversation data
   */
  getVoiceConversationDetails: async (conversationId) => {
    const response = await api.get(`/api/voice/conversations/${conversationId}`);
    return response.data;
  },

  /**
   * Update voice configuration
   * @param {Object} config - Voice configuration settings
   * @returns {Promise<Object>} Updated configuration
   */
  updateVoiceConfig: async (config) => {
    const response = await api.put('/api/voice/config', config);
    return response.data;
  },

  /**
   * Get current voice configuration
   * @returns {Promise<Object>} Current voice settings
   */
  getVoiceConfig: async () => {
    const response = await api.get('/api/voice/config');
    return response.data;
  },

  /**
   * Validate audio file format and quality
   * @param {File} audioFile - Audio file to validate
   * @returns {Promise<Object>} Validation result
   */
  validateAudioFile: async (audioFile) => {
    const formData = new FormData();
    formData.append('audio', audioFile);

    const response = await api.post('/api/voice/validate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  },

  /**
   * Get voice analytics and insights
   * @param {Object} options - Analytics options
   * @returns {Promise<Object>} Voice analytics data
   */
  getVoiceAnalytics: async (options = {}) => {
    const params = {
      days: options.days || 30,
      metric: options.metric,
      group_by: options.groupBy
    };

    Object.keys(params).forEach(key => 
      params[key] === undefined && delete params[key]
    );

    const response = await api.get('/api/voice/analytics', { params });
    return response.data;
  },

  /**
   * Cancel ongoing voice processing
   * @param {string} sessionId - Processing session ID
   * @returns {Promise<Object>} Cancellation result
   */
  cancelVoiceProcessing: async (sessionId) => {
    const response = await api.post(`/api/voice/cancel/${sessionId}`);
    return response.data;
  }
};

export default voiceService;