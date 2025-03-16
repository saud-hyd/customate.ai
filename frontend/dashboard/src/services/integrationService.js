// frontend/dashboard/src/services/integrationService.js
import api from './api';

const integrationService = {
  /**
   * Get all integrations for the current client
   * @returns {Promise<Array>} List of integrations
   */
  async getIntegrations() {
    try {
      const response = await api.get('/api/integration');
      return response.data;
    } catch (error) {
      console.error('Error fetching integrations:', error);
      throw error;
    }
  },

  /**
   * Get available integration providers
   * @returns {Promise<Array>} List of available providers
   */
  async getAvailableProviders() {
    try {
      const response = await api.get('/api/integration/providers');
      return response.data;
    } catch (error) {
      console.error('Error fetching available providers:', error);
      throw error;
    }
  },

  /**
   * Create a new integration
   * @param {Object} integrationData - Integration data
   * @returns {Promise<Object>} Created integration
   */
  async createIntegration(integrationData) {
    try {
      const response = await api.post('/api/integration', integrationData);
      return response.data;
    } catch (error) {
      console.error('Error creating integration:', error);
      throw error;
    }
  },

  /**
   * Update an existing integration
   * @param {string} integrationId - Integration ID
   * @param {Object} updateData - Data to update
   * @returns {Promise<Object>} Updated integration
   */
  async updateIntegration(integrationId, updateData) {
    try {
      const response = await api.put(`/api/integration/${integrationId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  },

  /**
   * Delete an integration
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteIntegration(integrationId) {
    try {
      const response = await api.delete(`/api/integration/${integrationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting integration:', error);
      throw error;
    }
  },

  /**
   * Test connection to an integration provider
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Test result
   */
  async testConnection(integrationId) {
    try {
      const response = await api.post(`/api/integration/${integrationId}/test`);
      return {
        ...response.data,
        integration_id: integrationId
      };
    } catch (error) {
      console.error('Error testing connection:', error);
      throw error;
    }
  },

  /**
   * Sync data from an integration provider
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Sync result
   */
  async syncIntegration(integrationId) {
    try {
      const response = await api.post(`/api/integration/${integrationId}/sync`);
      return response.data;
    } catch (error) {
      console.error('Error syncing integration:', error);
      throw error;
    }
  },

  /**
   * Get data from an integration provider
   * @param {string} provider - Provider type
   * @param {string} resourceType - Resource type
   * @param {string} query - Search query
   * @returns {Promise<Array>} Integration data
   */
  async getIntegrationData(provider, resourceType, query = '') {
    try {
      const response = await api.get(`/api/integration/data/${provider}/${resourceType}`, {
        params: { query }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching integration data:', error);
      throw error;
    }
  }
};

export default integrationService;