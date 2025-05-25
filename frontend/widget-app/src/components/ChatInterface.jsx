import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ messages, isTyping, onSendMessage, settings, error }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Welcome message
  useEffect(() => {
    if (messages.length === 0 && settings.greeting_message) {
      // Add welcome message if no messages exist
      const welcomeMessage = {
        id: 'welcome',
        role: 'assistant',
        content: settings.greeting_message,
        created_at: new Date().toISOString()
      };
      // This would typically be handled by the parent component
    }
  }, [messages.length, settings.greeting_message]);

  return (
    <div className="chat-interface">
      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="messages-container"
      >
        {/* Welcome message if no messages */}
        {messages.length === 0 && (
          <ChatMessage
            message={{
              id: 'welcome',
              role: 'assistant',
              content: settings.greeting_message || 'Hello! How can I help you today?',
              created_at: new Date().toISOString()
            }}
            settings={settings}
          />
        )}

        {/* Chat messages */}
        {messages.map((message) => (
          <ChatMessage
            key={message.id}
            message={message}
            settings={settings}
          />
        ))}

        {/* Typing indicator */}
        {isTyping && settings.show_typing_indicator && (
          <TypingIndicator />
        )}

        {/* Error message */}
        {error && (
          <div className="error-message">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <ChatInput 
        onSendMessage={onSendMessage}
        settings={settings}
        disabled={isTyping}
      />
    </div>
  );
};

export default ChatInterface;