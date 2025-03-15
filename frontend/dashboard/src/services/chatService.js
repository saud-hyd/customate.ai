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
  
  // Get conversation history (messages) for a specific session
  async getMessages(sessionId) {
    try {
      const response = await api.get(`/api/chatbot/history/${sessionId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
  },
  
  // Get all conversations/sessions for the current client
  async getConversations() {
    try {
      const response = await api.get('/api/chatbot/sessions');
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },
  
  // Create a new conversation session
  async createConversation(data) {
    try {
      const response = await api.post('/api/chatbot/sessions', data);
      return response.data;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  },
  
  // Delete a conversation session
  async deleteConversation(sessionId) {
    try {
      await api.delete(`/api/chatbot/sessions/${sessionId}`);
      return true;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },
  
  // Get chat analytics data
  async getChatAnalytics(timeRange = 30) {
    try {
      const response = await api.get('/api/analytics/chat', {
        params: { days: timeRange }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching chat analytics:', error);
      throw error;
    }
  }
};

export default chatService;