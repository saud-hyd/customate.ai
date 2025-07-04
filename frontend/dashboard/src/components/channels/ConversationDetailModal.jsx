// Path: frontend/dashboard/src/components/channels/ConversationDetailModal.jsx
// Usage: Clean production version without debug info

import React, { useState, useEffect, useRef } from 'react';
import { HiOutlineX, HiOutlineUser, HiOutlinePaperAirplane, HiOutlineExclamation } from 'react-icons/hi';
import channelService from '../../services/channelService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';

const ConversationDetailModal = ({ isOpen, onClose, conversation, channelId, onConversationRead }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  useEffect(() => {
    if (isOpen && conversation) {
      fetchMessages();
      // Mark conversation as read when opened
      if (onConversationRead) {
        onConversationRead(conversation.conversation_id);
      }
    }
  }, [isOpen, conversation, onConversationRead]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const response = await channelService.getMessages(
        channelId, 
        conversation.conversation_id
      );
      
      // Sort messages to show oldest first
      const sortedMessages = [...(response.data || [])].sort(
        (a, b) => new Date(a.created_at) - new Date(b.created_at)
      );
      
      setMessages(sortedMessages);
      setError(null);
    } catch (err) {
      setError('Failed to load messages. Please try again.');
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    setSending(true);
    try {
      const messageData = {
        conversation_id: conversation.conversation_id,
        message_type: 'text',
        content: newMessage
      };
      
      await channelService.sendMessage(channelId, messageData);
      setNewMessage('');
      
      // Refresh messages to include the new one
      fetchMessages();
    } catch (err) {
      setError('Failed to send message. Please try again.');
      console.error('Error sending message:', err);
    } finally {
      setSending(false);
    }
  };

  // Fixed timezone conversion
  const formatMessageDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
    } catch (error) {
      console.error('Error formatting date:', error);
      return '';
    }
  };

  const formatHeaderDate = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      
      if (date.toDateString() === now.toDateString()) {
        return 'Today';
      }
      
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
      }
      
      return date.toLocaleDateString(undefined, { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      console.error('Error formatting header date:', error);
      return '';
    }
  };

  const groupMessagesByDate = () => {
    const groups = {};
    
    messages.forEach(message => {
      try {
        const date = new Date(message.created_at);
        const dateStr = date.toDateString();
        if (!groups[dateStr]) {
          groups[dateStr] = [];
        }
        groups[dateStr].push(message);
      } catch (error) {
        console.error('Error grouping messages:', error);
      }
    });
    
    return Object.entries(groups).map(([date, messages]) => ({
      date,
      formattedDate: formatHeaderDate(messages[0]?.created_at),
      messages
    }));
  };

  // Determine if message is from user (incoming) or bot (outgoing)
  const isUserMessage = (message) => {
    return (
      message.direction === 'incoming' || 
      message.direction === 'inbound' ||
      message.role === 'user'
    );
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
        onClick={handleOverlayClick}
      />
      
      {/* Modal */}
      <div className="fixed inset-y-0 right-0 max-w-full flex">
        <div className="relative w-screen max-w-md">
          <div className="h-full flex flex-col bg-white shadow-xl">
            {/* Header */}
            <div className="px-4 py-4 bg-green-600 sm:px-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  {conversation.user_profile_url ? (
                    <img
                      className="h-10 w-10 rounded-full object-cover border-2 border-white"
                      src={conversation.user_profile_url}
                      alt={conversation.user_name || "User"}
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center border-2 border-white">
                      <HiOutlineUser className="h-6 w-6 text-gray-600" />
                    </div>
                  )}
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-white">
                      {conversation.user_name || conversation.platform_user_id || "Unknown User"}
                    </h3>
                    <p className="text-sm text-green-100">
                      {conversation.platform_user_id}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="bg-green-600 rounded-md text-green-100 hover:text-white focus:outline-none focus:ring-2 focus:ring-white"
                  onClick={onClose}
                >
                  <span className="sr-only">Close</span>
                  <HiOutlineX className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            {/* Messages Container */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div 
                ref={scrollContainerRef} 
                className="flex-1 overflow-y-auto p-4 space-y-4"
                style={{ 
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f0f0f0' fill-opacity='0.3' fill-rule='evenodd'%3E%3Cpath d='m0 40l40-40h-40v40zm40 0v-40h-40l40 40z'/%3E%3C/g%3E%3C/svg%3E")`,
                  backgroundColor: '#f0f2f5'
                }}
              >
                {loading ? (
                  <div className="flex justify-center items-center h-64">
                    <LoadingSpinner />
                  </div>
                ) : error ? (
                  <ErrorAlert message={error} />
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64">
                    <div className="rounded-full bg-gray-200 p-4">
                      <HiOutlineExclamation className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="mt-4 text-sm font-medium text-gray-900">No messages yet</h3>
                    <p className="mt-2 text-sm text-gray-500 text-center">
                      This conversation is just getting started.<br />
                      Send the first message below.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {groupMessagesByDate().map(({ date, formattedDate, messages }) => (
                      <div key={date}>
                        {/* Date separator */}
                        <div className="flex items-center justify-center">
                          <div className="bg-white/90 backdrop-blur-sm text-gray-700 text-xs px-3 py-1 rounded-lg shadow-sm border">
                            {formattedDate}
                          </div>
                        </div>
                        
                        {/* Messages for this date */}
                        <div className="space-y-2 mt-4">
                          {messages.map((message, index) => {
                            const isUser = isUserMessage(message);
                            
                            return (
                              <div
                                key={message.message_id || index}
                                className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                              >
                                <div
                                  className={`max-w-xs px-3 py-2 rounded-2xl shadow-sm ${
                                    isUser
                                      ? 'bg-green-500 text-white rounded-br-sm'
                                      : 'bg-white text-gray-900 border border-gray-200 rounded-bl-sm'
                                  }`}
                                >
                                  <div className="text-sm whitespace-pre-wrap break-words">
                                    {message.content}
                                  </div>
                                  <div className={`text-xs mt-1 flex items-center ${
                                    isUser ? 'text-green-100 justify-end' : 'text-gray-500 justify-start'
                                  }`}>
                                    <span>{formatMessageDate(message.created_at)}</span>
                                    {isUser && (
                                      <div className="ml-1 flex">
                                        <svg className="w-3 h-3 fill-current" viewBox="0 0 16 15">
                                          <path d="M10.91 3.2l-.58-.58a.5.5 0 0 0-.33-.14.5.5 0 0 0-.34.14L5.15 7.15l-1.76-1.76a.5.5 0 0 0-.33-.14.5.5 0 0 0-.34.14l-.58.58a.5.5 0 0 0 0 .67L5.82 10.4a.5.5 0 0 0 .67 0l5.08-5.08a.5.5 0 0 0 0-.67z"/>
                                        </svg>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>
            </div>
            
            {/* Message Input */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-2">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="w-full border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    disabled={sending}
                  />
                </div>
                <button
                  type="submit"
                  disabled={sending || !newMessage.trim()}
                  className={`p-2 rounded-full transition-colors ${
                    sending || !newMessage.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-green-500 hover:bg-green-600'
                  }`}
                >
                  <HiOutlinePaperAirplane className="h-5 w-5 text-white transform rotate-90" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConversationDetailModal;