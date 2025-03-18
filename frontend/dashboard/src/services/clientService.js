// frontend/dashboard/src/services/clientService.js
import api from './api';

/**
 * Service for client-related API operations
 */
const clientService = {
  /**
   * Get client information
   * @returns {Promise<Object>} Client data
   */
  getClientInfo: async () => {
    try {
      const response = await api.get('/api/client');
      return response.data;
    } catch (error) {
      console.error('Error getting client info:', error);
      throw error;
    }
  },

  /**
   * Get API key for the current client
   * @returns {Promise<string>} The client's API key
   */
  getApiKey: async () => {
    try {
      const response = await api.get('/api/client');
      return response.data.api_key;
    } catch (error) {
      console.error('Error getting client API key:', error);
      throw error;
    }
  },

  /**
   * Update client settings
   * @param {Object} settings - Settings to update
   * @returns {Promise<Object>} Updated settings
   */
  updateSettings: async (settings) => {
    try {
      const response = await api.put('/api/client/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating client settings:', error);
      throw error;
    }
  },
  
  /**
   * Get widget settings
   * @returns {Promise<Object>} Widget settings
   */
  getSettings: async () => {
    try {
      const response = await api.get('/api/widget/settings');
      return response.data;
    } catch (error) {
      console.error('Error getting widget settings:', error);
      throw error;
    }
  },

  /**
   * Update widget settings
   * @param {Object} settings - Widget settings to update
   * @returns {Promise<Object>} Updated settings
   */
  updateWidgetSettings: async (settings) => {
    try {
      const response = await api.put('/api/widget/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error updating widget settings:', error);
      throw error;
    }
  },
  
  /**
   * Get widget embed code
   * @returns {Promise<Object>} Embed code data
   */
  getWidgetEmbedCode: async () => {
    try {
      const response = await api.get('/api/widget/embed');
      return response.data;
    } catch (error) {
      console.error('Error getting widget embed code:', error);
      throw error;
    }
  }
};

export default clientService;