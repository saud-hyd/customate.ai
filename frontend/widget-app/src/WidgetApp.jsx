// frontend/widget-app/src/WidgetApp.jsx
import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import { useSettings } from './hooks/useSettings';
import { useChat } from './hooks/useChat';
import './styles/widget.css';

const WidgetApp = () => {
  // Widget state
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState(null);
  
  // Refs
  const containerRef = useRef(null);
  
  // Get settings and chat functionality
  const { settings, loading: settingsLoading, error: settingsError } = useSettings();
  const { messages, isTyping, sendMessage, resetChat, error: chatError } = useChat(settings);
  
  // Initialize widget configuration
  useEffect(() => {
    // Get config from URL params or window object
    const urlParams = new URLSearchParams(window.location.search);
    const floating = urlParams.get('floating') === 'true';
    
    const initialConfig = {
      floating: floating,
      apiKey: urlParams.get('api_key') || window.REACT_WIDGET_CONFIG?.apiKey,
      testMode: urlParams.get('test') === 'true' || window.REACT_WIDGET_CONFIG?.testMode
    };
    
    setConfig(initialConfig);
    
    // For floating widgets, start collapsed
    if (floating) {
      setIsExpanded(false);
    } else {
      setIsExpanded(true); // Inline widgets are always expanded
    }
  }, []);
  
  // Handle PostMessage communication with parent
  useEffect(() => {
    function handleParentMessage(event) {
      const { type, data } = event.data;
      
      switch (type) {
        case 'WIDGET_CONFIG':
          setConfig(prev => ({ ...prev, ...data.config }));
          break;
          
        case 'EXPAND':
          if (config?.floating) {
            setIsExpanded(true);
            notifyParent('WIDGET_RESIZE', { expanded: true });
          }
          break;
          
        case 'COLLAPSE':
          if (config?.floating) {
            setIsExpanded(false);
            notifyParent('WIDGET_RESIZE', { expanded: false });
          }
          break;
          
        case 'TOGGLE':
          if (config?.floating) {
            const newExpanded = !isExpanded;
            setIsExpanded(newExpanded);
            notifyParent('WIDGET_RESIZE', { expanded: newExpanded });
          }
          break;
          
        case 'RESET':
          resetChat();
          break;
      }
    }
    
    window.addEventListener('message', handleParentMessage);
    
    // Notify parent when widget is ready
    notifyParent('WIDGET_READY', { config });
    
    return () => {
      window.removeEventListener('message', handleParentMessage);
    };
  }, [config, isExpanded, resetChat]);
  
  // Notify parent window
  const notifyParent = (type, data = {}) => {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type, data }, '*');
    }
  };
  
  // Handle toggle button click
  const handleToggle = () => {
    if (config?.floating) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      notifyParent('WIDGET_RESIZE', { expanded: newExpanded });
    }
  };
  
  // Loading state
  if (settingsLoading || !config) {
    return (
      <div className="widget-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }
  
  // Error state
  if (settingsError) {
    return (
      <div className="widget-error">
        <div className="error-icon">⚠️</div>
        <p>Failed to load widget</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }
  
  // Determine what to show based on mode and state
  const shouldShowChatContainer = () => {
    return !config.floating || isExpanded;
  };
  
  const shouldShowToggleButton = () => {
    return config.floating && !isExpanded;
  };
  
  return (
    <div 
      ref={containerRef}
      className={`widget-container ${config.floating ? 'floating' : 'inline'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{
        '--primary-color': settings?.primary_color || '#ea580c',
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* Toggle Button (for floating mode when collapsed) */}
      {shouldShowToggleButton() && (
        <div className="toggle-button-container">
          <button 
            className="widget-toggle-button"
            onClick={handleToggle}
            style={{ 
              backgroundColor: settings?.primary_color || '#ea580c'
            }}
            title={`Open ${settings?.chatbot_name || 'AI Assistant'}`}
          >
            <ChatIcon />
          </button>
        </div>
      )}

      {/* Chat Container */}
      {shouldShowChatContainer() && (
        <div className="widget-chat-container">
          {/* Header */}
          <div 
            className="widget-header"
            style={{ 
              background: `linear-gradient(135deg, ${settings?.primary_color || '#ea580c'}, #f97316)` 
            }}
          >
            <div className="header-content">
              <div className="bot-avatar">
                <BotIcon />
              </div>
              <div className="header-text">
                <div className="bot-name">{settings?.chatbot_name || 'AI Assistant'}</div>
                <div className="status">
                  <div className="status-dot"></div>
                  Online
                </div>
              </div>
            </div>
            
            {/* Close button for floating mode */}
            {config.floating && (
              <button 
                className="close-button" 
                onClick={handleToggle}
                title="Close chat"
              >
                <CloseIcon />
              </button>
            )}
            
            {config.testMode && (
              <div className="test-badge">Test Mode</div>
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

// Icons
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