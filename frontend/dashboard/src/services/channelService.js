import api from './api';

const channelService = {
  // Get all channels for the current client
  getChannels: async (platform = null) => {
    const params = platform ? { platform } : {};
    return api.get('/channel', { params });
  },

  // Create a new channel
  createChannel: async (channelData) => {
    return api.post('/channel', channelData);
  },

  // Get details of a specific channel
  getChannelById: async (channelId) => {
    return api.get(`/channel/${channelId}`);
  },

  // Update a channel
  updateChannel: async (channelId, updateData) => {
    return api.put(`/channel/${channelId}`, updateData);
  },

  // Delete a channel
  deleteChannel: async (channelId) => {
    return api.delete(`/channel/${channelId}`);
  },

  // Get conversations for a channel
  getConversations: async (channelId, skip = 0, limit = 50) => {
    return api.get(`/channel/${channelId}/conversations`, {
      params: { skip, limit }
    });
  },

  // Get messages for a conversation
  getMessages: async (channelId, conversationId, skip = 0, limit = 50) => {
    return api.get(`/channel/${channelId}/conversations/${conversationId}/messages`, {
      params: { skip, limit }
    });
  },

  // Send a message to a conversation
  sendMessage: async (channelId, messageData) => {
    return api.post(`/channel/${channelId}/send`, messageData);
  }
};

export default channelService;