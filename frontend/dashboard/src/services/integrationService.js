// frontend/dashboard/src/services/integrationService.js
// Path: frontend/dashboard/src/services/integrationService.js
// Usage: Enhanced integration service with comprehensive API methods and error handling

import api from './api';
import { toast } from 'react-hot-toast';

/**
 * Enhanced Integration Service
 * Handles all integration-related API operations with improved error handling and validation
 */
const integrationService = {
  /**
   * Get all integrations for the current client
   * @returns {Promise<Array>} List of integrations
   */
  async getIntegrations() {
    try {
      console.log('Fetching integrations...');
      const response = await api.get('/api/integrations');
      console.log('Integrations response:', response.data);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching integrations:', error);
      
      // Enhanced error handling
      if (error.response) {
        console.error('Server responded with error:', error.response.status, error.response.data);
        
        // Handle specific error cases
        if (error.response.status === 404) {
          console.log('Integrations endpoint not found, returning empty array');
          return [];
        }
      } else if (error.request) {
        console.error('No response received:', error.request);
      } else {
        console.error('Error setting up request:', error.message);
      }
      
      // Return empty array to prevent UI crashes
      return [];
    }
  },

  /**
   * Get available integration providers with setup information
   * @returns {Promise<Array>} List of available providers
   */
  async getAvailableProviders() {
    try {
      const response = await api.get('/api/integrations/available');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching available providers:', error);
      
      // Return default providers if API fails
      return [
        {
          id: 'shopify',
          name: 'Shopify',
          description: 'E-commerce platform integration for products, orders, and customers',
          resource_types: ['products', 'orders', 'customers'],
          fields: [
            {
              name: 'store_domain',
              label: 'Store Domain',
              type: 'text',
              placeholder: 'your-store.myshopify.com',
              required: true,
              help: 'Your Shopify store domain'
            },
            {
              name: 'access_token',
              label: 'Admin API Access Token',
              type: 'password',
              placeholder: 'shpat_...',
              required: true,
              help: 'Admin API Access Token from your Shopify Custom App'
            }
          ]
        }
      ];
    }
  },

  /**
   * Test connection to an integration provider (NEW - Enhanced)
   * @param {Object} connectionData - Connection test data
   * @returns {Promise<Object>} Test result with detailed feedback
   */
  async testConnection(connectionData) {
    try {
      const response = await api.post('/api/integrations/test', connectionData);
      return response.data;
    } catch (error) {
      console.error('Error testing connection:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Connection test failed';
      
      return {
        success: false,
        message: errorMessage,
        status_code: error.response?.status || 500
      };
    }
  },

  /**
   * Test connection for an existing integration (Enhanced)
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Test result
   */
  async testExistingConnection(integrationId) {
    try {
      const response = await api.post(`/api/integrations/${integrationId}/test`);
      return {
        ...response.data,
        integration_id: integrationId
      };
    } catch (error) {
      console.error('Error testing existing connection:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Connection test failed',
        integration_id: integrationId
      };
    }
  },

  /**
   * Create a new integration with enhanced validation
   * @param {Object} integrationData - Integration data
   * @returns {Promise<Object>} Created integration or error details
   */
  async createIntegration(integrationData) {
    try {
      const response = await api.post('/api/integrations', integrationData);
      
      if (response.data.success) {
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to create integration');
      }
    } catch (error) {
      console.error('Error creating integration:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to create integration';
      
      return {
        success: false,
        message: errorMessage,
        error_code: error.response?.data?.error_code || 'CREATION_ERROR'
      };
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
      const response = await api.put(`/api/integrations/${integrationId}`, updateData);
      return response.data;
    } catch (error) {
      console.error('Error updating integration:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to update integration';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Delete an integration
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Deletion result
   */
  async deleteIntegration(integrationId) {
    try {
      const response = await api.delete(`/api/integrations/${integrationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting integration:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to delete integration';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Get details of a specific integration
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Integration details
   */
  async getIntegration(integrationId) {
    try {
      const response = await api.get(`/api/integrations/${integrationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching integration details:', error);
      throw error;
    }
  },

  /**
   * Sync data from an integration provider (Enhanced)
   * @param {string} integrationId - Integration ID
   * @param {Object} options - Sync options (optional)
   * @returns {Promise<Object>} Sync result
   */
  async syncIntegration(integrationId, options = {}) {
    try {
      const response = await api.post(`/api/integrations/${integrationId}/sync`, options);
      return response.data;
    } catch (error) {
      console.error('Error syncing integration:', error);
      
      const errorMessage = error.response?.data?.message || error.message || 'Failed to sync integration';
      
      return {
        success: false,
        message: errorMessage
      };
    }
  },

  /**
   * Get data from an integration provider (Enhanced)
   * @param {string} integrationId - Integration ID
   * @param {string} resourceType - Resource type (products, orders, customers, etc.)
   * @param {Object} params - Query parameters (query, limit, etc.)
   * @returns {Promise<Object>} Integration data with metadata
   */
  async getIntegrationData(integrationId, resourceType, params = {}) {
    try {
      const response = await api.get(`/api/integrations/${integrationId}/data/${resourceType}`, {
        params
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching integration data:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch integration data',
        data: [],
        count: 0
      };
    }
  },

  /**
   * Get data by provider and resource type (Legacy method - Enhanced)
   * @param {string} provider - Provider type
   * @param {string} resourceType - Resource type
   * @param {string} query - Search query
   * @returns {Promise<Array>} Integration data
   */
  async getIntegrationDataByProvider(provider, resourceType, query = '') {
    try {
      // First get integrations to find the right integration ID
      const integrations = await this.getIntegrations();
      const integration = integrations.find(i => i.provider === provider && i.is_active);
      
      if (!integration) {
        console.warn(`No active integration found for provider: ${provider}`);
        return [];
      }
      
      const result = await this.getIntegrationData(integration.integration_id, resourceType, { query });
      return result.data || [];
    } catch (error) {
      console.error('Error fetching integration data by provider:', error);
      return [];
    }
  },

  /**
   * Validate integration credentials before creation (NEW)
   * @param {Object} credentialsData - Credentials to validate
   * @returns {Promise<Object>} Validation result
   */
  async validateCredentials(credentialsData) {
    try {
      // Use the test connection endpoint for validation
      return await this.testConnection(credentialsData);
    } catch (error) {
      return {
        success: false,
        message: 'Credential validation failed',
        error: error.message
      };
    }
  },

  /**
   * Get integration status and health (NEW)
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Integration status
   */
  async getIntegrationStatus(integrationId) {
    try {
      const integration = await this.getIntegration(integrationId);
      
      return {
        status: integration.status,
        is_active: integration.is_active,
        last_sync: integration.last_sync,
        status_message: integration.status_message,
        health: integration.status === 'connected' ? 'healthy' : 'unhealthy'
      };
    } catch (error) {
      console.error('Error getting integration status:', error);
      return {
        status: 'unknown',
        is_active: false,
        health: 'unknown',
        error: error.message
      };
    }
  },

  /**
   * Bulk operations for multiple integrations (NEW)
   */
  async bulkSync(integrationIds) {
    const results = [];
    
    for (const integrationId of integrationIds) {
      try {
        const result = await this.syncIntegration(integrationId);
        results.push({ integrationId, success: true, result });
      } catch (error) {
        results.push({ 
          integrationId, 
          success: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  },

  /**
   * Get integration metrics and analytics (NEW)
   * @param {string} integrationId - Integration ID
   * @returns {Promise<Object>} Integration metrics
   */
  async getIntegrationMetrics(integrationId) {
    try {
      // This would be implemented when analytics endpoint is available
      const response = await api.get(`/api/integrations/${integrationId}/metrics`);
      return response.data;
    } catch (error) {
      console.error('Error fetching integration metrics:', error);
      
      // Return default metrics structure
      return {
        total_requests: 0,
        successful_requests: 0,
        failed_requests: 0,
        last_sync_time: null,
        data_freshness: 'unknown'
      };
    }
  },

  /**
   * Enhanced error handling with user-friendly messages
   */
  formatError(error, context = '') {
    const baseMessage = context ? `${context}: ` : '';
    
    if (error.response) {
      const status = error.response.status;
      const message = error.response.data?.message || error.message;
      
      switch (status) {
        case 400:
          return `${baseMessage}Invalid request. ${message}`;
        case 401:
          return `${baseMessage}Authentication failed. Please check your credentials.`;
        case 403:
          return `${baseMessage}Access denied. Please check your permissions.`;
        case 404:
          return `${baseMessage}Integration not found.`;
        case 429:
          return `${baseMessage}Rate limit exceeded. Please try again later.`;
        case 500:
          return `${baseMessage}Server error. Please try again later.`;
        default:
          return `${baseMessage}${message || 'An unexpected error occurred.'}`;
      }
    }
    
    return `${baseMessage}${error.message || 'Network error occurred.'}`;
  },

  /**
   * Helper method to show toast notifications (NEW)
   */
  showToast(type, message) {
    if (typeof toast !== 'undefined') {
      switch (type) {
        case 'success':
          toast.success(message);
          break;
        case 'error':
          toast.error(message);
          break;
        case 'loading':
          return toast.loading(message);
        default:
          toast(message);
      }
    } else {
      console.log(`${type.toUpperCase()}: ${message}`);
    }
  }
};

export default integrationService;