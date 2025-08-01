import React, { useState, useRef, useEffect } from 'react';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import TypingIndicator from './TypingIndicator';

const TabbedChatWidget = ({ messages, isTyping, onSendMessage, settings, error }) => {
  const [activeTab, setActiveTab] = useState('chat');
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showError, setShowError] = useState(false);

  // Enhanced auto-scroll with better timing
  useEffect(() => {
    const scrollToBottom = () => {
      if (messagesEndRef.current && activeTab === 'chat') {
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
  }, [messages, isTyping, activeTab]);

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
        {activeTab === 'chat' ? (
          <div className="chat-tab">
            {/* REMOVED: Chat Header Section - No more AI Assistant header */}

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

            {/* Chat Input - No wrapper padding to touch bottom nav */}
            <div className="chat-input-wrapper-no-gap">
              <ChatInput 
                onSendMessage={handleSendMessage}
                settings={settings}
                disabled={false}
              />
            </div>
          </div>
        ) : (
          <div className="contact-tab">
            {/* Contact Header */}
            <div className="contact-header">
              <div className="contact-header-info">
                <h3 className="contact-title">Get in Touch</h3>
                <p className="contact-subtitle">
                  Choose your preferred way to connect
                </p>
              </div>
            </div>

            {/* Contact Options */}
            <div className="contact-options">
              <div className="contact-card whatsapp-card">
                <div className="contact-icon whatsapp-icon">
                  <WhatsAppIcon />
                </div>
                <div className="contact-info">
                  <h4>WhatsApp</h4>
                  <p>Chat with us instantly</p>
                </div>
                <div className="contact-status">
                  <span className="coming-soon">Coming Soon</span>
                </div>
              </div>

              <div className="contact-card phone-card">
                <div className="contact-icon phone-icon">
                  <PhoneIcon />
                </div>
                <div className="contact-info">
                  <h4>Phone Call</h4>
                  <p>Speak with our team</p>
                </div>
                <div className="contact-status">
                  <span className="coming-soon">Coming Soon</span>
                </div>
              </div>

              <div className="contact-card email-card">
                <div className="contact-icon email-icon">
                  <EmailIcon />
                </div>
                <div className="contact-info">
                  <h4>Email</h4>
                  <p>Send us a message</p>
                </div>
                <div className="contact-status">
                  <span className="coming-soon">Coming Soon</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-button ${activeTab === 'chat' ? 'active' : ''}`}
          onClick={() => setActiveTab('chat')}
          style={{
            '--primary-color': primaryColor
          }}
        >
          <ChatIcon />
          <span>Chat</span>
        </button>
        <button
          className={`tab-button ${activeTab === 'contact' ? 'active' : ''}`}
          onClick={() => setActiveTab('contact')}
          style={{
            '--primary-color': primaryColor
          }}
        >
          <ContactIcon />
          <span>Contact</span>
        </button>
      </div>
    </div>
  );
};

// Icon Components
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
  </svg>
);

const ContactIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);

const WhatsAppIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.525 3.488"/>
  </svg>
);

const PhoneIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
);

const EmailIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>
);

export default TabbedChatWidget;