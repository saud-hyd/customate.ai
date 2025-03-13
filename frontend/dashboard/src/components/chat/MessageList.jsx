// src/components/chat/MessageList.jsx
import React, { useEffect, useRef } from 'react';
import { UserCircleIcon } from '@heroicons/react/24/solid';
import { ComputerDesktopIcon } from '@heroicons/react/24/outline';

/**
 * Message list component for displaying chat messages
 * Handles different message types and auto-scrolling
 */
const MessageList = ({ messages = [], loading = false }) => {
  const messagesEndRef = useRef(null);
  
  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const today = new Date();
    
    if (date.toDateString() === today.toDateString()) {
      // If today, show time only
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      // Otherwise show date and time
      return date.toLocaleDateString([], { day: 'numeric', month: 'short' }) + ' ' + 
             date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };
  
  // Render loading state
  if (loading && messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="mt-2 text-sm text-gray-500">Loading messages...</p>
      </div>
    );
  }
  
  // Render empty state
  if (messages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <div className="bg-primary-100 rounded-full p-3">
          <ComputerDesktopIcon className="h-8 w-8 text-primary-600" />
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">No messages yet</h3>
        <p className="mt-1 text-sm text-gray-500">
          Start a conversation by sending a message below.
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <div 
          key={message.id || index}
          className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
        >
          <div 
            className={`
              max-w-lg px-4 py-3 rounded-lg 
              ${message.role === 'user' 
                ? 'bg-primary-600 text-white' 
                : 'bg-white text-gray-800 border border-gray-200'}
            `}
          >
            <div className="flex items-start">
              {message.role !== 'user' && (
                <div className="flex-shrink-0 mr-3">
                  <div className="bg-primary-100 rounded-full p-1">
                    <ComputerDesktopIcon className="h-5 w-5 text-primary-600" />
                  </div>
                </div>
              )}
              <div>
                <div className="text-sm whitespace-pre-wrap">
                  {message.content}
                </div>
                <div 
                  className={`text-xs mt-1 text-right ${
                    message.role === 'user' ? 'text-primary-100' : 'text-gray-500'
                  }`}
                >
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 ml-3">
                  <UserCircleIcon className="h-6 w-6 text-primary-100" />
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageList;