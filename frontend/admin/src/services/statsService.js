// Path: frontend/admin/src/services/statsService.js

import api from './api';

export const statsService = {
  /**
   * Get admin dashboard overview
   * 
   * @returns {Promise<Object>} - Dashboard data
   */
  async getDashboardStats() {
    // Update endpoint to match the backend path
    const response = await api.get('/admin/dashboard');
    return response.data;
  },
  
  /**
   * Get system-wide statistics
   * 
   * @returns {Promise<Object>} - System stats
   */
  async getSystemStats() {
    // Update endpoint to match the backend path
    const response = await api.get('/admin/system/stats');
    return response.data;
  }
};