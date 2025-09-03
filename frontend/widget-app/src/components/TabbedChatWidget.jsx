import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const TabbedChatWidget = ({ messages, isTyping, onSendMessage, settings, error }) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showError, setShowError] = useState(false);

  // Enhanced auto-scroll with better timing
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ 
          behavior: 'smooth',
          block: 'end'
        });
      }
    };

    // Always scroll when messages change or typing state changes
    const timeoutId = setTimeout(() => {
      requestAnimationFrame(scrollToBottom);
    }, 50);
    
    return () => clearTimeout(timeoutId);
  }, [messages, isTyping]);

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
      setShowError(false);
      await onSendMessage(messageText);
    } catch (error) {
      console.error('Error in TabbedChatWidget sendMessage:', error);
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

  const primaryColor = settings?.primary_color || '#ea580c';

  return (
    <div className="tabbed-chat-widget">
      {/* Tab Content */}
      <div className="tab-content">
        <div className="chat-tab">
          {/* Messages Container - Now takes full height */}
          <div 
            ref={messagesContainerRef}
            className="messages-container-tabbed"
          >
            {/* Welcome message */}
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

            {/* Typing indicator */}
            {isTyping && settings?.show_typing_indicator !== false && (
              <TypingIndicator settings={settings} />
            )}

            {/* Error message display */}
            {showError && error && (
              <div className="message assistant">
                <div className="message-bubble error-bubble">
                  <div className="error-content">
                    <span className="error-icon">⚠️</span>
                    <span className="error-text">{error}</span>
                    <button 
                      className="error-dismiss"
                      onClick={() => setShowError(false)}
                      title="Dismiss error"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} className="scroll-anchor" />
          </div>

          {/* BEST PRACTICE: Chat Input with typing state */}
          <div className="chat-input-wrapper-no-gap">
            <ChatInput 
              onSendMessage={handleSendMessage}
              settings={settings}
              isTyping={isTyping} // CRITICAL: Pass typing state for better UX
            />
          </div>

          {/* Powered by Customate watermark */}
          <div className="powered-by-watermark">
            <span>Powered by{' '}
              <a 
                href="https://customate.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                className="customate-link"
              >
                <strong>Customate</strong>
              </a>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TabbedChatWidget;