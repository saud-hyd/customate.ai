// frontend/dashboard/src/services/chatService.js
import api from './api';

const chatService = {
  // Send a message and get a response
  async sendMessage(sessionId, message, collectionId = null) {
    try {
      const requestData = {
        message: message
      };
      
      // Add session ID if provided (for continuing conversations)
      if (sessionId) {
        requestData.session_id = sessionId;
      }
      
      // Add collection ID if provided (for targeted knowledge searches)
      if (collectionId) {
        requestData.collection_id = collectionId;
      }
      
      const response = await api.post('/api/chatbot/message', requestData);
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },
  
  // Get conversation history
  async getMessages(sessionId) {
    const response = await api.get(`/api/chatbot/history/${sessionId}`);
    return response.data;
  },
  
  // Get all conversations
  async getConversations() {
    const response = await api.get('/api/chatbot/sessions');
    return response.data;
  },
  
  // Create a new conversation
  async createConversation(data) {
    const response = await api.post('/api/chatbot/sessions', data);
    return response.data;
  },
  
  // Get chat stats (for dashboard)
  async getStats() {
    try {
      const response = await api.get('/api/analytics/chat');
      return response.data;
    } catch (error) {
      console.error('Error fetching chat stats:', error);
      // Return default values if endpoint doesn't exist yet
      return {
        totalSessions: 0,
        totalMessages: 0,
        knowledgeUsage: 0,
        responseTimes: []
      };
    }
  }
};

export default chatService;