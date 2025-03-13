// src/services/chatService.js
import api from './api';

const chatbotService = {
  // Get all conversations
  async getConversations() {
    const response = await api.get('/chat/conversations');
    return response.data;
  },
  
  // Create a new conversation
  async createConversation(data) {
    const response = await api.post('/chat/conversations', data);
    return response.data;
  },
  
  // Get messages for a conversation
  async getMessages(conversationId) {
    const response = await api.get(`/chat/conversations/${conversationId}/messages`);
    return response.data;
  },
  
  // Send a message
  async sendMessage(conversationId, content) {
    const response = await api.post(`/chat/conversations/${conversationId}/messages`, {
      content
    });
    return response.data;
  },
  
  // Delete a conversation
  async deleteConversation(conversationId) {
    await api.delete(`/chat/conversations/${conversationId}`);
  },
  
  // Get analytics for conversations
  async getChatAnalytics(timeRange = 'month') {
    const response = await api.get('/chat/analytics', {
      params: { timeRange }
    });
    return response.data;
  }
};

export default chatbotService;