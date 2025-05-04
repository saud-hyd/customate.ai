// frontend/dashboard/src/services/widgetConfigService.js
import api from './api';
import { isDevelopment } from '../utils/environment';


class WidgetConfigService {
  async getConfig() {
    try {
      console.log("Fetching widget config from API");
      const response = await api.get('/api/widget/config');
      console.log("Widget config fetched successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching widget config:', error);
      // Return default config if API fails
      return {
        primary_color: '#4f46e5',
        chatbot_name: 'Customate.AI Assistant',
        widget_position: 'bottom-right',
        show_typing_indicator: true,
        enable_suggestions: true,
        greeting_message: "Hi there! I'm your Customate.AI assistant. How can I help you today?"
      };
    }
  }

  async updateSettings(settings) {
    try {
      console.log("Updating widget settings:", settings);
      const response = await api.put('/api/widget/config', settings);
      console.log("Settings updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error updating widget settings:', error);
      throw error;
    }
  }

  async saveConfig(config) {
    try {
      console.log("Saving complete widget config:", config);
      const response = await api.put('/api/widget/config', config);
      console.log("Config saved successfully:", response.data);
      return response.data;
    } catch (error) {
      console.error('Error saving widget config:', error);
      throw error;
    }
  }
}

export default new WidgetConfigService();