import api from './api';

class WidgetService {
  /**
   * Fetch the current widget settings
   * @returns {Promise} API response with widget settings
   */
  async getSettings() {
    try {
      const response = await api.get('/api/widget/settings');
      return response.data;
    } catch (error) {
      console.error('Error fetching widget settings:', error);
      throw error;
    }
  }

  /**
   * Save widget settings
   * @param {Object} settings - Widget settings to save
   * @returns {Promise} API response
   */
  async saveSettings(settings) {
    try {
      const response = await api.put('/api/widget/settings', settings);
      return response.data;
    } catch (error) {
      console.error('Error saving widget settings:', error);
      throw error;
    }
  }

  /**
   * Get embed code for the widget
   * @returns {Promise} API response with embed code
   */
  async getEmbedCode() {
    try {
      const response = await api.get('/api/widget/embed');
      return response.data;
    } catch (error) {
      console.error('Error fetching embed code:', error);
      throw error;
    }
  }
}

export default new WidgetService();