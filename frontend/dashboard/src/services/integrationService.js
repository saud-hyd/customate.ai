// frontend/dashboard/src/services/integrationService.js
import api from './api';

const integrationService = {
  // Get all available integrations
  async getAvailableIntegrations() {
    try {
      const response = await api.get('/api/integration/providers');
      return response.data;
    } catch (error) {
      console.error('Error fetching available integrations:', error);
      throw error;
    }
  },
  
  // Get all client integrations
  async getClientIntegrations() {
    try {
      const response = await api.get('/api/integration');
      return response.data;
    } catch (error) {
      console.error('Error fetching client integrations:', error);
      throw error;
    }
  },
  
  // Create a new integration with validation
// frontend/dashboard/src/services/integrationService.js - createIntegration function update

async createIntegration(integrationData) {
    try {
      // Since validation endpoint doesn't exist, directly create integration
      const response = await api.post('/api/integration', integrationData);
      
      // Check if integration has a failed status in the response
      if (response.data.status === 'failed') {
        return {
          status: 'failed',
          status_message: response.data.status_message || 'Integration failed'
        };
      }
      
      return response.data;
    } catch (error) {
      console.error('Error creating integration:', error);
      
      // Return a structured error object for UI handling
      return {
        status: 'failed',
        status_message: error.response?.data?.detail || 'Unable to connect to service'
      };
    }
  },

  
  
  // Update an integration
  async updateIntegration(integrationId, integrationData) {
    try {
      const response = await api.put(`/api/integration/${integrationId}`, integrationData);
      return response.data;
    } catch (error) {
      console.error('Error updating integration:', error);
      throw error;
    }
  },
  
  // Delete an integration
  async deleteIntegration(integrationId) {
    try {
      const response = await api.delete(`/api/integration/${integrationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting integration:', error);
      throw error;
    }
  },
  
  // Test integration connection
  async testIntegration(integrationId) {
    try {
      const response = await api.post(`/api/integration/${integrationId}/test`);
      return response.data;
    } catch (error) {
      console.error('Error testing integration:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Connection test failed'
      };
    }
  },
  
  // Sync integration data
  async syncIntegration(integrationId) {
    try {
      const response = await api.post(`/api/integration/${integrationId}/sync`);
      return response.data;
    } catch (error) {
      console.error('Error syncing integration:', error);
      return {
        status: 'failed',
        message: error.response?.data?.detail || 'Sync failed'
      };
    }
  },
  
  // Disconnect integration (try delete if disconnect fails)
  async disconnectIntegration(integrationId) {
    try {
      // First try to disconnect
      try {
        const response = await api.post(`/api/integration/${integrationId}/disconnect`);
        return response.data;
      } catch (err) {
        // If disconnect endpoint fails, try delete
        console.log('Disconnect endpoint failed, trying delete instead');
        const deleteResponse = await api.delete(`/api/integration/${integrationId}`);
        return deleteResponse.data;
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      throw error;
    }
  },
  
  // Get data from integration
  async getIntegrationData(provider, resourceType, query = null) {
    try {
      const params = query ? { query } : {};
      const response = await api.get(`/api/integration/data/${provider}/${resourceType}`, { params });
      return response.data;
    } catch (error) {
      console.error('Error fetching integration data:', error);
      throw error;
    }
  }
};

export default integrationService;