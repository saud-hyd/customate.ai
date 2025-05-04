// Path: frontend/dashboard/src/components/chat/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import chatService from '../../services/chatService';
import TypingIndicator from './TypingIndicator'; // Import the typing indicator component

const ChatInterface = ({ config }) => {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // New state for typing indicator
  const messagesEndRef = useRef(null);
  const cancelStreamRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]); // Also scroll when typing indicator appears

  // Initialize with greeting message
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = config?.greeting || "Hello! 👋 How can I help you today?";
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, []);

  // Handle session reset if config changes
  useEffect(() => {
    if (config?.resetSession) {
      setMessages([]);
      setSessionId(null);
      
      // Re-add greeting after reset
      const greeting = config?.greeting || "Hello! 👋 How can I help you today?";
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [config?.resetSession]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    
    // Add user message to state
    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString()
    };
    
    // Add user message immediately to state
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Show loading/typing indicator
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Cancel any ongoing stream
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }

      // Create a temporary bot message ID
      const botMessageId = `bot-${Date.now()}`;
      let hasStartedStreaming = false;

      // Set up LLM settings if provided
      const llmSettings = config?.llmProvider ? {
        llm_provider: config.llmProvider,
        llm_model: config.llmModel,
        temperature: config.temperature || 0.7
      } : null;

      // Get the API key from local storage
      const apiKey = localStorage.getItem('apiKey');
      
      // Call the API with streaming
      cancelStreamRef.current = chatService.sendMessageStreaming(
        text.trim(),
        sessionId,
        (chunk, messageId, isComplete) => {
          if (!hasStartedStreaming) {
            // When we get the first chunk, hide typing indicator and show actual message
            hasStartedStreaming = true;
            setIsTyping(false);
            
            // Add empty bot message to state that will be filled with streaming content
            setMessages(prevMessages => [
              ...prevMessages, 
              {
                id: botMessageId,
                role: 'assistant',
                content: '',
                timestamp: new Date().toISOString(),
                isStreaming: true
              }
            ]);
          }
          
          // Update the bot message with the new chunk
          setMessages(prev => {
            const updatedMessages = [...prev];
            const botIndex = updatedMessages.findIndex(msg => 
              msg.id === botMessageId || (msg.role === 'assistant' && msg.isStreaming)
            );
            
            if (botIndex !== -1) {
              updatedMessages[botIndex] = {
                ...updatedMessages[botIndex],
                content: isComplete 
                  ? (typeof chunk === 'string' ? chunk : chunk?.text || '') 
                  : updatedMessages[botIndex].content + (typeof chunk === 'string' ? chunk : chunk?.text || ''),
                id: messageId || botMessageId,
                isStreaming: !isComplete
              };
            }
            
            return updatedMessages;
          });
          
          // Scroll to bottom with each update
          setTimeout(scrollToBottom, 50);
        },
        response => {
          // Handle completion
          setIsLoading(false);
          setIsTyping(false);
          
          if (response?.session_id) {
            setSessionId(response.session_id);
          }
          
          // If we never started streaming (instant response), add the message now
          if (!hasStartedStreaming && response?.message?.content) {
            setMessages(prev => [
              ...prev,
              {
                id: response.message.id || botMessageId,
                role: 'assistant',
                content: response.message.content,
                timestamp: new Date().toISOString()
              }
            ]);
            return;
          }
          
          // Finalize the bot message
          setMessages(prev => {
            const updatedMessages = [...prev];
            const botIndex = updatedMessages.findIndex(msg => 
              msg.id === botMessageId || (msg.role === 'assistant' && msg.isStreaming)
            );
            
            if (botIndex !== -1) {
              updatedMessages[botIndex] = {
                ...updatedMessages[botIndex],
                isStreaming: false,
                id: response?.message?.id || botMessageId
              };
            }
            
            return updatedMessages;
          });
          
          cancelStreamRef.current = null;
        },
        error => {
          // Handle errors
          console.error('Error in streaming response:', error);
          setIsLoading(false);
          setIsTyping(false);
          
          // If we never started streaming, add an error message
          if (!hasStartedStreaming) {
            setMessages(prev => [
              ...prev,
              {
                id: `error-${Date.now()}`,
                role: 'assistant',
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                timestamp: new Date().toISOString(),
                isError: true
              }
            ]);
            return;
          }
          
          // Update the bot message with an error
          setMessages(prev => {
            const updatedMessages = [...prev];
            const botIndex = updatedMessages.findIndex(msg => 
              msg.id === botMessageId || (msg.role === 'assistant' && msg.isStreaming)
            );
            
            if (botIndex !== -1) {
              updatedMessages[botIndex] = {
                ...updatedMessages[botIndex],
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                isStreaming: false,
                isError: true
              };
            }
            
            return updatedMessages;
          });
          
          cancelStreamRef.current = null;
        },
        llmSettings
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      setIsTyping(false);
      
      // Add error message
      setMessages(prevMessages => [
        ...prevMessages,
        {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: "I'm sorry, I encountered an error while processing your request. Please try again.",
          timestamp: new Date().toISOString(),
          isError: true
        }
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Send a message to start a conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={message.content || ''}
                isUser={message.role === 'user'}
                timestamp={message.timestamp}
              />
            ))}
            
            {/* Typing indicator */}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
        primaryColor={config?.primaryColor || '#4f46e5'}
      />
    </div>
  );
};

ChatInterface.propTypes = {
  config: PropTypes.shape({
    primaryColor: PropTypes.string,
    chatbotName: PropTypes.string,
    greeting: PropTypes.string,
    resetSession: PropTypes.bool,
    llmProvider: PropTypes.string,
    llmModel: PropTypes.string,
    temperature: PropTypes.number
  })
};

export default ChatInterface;