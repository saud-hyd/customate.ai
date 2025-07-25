// Path: frontend/dashboard/src/components/conversations/ConversationsList.jsx
// Usage: Enhanced conversations list with integrated text and voice filtering
// MODIFICATION: Add voice conversation support with unified filtering

import React, { useState, useEffect } from 'react';
import { HiOutlineSearch } from 'react-icons/hi';
import channelService from '../../services/channelService';
import telephonyService from '../../services/telephonyService'; // NEW IMPORT
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import ConversationDetailModal from './ConversationDetailModal';
import VoiceConversationItem from './VoiceConversationItem'; // NEW IMPORT
import ConversationFilters from './ConversationFilters'; // NEW IMPORT

const ConversationsList = ({ channelId }) => {
  // EXISTING STATE
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [readConversations, setReadConversations] = useState(new Set());

  // NEW STATE FOR VOICE INTEGRATION
  const [voiceConversations, setVoiceConversations] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'text', 'voice'
  const [filterCounts, setFilterCounts] = useState({ all: 0, text: 0, voice: 0 });
  const [unreadCounts, setUnreadCounts] = useState({ all: 0, text: 0, voice: 0 });
  const [readVoiceConversations, setReadVoiceConversations] = useState(new Set());

  // Safe localStorage operations for text conversations (EXISTING)
  const getStorageKey = () => `customate_read_conversations_${channelId}`;

  // NEW: Safe localStorage operations for voice conversations
  const getVoiceStorageKey = () => `customate_read_voice_conversations_${channelId}`;

  const loadReadConversations = () => {
    try {
      const stored = localStorage.getItem(getStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load read conversations:', error);
    }
    return new Set();
  };

  // NEW: Load read voice conversations
  const loadReadVoiceConversations = () => {
    try {
      const stored = localStorage.getItem(getVoiceStorageKey());
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          return new Set(parsed);
        }
      }
    } catch (error) {
      console.warn('Failed to load read voice conversations:', error);
    }
    return new Set();
  };

  const saveReadConversations = (readSet) => {
    try {
      const array = Array.from(readSet);
      localStorage.setItem(getStorageKey(), JSON.stringify(array));
    } catch (error) {
      console.warn('Failed to save read conversations:', error);
    }
  };

  // NEW: Save read voice conversations
  const saveReadVoiceConversations = (readSet) => {
    try {
      const array = Array.from(readSet);
      localStorage.setItem(getVoiceStorageKey(), JSON.stringify(array));
    } catch (error) {
      console.warn('Failed to save read voice conversations:', error);
    }
  };

  // Load conversations and read status (ENHANCED)
  useEffect(() => {
    const fetchAllConversations = async () => {
      try {
        setLoading(true);
        
        // Load read conversations from localStorage first
        const savedReadConversations = loadReadConversations();
        const savedReadVoiceConversations = loadReadVoiceConversations();
        setReadConversations(savedReadConversations);
        setReadVoiceConversations(savedReadVoiceConversations);
        
        // Fetch both text and voice conversations in parallel
        const [textResponse, voiceResponse] = await Promise.allSettled([
          channelService.getConversations(channelId),
          telephonyService.getCalls({ limit: 50 }) // Get recent voice calls
        ]);

        // Handle text conversations
        if (textResponse.status === 'fulfilled') {
          setConversations(textResponse.value.data || []);
        } else {
          console.warn('Failed to load text conversations:', textResponse.reason);
          setConversations([]);
        }

        // NEW: Handle voice conversations
        if (voiceResponse.status === 'fulfilled') {
          // Transform voice calls to conversation format
          const voiceCalls = (voiceResponse.value.calls || []).map(call => ({
            ...call,
            conversation_type: 'voice',
            conversation_id: call.call_id,
            user_name: call.caller_number,
            platform_user_id: call.caller_number,
            last_message_at: call.started_at,
            last_message_preview: call.transcript_preview || `Call lasted ${Math.round((call.duration_seconds || 0) / 60)} minutes`,
            message_count: 1
          }));
          setVoiceConversations(voiceCalls);
        } else {
          console.warn('Voice conversations not available:', voiceResponse.reason);
          setVoiceConversations([]);
        }

        setError(null);
      } catch (err) {
        setError('Failed to load conversations. Please try again.');
        console.error('Error loading conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllConversations();
  }, [channelId]);

  // NEW: Update filter counts whenever conversations change
  useEffect(() => {
    const textCount = conversations.length;
    const voiceCount = voiceConversations.length;
    const totalCount = textCount + voiceCount;

    const textUnread = conversations.filter(conv => 
      !readConversations.has(conv.conversation_id)
    ).length;
    const voiceUnread = voiceConversations.filter(conv => 
      !readVoiceConversations.has(conv.call_id)
    ).length;
    const totalUnread = textUnread + voiceUnread;

    setFilterCounts({
      all: totalCount,
      text: textCount,
      voice: voiceCount
    });

    setUnreadCounts({
      all: totalUnread,
      text: textUnread,
      voice: voiceUnread
    });
  }, [conversations, voiceConversations, readConversations, readVoiceConversations]);

  // EXISTING: Check if conversation is active today
  const isActiveToday = (lastMessageAt) => {
    if (!lastMessageAt) return false;
    const today = new Date();
    const messageDate = new Date(lastMessageAt);
    return messageDate.toDateString() === today.toDateString();
  };

  // EXISTING: Check if text conversation is unread
  const isUnread = (conversation) => {
    return !readConversations.has(conversation.conversation_id);
  };

  // NEW: Check if voice conversation is unread
  const isVoiceUnread = (conversation) => {
    return !readVoiceConversations.has(conversation.call_id);
  };

  // EXISTING: Handle text conversation click
  const handleConversationClick = (conversation) => {
    const newReadConversations = new Set([...readConversations, conversation.conversation_id]);
    setReadConversations(newReadConversations);
    saveReadConversations(newReadConversations);
    setSelectedConversation(conversation);
    setIsModalOpen(true);
  };

  // NEW: Handle voice conversation click
  const handleVoiceConversationClick = (conversation) => {
    const newReadVoiceConversations = new Set([...readVoiceConversations, conversation.call_id]);
    setReadVoiceConversations(newReadVoiceConversations);
    saveReadVoiceConversations(newReadVoiceConversations);
    setSelectedConversation({ ...conversation, conversation_type: 'voice' });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedConversation(null);
  };

  // NEW: Get filtered conversations based on active filter
  const getFilteredConversations = () => {
    let allConversations = [];

    // Include text conversations
    if (activeFilter === 'all' || activeFilter === 'text') {
      const filteredText = conversations.filter(conversation => {
        const matchesSearch = !searchQuery || 
          conversation.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversation.platform_user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversation.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      }).map(conv => ({ ...conv, conversation_type: 'text' }));
      
      allConversations = [...allConversations, ...filteredText];
    }

    // Include voice conversations
    if (activeFilter === 'all' || activeFilter === 'voice') {
      const filteredVoice = voiceConversations.filter(conversation => {
        const matchesSearch = !searchQuery || 
          conversation.caller_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          conversation.transcript_preview?.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesSearch;
      });
      
      allConversations = [...allConversations, ...filteredVoice];
    }

    // Sort by last message time (most recent first)
    return allConversations.sort((a, b) => {
      const timeA = new Date(a.last_message_at || a.started_at);
      const timeB = new Date(b.last_message_at || b.started_at);
      return timeB - timeA;
    });
  };

  const filteredConversations = getFilteredConversations();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="space-y-4">
      {/* NEW: Filter Controls */}
      <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
        <ConversationFilters
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
          counts={filterCounts}
          unreadCounts={unreadCounts}
          className="flex-shrink-0"
        />
        
        {/* Search Bar */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiOutlineSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
          />
        </div>
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 text-lg mb-2">No conversations found</div>
          <div className="text-gray-400 text-sm">
            {searchQuery ? 'Try adjusting your search terms' : 'Conversations will appear here once customers start chatting'}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredConversations.map((conversation) => {
            // Render voice conversations with VoiceConversationItem
            if (conversation.conversation_type === 'voice') {
              return (
                <VoiceConversationItem
                  key={conversation.call_id}
                  conversation={conversation}
                  isUnread={isVoiceUnread(conversation)}
                  onClick={handleVoiceConversationClick}
                  isSelected={selectedConversation?.call_id === conversation.call_id}
                />
              );
            }
            
            // Render text conversations with existing component (ENHANCED with type indicator)
            return (
              <div
                key={conversation.conversation_id}
                className={`
                  relative p-4 border-l-4 transition-all duration-200 cursor-pointer
                  ${selectedConversation?.conversation_id === conversation.conversation_id 
                    ? 'bg-blue-50 border-l-blue-500' 
                    : 'bg-white border-l-transparent'
                  }
                  ${isUnread(conversation) ? 'bg-blue-25 border-l-blue-300' : ''}
                  hover:bg-blue-25 hover:shadow-sm
                `}
                onClick={() => handleConversationClick(conversation)}
              >
                {/* Existing text conversation UI with slight enhancements */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className="flex-shrink-0 p-2 bg-blue-100 rounded-lg">
                      <HiOutlineChat className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className={`text-sm font-medium ${isUnread(conversation) ? 'text-gray-900' : 'text-gray-700'}`}>
                        {conversation.user_name || 'Anonymous User'}
                      </h3>
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>{formatDistanceToNow(new Date(conversation.last_message_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  </div>
                  
                  {isActiveToday(conversation.last_message_at) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      Active Today
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-600 mb-1">
                  <p className={`line-clamp-2 ${isUnread(conversation) ? 'font-medium text-gray-700' : 'text-gray-500'}`}>
                    {conversation.last_message_preview || 'No messages yet'}
                  </p>
                </div>

                <p className="text-xs text-gray-400">
                  {conversation.platform_user_id} • {conversation.message_count || 0} messages
                </p>

                {isUnread(conversation) && (
                  <div className="absolute top-4 right-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for conversation details */}
      {selectedConversation && (
        <ConversationDetailModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          conversation={selectedConversation}
          channelId={channelId}
        />
      )}
    </div>
  );
};

export default ConversationsList;