// Path: frontend/admin/src/services/clientService.js

import api from './api';

export const clientService = {
  /**
   * Get all clients with optional filtering
   * 
   * @param {Object} options - Query options
   * @param {number} options.skip - Number of items to skip
   * @param {number} options.limit - Number of items to take
   * @param {string} options.search - Search query
   * @param {string} options.status - Filter by status (active/inactive)
   * @param {string} options.plan_type - Filter by plan type
   * @returns {Promise<Array>} - List of clients
   */
  async getClients({ skip = 0, limit = 50, search, status, plan_type } = {}) {
    const params = { skip, limit };
    
    if (search) params.search = search;
    if (status) params.status = status;
    if (plan_type) params.plan_type = plan_type;
    
    // Update endpoint to match the backend path
    const response = await api.get('/admin/clients', { params });
    return response.data;
  },
  
  // Update other methods as well...
  async getClientById(clientId) {
    const response = await api.get(`/admin/clients/${clientId}`);
    return response.data;
  },
  
  async activateClient(clientId) {
    const response = await api.post(`/admin/clients/${clientId}/activate`);
    return response.data;
  },
  
  async deactivateClient(clientId) {
    const response = await api.post(`/admin/clients/${clientId}/deactivate`);
    return response.data;
  },
  
  async changeClientPlan(clientId, planType, prorate = true) {
    const data = {
      plan_type: planType,
      prorate
    };
    
    const response = await api.post(`/admin/clients/${clientId}/change-plan`, data);
    return response.data;
  },
  
  async sendNotification(notificationData) {
    const response = await api.post('/admin/notifications/send', notificationData);
    return response.data;
  }
};