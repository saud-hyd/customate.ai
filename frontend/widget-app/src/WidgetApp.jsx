import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import useSettings from './hooks/useSettings';
import useChat from './hooks/useChat';

const WidgetApp = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isFloating, setIsFloating] = useState(true);
  const containerRef = useRef(null);
  
  // Get URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const testMode = urlParams.get('test') === 'true';
    const inline = urlParams.get('inline') === 'true';
    
    setIsTestMode(testMode);
    setIsFloating(!inline && !testMode);
    setIsExpanded(testMode || inline); // Always expanded in test/inline mode
  }, []);

  // Get settings and chat functionality
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  const { 
    messages, 
    isTyping, 
    sendMessage, 
    sessionId,
    error: chatError 
  } = useChat(settings);

  // Handle expand/collapse for floating mode
  const handleToggle = () => {
    if (isFloating) {
      setIsExpanded(!isExpanded);
    }
  };

  if (settingsLoading) {
    return (
      <div className="widget-loading">
        <div className="loading-spinner"></div>
        <p>Loading widget...</p>
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="widget-error">
        <div className="error-icon">⚠️</div>
        <p>Failed to load widget</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`widget-container ${isFloating ? 'floating' : 'inline'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{
        '--primary-color': settings.primary_color || '#ea580c',
        '--widget-position': settings.widget_position || 'bottom-right'
      }}
    >
      {/* Floating toggle button */}
      {isFloating && !isExpanded && (
        <button 
          className="widget-toggle-button"
          onClick={handleToggle}
          style={{ backgroundColor: settings.primary_color }}
        >
          <ChatIcon />
        </button>
      )}

      {/* Chat interface */}
      {(isExpanded || !isFloating) && (
        <div className="widget-chat-container">
          {/* Header */}
          <div 
            className="widget-header"
            style={{ background: `linear-gradient(135deg, ${settings.primary_color}, #f97316)` }}
          >
            <div className="header-content">
              <div className="bot-avatar">
                <BotIcon />
              </div>
              <div className="header-text">
                <div className="bot-name">{settings.chatbot_name || 'AI Assistant'}</div>
                <div className="status">
                  <div className="status-dot"></div>
                  Online
                </div>
              </div>
            </div>
            
            {isFloating && (
              <button className="close-button" onClick={handleToggle}>
                <CloseIcon />
              </button>
            )}
            
            {isTestMode && (
              <div className="test-badge">Testing Mode</div>
            )}
          </div>

          {/* Chat Interface */}
          <ChatInterface
            messages={messages}
            isTyping={isTyping}
            onSendMessage={sendMessage}
            settings={settings}
            error={chatError}
          />
        </div>
      )}
    </div>
  );
};

// Simple icons as components
const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"></path>
  </svg>
);

const BotIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

export default WidgetApp;