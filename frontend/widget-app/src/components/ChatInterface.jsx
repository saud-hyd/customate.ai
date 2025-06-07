import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ messages, isTyping, onSendMessage, settings, error }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showError, setShowError] = useState(false);

  // FIXED: Enhanced auto-scroll with better timing
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };

    // FIXED: Always scroll when messages change or typing state changes
    // Use requestAnimationFrame for better performance
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(scrollToBottom);
    }, 50); // Reduced delay for more responsive scrolling
    
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]); // Scroll on both messages and typing state changes

  // Handle error display with auto-hide
  useEffect(() => {
    if (error) {
      setShowError(true);
      const timeoutId = setTimeout(() => {
        setShowError(false);
      }, 5000);
      
      return () => clearTimeout(timeoutId);
    } else {
      setShowError(false);
    }
  }, [error]);

  // Enhanced message send handler
  const handleSendMessage = async (messageText) => {
    try {
      setShowError(false); // Clear any existing errors
      await onSendMessage(messageText);
    } catch (error) {
      console.error('Error in ChatInterface sendMessage:', error);
      setShowError(true);
    }
  };

  // Get welcome message (only show if no messages AND not typing)
  const shouldShowWelcome = messages.length === 0 && !isTyping;
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
        {/* FIXED: Only show welcome message when no messages AND not typing */}
        {shouldShowWelcome && (
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

        {/* FIXED: Only show typing indicator when actually typing AND no messages with streaming content */}
        {isTyping && settings?.show_typing_indicator !== false && (
          <TypingIndicator settings={settings} />
        )}

        {/* Error message display */}
        {showError && error && (
          <div className="message assistant">
            <div className="message-bubble" style={{ 
              backgroundColor: '#fef2f2', 
              color: '#b91c1c',
              border: '1px solid #fecaca'
            }}>
              <div className="error-content" style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px' 
              }}>
                <span className="error-icon">⚠️</span>
                <span style={{ flex: 1 }}>{error}</span>
                <button 
                  onClick={() => setShowError(false)}
                  style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'inherit', 
                    cursor: 'pointer',
                    fontSize: '14px',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                  onMouseOver={(e) => e.target.style.backgroundColor = 'rgba(0,0,0,0.1)'}
                  onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
                  title="Dismiss error"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} style={{ height: '1px' }} />
      </div>

      {/* Input Container */}
      <ChatInput 
        onSendMessage={handleSendMessage}
        settings={settings}
        disabled={isTyping} // Disable input while typing indicator is active
      />

      {/* FIXED: Development debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          fontSize: '10px', 
          color: '#666', 
          padding: '4px 8px',
          backgroundColor: '#f9f9f9',
          borderTop: '1px solid #eee'
        }}>
          Messages: {messages.length} | Typing: {isTyping ? 'Yes' : 'No'} | 
          Welcome: {shouldShowWelcome ? 'Yes' : 'No'} | 
          Error: {showError ? 'Yes' : 'No'}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;