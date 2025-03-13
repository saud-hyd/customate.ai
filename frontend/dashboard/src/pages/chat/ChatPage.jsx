// src/pages/chat/ChatPage.jsx
import React, { useState, useEffect } from 'react';
import Card from '../../components/common/Card';
import Alert from '../../components/common/Alert';
import MessageList from '../../components/chat/MessageList';
import ChatInput from '../../components/chat/ChatInput';
import chatService from '../../services/chatService';
import { PlusIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Main chat interface page
 * Provides conversation functionality and integration with the knowledge base
 */
const ChatPage = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when active conversation changes
  useEffect(() => {
    if (activeConversation) {
      fetchMessages(activeConversation.id);
    } else {
      setMessages([]);
    }
  }, [activeConversation]);

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const data = await chatService.getConversations();
      setConversations(data);
      
      // Set the first conversation as active if available
      if (data.length > 0 && !activeConversation) {
        setActiveConversation(data[0]);
      }
    } catch (err) {
      console.error('Error fetching conversations:', err);
      setError('Failed to load conversations');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      setLoading(true);
      const data = await chatService.getMessages(conversationId);
      setMessages(data);
    } catch (err) {
      console.error('Error fetching messages:', err);
      setError('Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (text) => {
    try {
      // Create new conversation if none is active
      if (!activeConversation) {
        const newConversation = await chatService.createConversation({
          title: `Conversation ${conversations.length + 1}`
        });
        setActiveConversation(newConversation);
        setConversations([...conversations, newConversation]);
        
        // Send message in new conversation
        const response = await chatService.sendMessage(newConversation.id, text);
        setMessages([
          { id: 'temp-user', role: 'user', content: text, timestamp: new Date().toISOString() },
          { ...response.message }
        ]);
      } else {
        // Add optimistic user message
        setMessages([
          ...messages, 
          { id: 'temp-user', role: 'user', content: text, timestamp: new Date().toISOString() }
        ]);
        
        // Send message to API and get response
        const response = await chatService.sendMessage(activeConversation.id, text);
        
        // Update with real messages from API
        setMessages([
          ...messages.filter(m => m.id !== 'temp-user'), 
          { role: 'user', content: text, timestamp: new Date().toISOString(), id: response.user_message_id },
          { ...response.message }
        ]);
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message');
    }
  };

  const createNewConversation = async () => {
    try {
      const newConversation = await chatService.createConversation({
        title: `Conversation ${conversations.length + 1}`
      });
      setConversations([...conversations, newConversation]);
      setActiveConversation(newConversation);
      setMessages([]);
    } catch (err) {
      console.error('Error creating conversation:', err);
      setError('Failed to create new conversation');
    }
  };

  return (
    <div className="flex h-full">
      {/* Conversations Sidebar */}
      <div className="hidden md:block w-64 bg-white shadow-sm rounded-lg overflow-hidden mr-6">
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
            <button
              onClick={createNewConversation}
              className="p-1 rounded-full text-primary-600 hover:bg-primary-50"
            >
              <PlusIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        <div className="overflow-y-auto h-[calc(100%-57px)]">
          {loading && conversations.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-2 text-sm">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              <p className="text-sm">No conversations yet</p>
              <button
                onClick={createNewConversation}
                className="mt-2 text-sm text-primary-600 hover:text-primary-500"
              >
                Start a new conversation
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    onClick={() => setActiveConversation(conversation)}
                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                      activeConversation?.id === conversation.id ? 'bg-primary-50' : ''
                    }`}
                  >
                    <h3 className="font-medium text-gray-900 truncate">
                      {conversation.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 truncate">
                      {conversation.last_message || 'No messages yet'}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(conversation.updated_at).toLocaleDateString()}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      
      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white shadow-sm rounded-lg overflow-hidden">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h1 className="text-lg font-medium text-gray-900">
              {activeConversation ? activeConversation.title : 'New Conversation'}
            </h1>
          </div>
          <div className="flex items-center space-x-2">
            <button className="p-2 rounded-full text-gray-400 hover:text-gray-500">
              <InformationCircleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {error && (
          <Alert
            type="error"
            message={error}
            onClose={() => setError(null)}
            showClose={true}
            className="m-4"
          />
        )}
        
        {/* Message List */}
        <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
          <MessageList messages={messages} loading={loading} />
        </div>
        
        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4 bg-white">
          <ChatInput onSendMessage={handleSendMessage} disabled={loading} />
        </div>
      </div>
    </div>
  );
};

export default ChatPage;