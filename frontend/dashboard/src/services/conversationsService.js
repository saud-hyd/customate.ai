// Path: frontend/dashboard/src/services/conversationsService.js
// Usage: Enhanced conversations service supporting both text and voice conversations
// MODIFICATION: Add voice conversation support with unified conversation management

import api from './api';
import telephonyService from './telephonyService'; // NEW IMPORT

/**
 * Enhanced Conversations Service with Voice Integration
 */
const conversationsService = {
  // EXISTING: Get text conversations for a specific channel
  getTextConversations: async (channelId, filters = {}) => {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 20,
        search: filters.search,
        status: filters.status,
        start_date: filters.startDate,
        end_date: filters.endDate
      };

      // Remove undefined values
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await api.get(`/api/channels/${channelId}/conversations`, { params });
      
      // Normalize text conversations with type indicator
      const conversations = (response.data.data || response.data || []).map(conv => ({
        ...conv,
        conversation_type: 'text',
        display_name: conv.user_name || 'Anonymous User',
        last_activity: conv.last_message_at,
        preview_text: conv.last_message_preview
      }));

      return {
        conversations,
        pagination: response.data.pagination || {},
        total: response.data.total || conversations.length
      };
    } catch (error) {
      console.error('Error fetching text conversations:', error);
      throw error;
    }
  },

  // NEW: Get voice conversations (calls)
  getVoiceConversations: async (filters = {}) => {
    try {
      const params = {
        page: filters.page || 1,
        limit: filters.limit || 20,
        search: filters.search,
        status: filters.status,
        start_date: filters.startDate,
        end_date: filters.endDate,
        phone_number: filters.phoneNumber,
        duration_min: filters.durationMin
      };

      // Remove undefined values
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await telephonyService.getCalls(params);
      
      // Normalize voice conversations to match text conversation format
      const conversations = (response.calls || []).map(call => ({
        conversation_id: call.call_id,
        conversation_type: 'voice',
        user_name: call.caller_number,
        display_name: conversationsService.formatPhoneNumber(call.caller_number),
        platform_user_id: call.caller_number,
        last_message_at: call.started_at,
        last_activity: call.started_at,
        created_at: call.started_at,
        updated_at: call.ended_at || call.started_at,
        status: call.status,
        message_count: 1, // Voice calls count as 1 interaction
        preview_text: call.transcript_preview || `Call duration: ${conversationsService.formatDuration(call.duration_seconds)}`,
        
        // Voice-specific fields
        call_id: call.call_id,
        caller_number: call.caller_number,
        duration_seconds: call.duration_seconds,
        call_quality: call.call_quality,
        audio_url: call.audio_url,
        transcript_preview: call.transcript_preview,
        started_at: call.started_at,
        ended_at: call.ended_at
      }));

      return {
        conversations,
        pagination: response.pagination || {},
        total: response.total || conversations.length
      };
    } catch (error) {
      console.error('Error fetching voice conversations:', error);
      // Return empty result if voice is not available
      return {
        conversations: [],
        pagination: {},
        total: 0
      };
    }
  },

  // NEW: Get unified conversations (both text and voice)
  getAllConversations: async (channelId, filters = {}) => {
    try {
      const { type = 'all', ...otherFilters } = filters;
      
      let textConversations = [];
      let voiceConversations = [];

      // Fetch based on type filter
      if (type === 'all' || type === 'text') {
        try {
          const textResult = await conversationsService.getTextConversations(channelId, otherFilters);
          textConversations = textResult.conversations;
        } catch (error) {
          console.warn('Failed to fetch text conversations:', error);
        }
      }

      if (type === 'all' || type === 'voice') {
        try {
          const voiceResult = await conversationsService.getVoiceConversations(otherFilters);
          voiceConversations = voiceResult.conversations;
        } catch (error) {
          console.warn('Failed to fetch voice conversations:', error);
        }
      }

      // Combine and sort by last activity
      const allConversations = [...textConversations, ...voiceConversations];
      
      // Apply search filter across both types
      let filteredConversations = allConversations;
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredConversations = allConversations.filter(conv => 
          conv.display_name?.toLowerCase().includes(searchTerm) ||
          conv.platform_user_id?.toLowerCase().includes(searchTerm) ||
          conv.preview_text?.toLowerCase().includes(searchTerm)
        );
      }

      // Sort by last activity (most recent first)
      filteredConversations.sort((a, b) => {
        const timeA = new Date(a.last_activity || a.last_message_at);
        const timeB = new Date(b.last_activity || b.last_message_at);
        return timeB - timeA;
      });

      // Apply pagination
      const page = filters.page || 1;
      const limit = filters.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedConversations = filteredConversations.slice(startIndex, endIndex);

      return {
        conversations: paginatedConversations,
        pagination: {
          page,
          limit,
          total: filteredConversations.length,
          pages: Math.ceil(filteredConversations.length / limit)
        },
        total: filteredConversations.length,
        counts: {
          all: allConversations.length,
          text: textConversations.length,
          voice: voiceConversations.length
        }
      };
    } catch (error) {
      console.error('Error fetching all conversations:', error);
      throw error;
    }
  },

  // ENHANCED: Get conversation details (supports both types)
  getConversationDetails: async (conversationId, type = 'auto', channelId = null) => {
    try {
      // Auto-detect type based on ID format or explicit type
      if (type === 'voice' || (type === 'auto' && conversationId.startsWith('call_'))) {
        return await conversationsService.getVoiceConversationDetails(conversationId);
      } else if (type === 'text' || (type === 'auto' && channelId)) {
        return await conversationsService.getTextConversationDetails(channelId, conversationId);
      } else {
        // Try both methods
        try {
          return await conversationsService.getTextConversationDetails(channelId, conversationId);
        } catch (textError) {
          return await conversationsService.getVoiceConversationDetails(conversationId);
        }
      }
    } catch (error) {
      console.error('Error fetching conversation details:', error);
      throw error;
    }
  },

  // EXISTING: Get text conversation details (enhanced)
  getTextConversationDetails: async (channelId, conversationId) => {
    try {
      const response = await api.get(`/api/channels/${channelId}/conversations/${conversationId}`);
      
      return {
        ...response.data,
        conversation_type: 'text',
        display_name: response.data.user_name || 'Anonymous User'
      };
    } catch (error) {
      console.error('Error fetching text conversation details:', error);
      throw error;
    }
  },

  // NEW: Get voice conversation details
  getVoiceConversationDetails: async (callId) => {
    try {
      const response = await telephonyService.getCallDetails(callId);
      
      return {
        conversation_id: response.call_id,
        conversation_type: 'voice',
        display_name: conversationsService.formatPhoneNumber(response.caller_number),
        user_name: response.caller_number,
        
        // Voice-specific details
        ...response,
        
        // Normalized fields
        created_at: response.started_at,
        updated_at: response.ended_at || response.started_at,
        last_message_at: response.started_at
      };
    } catch (error) {
      console.error('Error fetching voice conversation details:', error);
      throw error;
    }
  },

  // NEW: Get conversation statistics
  getConversationStats: async (channelId, filters = {}) => {
    try {
      const [textResult, voiceResult] = await Promise.allSettled([
        conversationsService.getTextConversations(channelId, { ...filters, limit: 1 }),
        conversationsService.getVoiceConversations({ ...filters, limit: 1 })
      ]);

      const textTotal = textResult.status === 'fulfilled' ? textResult.value.total : 0;
      const voiceTotal = voiceResult.status === 'fulfilled' ? voiceResult.value.total : 0;

      return {
        total: textTotal + voiceTotal,
        text: textTotal,
        voice: voiceTotal,
        percentage: {
          text: textTotal + voiceTotal > 0 ? (textTotal / (textTotal + voiceTotal)) * 100 : 0,
          voice: textTotal + voiceTotal > 0 ? (voiceTotal / (textTotal + voiceTotal)) * 100 : 0
        }
      };
    } catch (error) {
      console.error('Error fetching conversation stats:', error);
      return { total: 0, text: 0, voice: 0, percentage: { text: 0, voice: 0 } };
    }
  },

  // NEW: Search across all conversation types
  searchConversations: async (channelId, query, filters = {}) => {
    try {
      const searchFilters = {
        ...filters,
        search: query
      };

      return await conversationsService.getAllConversations(channelId, searchFilters);
    } catch (error) {
      console.error('Error searching conversations:', error);
      throw error;
    }
  },

  // NEW: Export conversations data
  exportConversations: async (channelId, filters = {}) => {
    try {
      const result = await conversationsService.getAllConversations(channelId, {
        ...filters,
        limit: 1000 // Large limit for export
      });

      // Format for export
      const exportData = result.conversations.map(conv => ({
        ID: conv.conversation_id,
        Type: conv.conversation_type,
        User: conv.display_name,
        'User ID': conv.platform_user_id,
        'Last Activity': conv.last_activity,
        Preview: conv.preview_text,
        Status: conv.status,
        'Message Count': conv.message_count,
        Duration: conv.conversation_type === 'voice' ? 
          conversationsService.formatDuration(conv.duration_seconds) : 'N/A'
      }));

      return {
        data: exportData,
        filename: `conversations_${new Date().toISOString().split('T')[0]}.csv`,
        total: exportData.length
      };
    } catch (error) {
      console.error('Error exporting conversations:', error);
      throw error;
    }
  },

  // NEW: Utility functions
  formatPhoneNumber: (number) => {
    if (!number) return 'Unknown';
    
    // Remove non-numeric characters
    const cleaned = number.replace(/\D/g, '');
    
    // Format US phone numbers
    if (cleaned.length === 11 && cleaned.startsWith('1')) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    
    return number;
  },

  formatDuration: (seconds) => {
    if (!seconds || seconds <= 0) return '0:00';
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  },

  getConversationTypeIcon: (type) => {
    return type === 'voice' ? '📞' : '💬';
  },

  getConversationTypeColor: (type) => {
    return type === 'voice' ? 'green' : 'blue';
  },

  // NEW: Real-time conversation updates
  subscribeToUpdates: (channelId, callback) => {
    // This would implement WebSocket or SSE for real-time updates
    // For now, we'll use polling as a fallback
    const interval = setInterval(async () => {
      try {
        const result = await conversationsService.getAllConversations(channelId, { limit: 10 });
        callback(result.conversations);
      } catch (error) {
        console.error('Error polling conversations:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(interval);
  },

  // NEW: Mark conversations as read
  markAsRead: (conversationIds, type = 'text') => {
    try {
      const storageKey = type === 'voice' ? 
        'customate_read_voice_conversations' : 
        'customate_read_conversations';
      
      const existing = JSON.parse(localStorage.getItem(storageKey) || '[]');
      const updated = [...new Set([...existing, ...conversationIds])];
      
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return true;
    } catch (error) {
      console.error('Error marking conversations as read:', error);
      return false;
    }
  },

  // NEW: Get unread counts
  getUnreadCounts: (channelId) => {
    try {
      const textReadIds = JSON.parse(localStorage.getItem('customate_read_conversations') || '[]');
      const voiceReadIds = JSON.parse(localStorage.getItem('customate_read_voice_conversations') || '[]');
      
      return {
        text: new Set(textReadIds),
        voice: new Set(voiceReadIds)
      };
    } catch (error) {
      console.error('Error getting unread counts:', error);
      return { text: new Set(), voice: new Set() };
    }
  }
};

export default conversationsService;