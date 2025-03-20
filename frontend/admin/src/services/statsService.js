import api from './api';

export const statsService = {
  /**
   * Get admin dashboard overview
   * 
   * @returns {Promise<Object>} - Dashboard data
   */
  async getDashboardStats() {
    const response = await api.get('/api/admin/dashboard');
    return response.data;
  },
  
  /**
   * Get system-wide statistics
   * 
   * @returns {Promise<Object>} - System stats
   */
  async getSystemStats() {
    const response = await api.get('/api/admin/system/stats');
    return response.data;
  }
};