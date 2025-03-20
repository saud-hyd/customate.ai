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
    
    const response = await api.get('/api/admin/clients', { params });
    return response.data;
  },
  
  /**
   * Get client details by ID
   * 
   * @param {string} clientId - Client ID
   * @returns {Promise<Object>} - Client details
   */
  async getClientById(clientId) {
    const response = await api.get(`/api/admin/clients/${clientId}`);
    return response.data;
  },
  
  /**
   * Activate a client
   * 
   * @param {string} clientId - Client ID
   * @returns {Promise<Object>} - Activation result
   */
  async activateClient(clientId) {
    const response = await api.post(`/api/admin/clients/${clientId}/activate`);
    return response.data;
  },
  
  /**
   * Deactivate a client
   * 
   * @param {string} clientId - Client ID
   * @returns {Promise<Object>} - Deactivation result
   */
  async deactivateClient(clientId) {
    const response = await api.post(`/api/admin/clients/${clientId}/deactivate`);
    return response.data;
  },
  
  /**
   * Change client's subscription plan
   * 
   * @param {string} clientId - Client ID
   * @param {string} planType - New plan type
   * @param {boolean} prorate - Whether to prorate charges
   * @returns {Promise<Object>} - Plan change result
   */
  async changeClientPlan(clientId, planType, prorate = true) {
    const data = {
      plan_type: planType,
      prorate
    };
    
    const response = await api.post(`/api/admin/clients/${clientId}/change-plan`, data);
    return response.data;
  },
  
  /**
   * Send notification to clients
   * 
   * @param {Object} notificationData - Notification data
   * @returns {Promise<Object>} - Notification result
   */
  async sendNotification(notificationData) {
    const response = await api.post('/api/admin/notifications/send', notificationData);
    return response.data;
  }
};