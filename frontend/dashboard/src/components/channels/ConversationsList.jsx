// frontend/dashboard/src/components/channels/ConversationsList.jsx

import React, { useState, useEffect } from 'react';
import { HiOutlineChat, HiOutlineUser, HiOutlineSearch, HiOutlineClock } from 'react-icons/hi';
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
  const [filterType, setFilterType] = useState('all'); // all, active, unread

  useEffect(() => {
    const fetchConversations = async () => {
      try {
        setLoading(true);
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

    fetchConversations();
  }, [channelId]);

  const handleConversationClick = (conversation) => {
    setSelectedConversation(conversation);
    setIsModalOpen(true);
  };

  // Filter conversations based on search query and filter type
  const filteredConversations = conversations.filter(conversation => {
    // Search filter
    const matchesSearch = 
      !searchQuery || 
      (conversation.user_name && conversation.user_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (conversation.platform_user_id && conversation.platform_user_id.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Status filter
    let matchesFilter = true;
    if (filterType === 'active') {
      const oneDay = 24 * 60 * 60 * 1000; // 1 day in milliseconds
      const isActive = new Date(conversation.last_message_at) > new Date(Date.now() - oneDay);
      matchesFilter = isActive;
    } else if (filterType === 'unread') {
      // This would be implemented with real unread status
      // For now, just a placeholder logic
      matchesFilter = conversation.message_count > 0;
    }
    
    return matchesSearch && matchesFilter;
  });

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-lg shadow">
        <HiOutlineChat className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Customers haven't started any conversations through this channel yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search and filter controls */}
      <div className="flex flex-col md:flex-row justify-between space-y-3 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <HiOutlineSearch className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="inline-flex shadow-sm rounded-md">
          <button
            type="button"
            className={`relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
              filterType === 'all' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setFilterType('all')}
          >
            All
          </button>
          <button
            type="button"
            className={`relative inline-flex items-center px-4 py-2 border-t border-b border-gray-300 bg-white text-sm font-medium ${
              filterType === 'active' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setFilterType('active')}
          >
            Active
          </button>
          <button
            type="button"
            className={`relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
              filterType === 'unread' ? 'text-indigo-700 bg-indigo-50' : 'text-gray-700 hover:bg-gray-50'
            }`}
            onClick={() => setFilterType('unread')}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Conversations list */}
      {filteredConversations.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg shadow">
          <p className="text-gray-500">No conversations match your filters.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {filteredConversations.map((conversation) => (
              <li 
                key={conversation.conversation_id}
                className="cursor-pointer hover:bg-gray-50 transition-colors duration-150"
                onClick={() => handleConversationClick(conversation)}
              >
                <div className="px-4 py-4 flex items-center sm:px-6">
                  <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between">
                    <div className="flex items-center">
                      {conversation.user_profile_url ? (
                        <img
                          className="h-12 w-12 rounded-full object-cover"
                          src={conversation.user_profile_url}
                          alt={conversation.user_name || "User"}
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center">
                          <HiOutlineUser className="h-6 w-6 text-indigo-600" />
                        </div>
                      )}
                      <div className="ml-4">
                        <div className="text-sm font-medium text-indigo-600">
                          {conversation.user_name || conversation.platform_user_id || "Unknown User"}
                        </div>
                        <div className="mt-1 flex items-center">
                          <HiOutlineClock className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                          <p className="text-xs text-gray-500">
                            {formatRelativeTime(conversation.last_message_at)}
                          </p>
                        </div>
                        <div className="mt-1 text-sm text-gray-500 truncate max-w-xs">
                          {conversation.last_message_preview || "No messages yet"}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex-shrink-0 sm:mt-0 sm:ml-5">
                      <div className="flex flex-col items-end">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {conversation.message_count} messages
                        </span>
                        {/* Add an activity status indicator */}
                        {isRecentlyActive(conversation.last_message_at) && (
                          <span className="mt-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                            Active Today
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="ml-5 flex-shrink-0">
                    <svg className="h-5 w-5 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conversation detail modal */}
      {selectedConversation && (
        <ConversationDetailModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          conversation={selectedConversation}
          channelId={channelId}
        />
      )}
    </div>
  );
};

// Helper function to format relative time
const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now - date;
  const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
  const diffInHours = Math.floor(diffInMilliseconds / (1000 * 60 * 60));
  const diffInDays = Math.floor(diffInMilliseconds / (1000 * 60 * 60 * 24));

  if (diffInMinutes < 1) {
    return 'Just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min${diffInMinutes === 1 ? '' : 's'} ago`;
  } else if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours === 1 ? '' : 's'} ago`;
  } else if (diffInDays < 7) {
    return `${diffInDays} day${diffInDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleDateString();
  }
};

// Helper function to check if a conversation was active recently
const isRecentlyActive = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMilliseconds = now - date;
  const diffInHours = diffInMilliseconds / (1000 * 60 * 60);
  
  return diffInHours < 24; // Consider active if activity within last 24 hours
};

export default ConversationsList;