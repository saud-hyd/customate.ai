import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ messages, isTyping, onSendMessage, settings, error }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showError, setShowError] = useState(false);

  // Auto-scroll to bottom when new messages arrive or typing changes
  useEffect(() => {
    const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ 
        behavior: 'smooth',
        block: 'end'
      });
    };

    // Small delay to ensure content is rendered
    const timeoutId = setTimeout(scrollToBottom, 100);
    
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

  // Handle error display
  useEffect(() => {
    if (error) {
      setShowError(true);
      // Auto-hide error after 5 seconds
      const timeoutId = setTimeout(() => {
        setShowError(false);
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    } else {
      setShowError(false);
    }
  }, [error]);

  // Enhanced message send handler with error handling
  const handleSendMessage = async (messageText) => {
    try {
      setShowError(false); // Clear any existing errors
      await onSendMessage(messageText);
    } catch (error) {
      console.error('Error in ChatInterface sendMessage:', error);
      setShowError(true);
    }
  };

  // Get welcome message
  const getWelcomeMessage = () => {
    return {
      id: 'welcome',
      role: 'assistant',
      content: settings?.greeting_message || 'Hello! How can I help you today?',
      created_at: new Date().toISOString()
    };
  };

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
            message={getWelcomeMessage()}
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

        {/* Typing indicator - ONLY show when actually typing */}
        {isTyping && settings?.show_typing_indicator !== false && (
          <TypingIndicator settings={settings} />
        )}

        {/* Error message */}
        {showError && error && (
          <div className="error-message">
            <div className="error-content">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
              <button 
                onClick={() => setShowError(false)}
                className="error-close"
                style={{ 
                  marginLeft: '8px', 
                  background: 'none', 
                  border: 'none', 
                  color: 'inherit', 
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Container */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        settings={settings}
        disabled={isTyping} // Disable input while typing indicator is active
      />
    </div>
  );
};

export default ChatInterface;