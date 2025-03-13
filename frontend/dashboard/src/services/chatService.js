import api from './api';

const chatService = {
  // Send a message and get a response
  async sendMessage(sessionId, message) {
    const response = await api.post('/api/chatbot/message', {
      session_id: sessionId,
      message
    });
    return response.data;
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
  }
};

export default chatService;