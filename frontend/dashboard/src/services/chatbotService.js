// frontend/dashboard/src/services/chatbotService.js
import api from './api';

const chatbotService = {
  // Send message to chatbot API
  async sendMessage(message, sessionId = null) {
    try {
      const payload = {
        message,
        session_id: sessionId
      };
      
      const response = await api.post('/chatbot/message', payload);
      return response.data;
    } catch (error) {
      console.error('Error sending message to chatbot:', error);
      throw error;
    }
  },
  
  // Get chat history for a session
  async getChatHistory(sessionId, limit = 50) {
    try {
      const response = await api.get(`/chatbot/history/${sessionId}?limit=${limit}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching chat history:', error);
      throw error;
    }
  },
  
  // Get chatbot settings
  async getChatbotSettings() {
    try {
      const response = await api.get('/client');
      return response.data.settings;
    } catch (error) {
      console.error('Error fetching chatbot settings:', error);
      // Return default settings if API call fails
      return {
        primary_color: '#4f46e5',
        chatbot_name: 'AI Assistant',
        greeting_message: 'Hello! How can I help you today?',
        enable_suggestions: true,
        enable_typing_indicator: true,
        widget_position: 'bottom-right'
      };
    }
  }
};

export default chatbotService;