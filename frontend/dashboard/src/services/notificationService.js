// frontend/dashboard/src/services/notificationService.js
import api from './api';

/**
 * Service for managing notifications
 */
const notificationService = {
  /**
   * Get unread notifications
   * @param {number} limit - Maximum number of notifications to retrieve
   * @returns {Promise<Object>} - Notifications data with unread count
   */
  getUnreadNotifications: async (limit = 5) => {
    try {
      const response = await api.get('/api/notifications/unread', {
        params: { limit }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching unread notifications:', error);
      throw error;
    }
  },

  /**
   * Get all notifications with pagination
   * @param {number} limit - Maximum number of notifications per page
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Object>} - Paginated notifications data
   */
  getAllNotifications: async (limit = 20, offset = 0) => {
    try {
      const response = await api.get('/api/notifications', {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching all notifications:', error);
      throw error;
    }
  },

  /**
   * Mark a notification as read
   * @param {number} notificationId - ID of the notification to mark as read
   * @returns {Promise<Object>} - Updated notification
   */
  markAsRead: async (notificationId) => {
    try {
      const response = await api.post(`/api/notifications/${notificationId}/read`);
      return response.data;
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  },

  /**
   * Mark all notifications as read
   * @returns {Promise<Object>} - Result with count of marked notifications
   */
  markAllAsRead: async () => {
    try {
      const response = await api.post('/api/notifications/read-all');
      return response.data;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  },

  /**
   * Delete a notification
   * @param {number} notificationId - ID of the notification to delete
   * @returns {Promise<Object>} - Deletion result
   */
  deleteNotification: async (notificationId) => {
    try {
      const response = await api.delete(`/api/notifications/${notificationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  },

  /**
   * Update notification preferences
   * @param {Object} preferences - Notification preferences to update
   * @returns {Promise<Object>} - Updated preferences
   */
  updatePreferences: async (preferences) => {
    try {
      const response = await api.put('/api/notifications/preferences', preferences);
      return response.data;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw error;
    }
  },

  /**
   * Get notification preferences
   * @returns {Promise<Object>} - Current notification preferences
   */
  getPreferences: async () => {
    try {
      const response = await api.get('/api/notifications/preferences');
      return response.data;
    } catch (error) {
      console.error('Error fetching notification preferences:', error);
      throw error;
    }
  }
};

export default notificationService;