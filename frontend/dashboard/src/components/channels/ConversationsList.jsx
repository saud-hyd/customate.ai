// Path: frontend/dashboard/src/components/channels/ConversationsList.jsx
// Usage: Persistent unread tracking with safe localStorage implementation

import React, { useState, useEffect } from 'react';
import { HiOutlineChat, HiOutlineUser, HiOutlineSearch } from 'react-icons/hi';
import channelService from '../../services/channelService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import ConversationDetailModal from './ConversationDetailModal';

const ConversationsList = ({ channelId }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [readConversations, setReadConversations] = useState(new Set());

  // Safe localStorage operations
  const getStorageKey = () => `customate_read_conversations_${channelId}`;

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

  const saveReadConversations = (readSet) => {
    try {
      const array = Array.from(readSet);
      localStorage.setItem(getStorageKey(), JSON.stringify(array));
    } catch (error) {
      console.warn('Failed to save read conversations:', error);
    }
  };

  // Load conversations and read status
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
        
        // Load read conversations from localStorage first
        const savedReadConversations = loadReadConversations();
        setReadConversations(savedReadConversations);
        
        // Fetch conversations from API
        const response = await channelService.getConversations(channelId);
        setConversations(response.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load conversations. Please try again.');
        console.error('Error fetching conversations:', err);
      } finally {
        setLoading(false);
      }
    };

    if (channelId) {
      fetchConversations();
    }
  }, [channelId]);

  // Simple time calculation
  const getRelativeTime = (dateString) => {
    if (!dateString) return 'No messages';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInSeconds = Math.floor((now - date) / 1000);
      
      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes}m ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours}h ago`;
      } else {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days}d ago`;
      }
    } catch (error) {
      return 'Unknown';
    }
  };

  // Simple active today check
  const isActiveToday = (dateString) => {
    if (!dateString) return false;
    
    try {
      const date = new Date(dateString);
      const today = new Date();
      return today.toDateString() === date.toDateString();
    } catch (error) {
      return false;
    }
  };

  // Check if conversation is unread
  const isUnread = (conversation) => {
    // If conversation has been read, it's not unread
    if (readConversations.has(conversation.conversation_id)) {
      return false;
    }
    
    // If there are no messages, it's not unread
    if (!conversation.message_count || conversation.message_count === 0) {
      return false;
    }
    
    // If there are messages and it hasn't been read, it's unread
    return true;
  };

  // Get message count (only show if unread)
  const getMessageCount = (conversation) => {
    return isUnread(conversation) ? conversation.message_count : 0;
  };

  // Mark conversation as read when clicked
  const handleConversationClick = (conversation) => {
    // Create new Set with the conversation marked as read
    const newReadConversations = new Set([...readConversations, conversation.conversation_id]);
    
    // Update state
    setReadConversations(newReadConversations);
    
    // Save to localStorage
    saveReadConversations(newReadConversations);
    
    // Open modal
    setSelectedConversation(conversation);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedConversation(null);
  };

  // Reset read status (for testing purposes)
  const resetReadStatus = () => {
    try {
      localStorage.removeItem(getStorageKey());
      setReadConversations(new Set());
    } catch (error) {
      console.warn('Failed to reset read status:', error);
    }
  };

  // Simple filtering
  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = !searchQuery || 
      conversation.user_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.platform_user_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.last_message_preview?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter = filterType === 'all' || 
      (filterType === 'active' && isActiveToday(conversation.last_message_at)) ||
      (filterType === 'unread' && isUnread(conversation));

    return matchesSearch && matchesFilter;
  });

  // Count unread conversations for filter badge
  const unreadCount = conversations.filter(isUnread).length;

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
      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
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
        <div className="flex space-x-2">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              filterType === 'all'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterType('active')}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              filterType === 'active'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilterType('unread')}
            className={`px-3 py-2 text-sm font-medium rounded-md relative ${
              filterType === 'unread'
                ? 'bg-orange-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Unread
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Dev Tools - Remove in production */}
      <div className="flex justify-end">
        <button
          onClick={resetReadStatus}
          className="text-xs text-gray-500 hover:text-gray-700 underline"
        >
          Reset Read Status (Dev Only)
        </button>
      </div>

      {/* Conversations List */}
      {filteredConversations.length === 0 ? (
        <div className="text-center py-12">
          <div className="rounded-full bg-gray-100 p-3 mx-auto w-16 h-16 flex items-center justify-center">
            <HiOutlineChat className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {searchQuery ? 'No conversations found' : 
             filterType === 'unread' ? 'No unread conversations' : 'No conversations yet'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {searchQuery ? 'Try adjusting your search terms.' :
             filterType === 'unread' ? 'All conversations have been read.' :
             'Conversations will appear here once customers start messaging.'}
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => {
              const messageCount = getMessageCount(conversation);
              const conversationIsUnread = isUnread(conversation);
              
              return (
                <li key={conversation.conversation_id}>
                  <button
                    onClick={() => handleConversationClick(conversation)}
                    className={`w-full px-4 py-4 hover:bg-gray-50 focus:outline-none focus:bg-gray-50 text-left transition-colors ${
                      conversationIsUnread ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                    }`}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0 relative">
                        {conversation.user_profile_url ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={conversation.user_profile_url}
                            alt={conversation.user_name || "User"}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                            <HiOutlineUser className="h-6 w-6 text-gray-600" />
                          </div>
                        )}
                        {/* Unread indicator dot */}
                        {conversationIsUnread && (
                          <div className="absolute -top-1 -right-1 h-4 w-4 bg-blue-500 rounded-full border-2 border-white"></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className={`text-sm truncate ${
                            conversationIsUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-900'
                          }`}>
                            {conversation.user_name || conversation.platform_user_id || 'Unknown User'}
                          </p>
                          <div className="flex items-center space-x-2">
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {getRelativeTime(conversation.last_message_at)}
                            </p>
                            {/* Only show count if there are unread messages */}
                            {messageCount > 0 && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500 text-white">
                                {messageCount}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <p className={`text-sm truncate max-w-xs ${
                            conversationIsUnread ? 'font-medium text-gray-700' : 'text-gray-500'
                          }`}>
                            {conversation.last_message_preview || 'No messages yet'}
                          </p>
                          <div className="flex items-center space-x-1">
                            {isActiveToday(conversation.last_message_at) && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 whitespace-nowrap">
                                Active Today
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          {conversation.platform_user_id}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Modal */}
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