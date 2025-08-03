// frontend/widget-app/src/WidgetApp.jsx
import React, { useState, useEffect, useRef } from 'react';
import TabbedChatWidget from './components/TabbedChatWidget'; // NEW: Import the tabbed widget
import useSettings from './hooks/useSettings';
import useChat from './hooks/useChat';
import './styles/widget.css';
import ChatInterface from './components/ChatInterface'; // Import ChatInterface if needed

const WidgetApp = () => {
  // Widget state
  const [isExpanded, setIsExpanded] = useState(false);
  const [config, setConfig] = useState(null);
  
  // Refs
  const containerRef = useRef(null);
  
  // Get settings and chat functionality
  const { settings, error: settingsError } = useSettings();
  const { messages, isTyping, sendMessage, resetChat, error: chatError } = useChat(settings);
  
  // Helper function to notify parent window
  const notifyParent = (type, data = {}) => {
    try {
      window.parent.postMessage({
        type,
        data: {
          ...data,
          timestamp: Date.now(),
          widgetId: config?.apiKey || 'unknown'
        }
      }, '*');
    } catch (error) {
      console.warn('Could not notify parent:', error);
    }
  };
  
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
  
  // Send status updates when expanded state changes
  useEffect(() => {
    if (config?.floating) {
      console.log(`🔄 Widget toggling: ${isExpanded ? 'expanded' : 'collapsed'}`);
      notifyParent('WIDGET_STATUS', { 
        expanded: isExpanded,
        floating: true 
      });
    }
  }, [isExpanded, config]);
  
  // Toggle handler
  const handleToggle = () => {
    if (config?.floating) {
      const newExpanded = !isExpanded;
      setIsExpanded(newExpanded);
      notifyParent('WIDGET_TOGGLE', { expanded: newExpanded });
    }
  };
  
  
  // Show error state
  if (settingsError) {
    return (
      <div className="widget-container">
        <div className="widget-error">
          <span className="error-icon">⚠️</span>
          <p>Failed to load widget</p>
          <button onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </div>
    );
  }
  const handleClose = () => {
  // Close the widget and reset chat for next opening
  if (config?.floating) {
    setIsExpanded(false);
    resetChat(); // Clear conversation
    notifyParent('WIDGET_CLOSED_AND_RESET');
  }
};
  // Main render logic
  return (
    <div 
      ref={containerRef}
      className={`widget-container ${config?.floating ? 'floating' : 'inline'} ${isExpanded ? 'expanded' : 'collapsed'}`}
    >
      {config?.testMode && (
        <div className="test-badge">TEST</div>
      )}
      
      {/* Floating mode: toggle button when collapsed */}
      {config?.floating && !isExpanded && (
        <div className="toggle-button-container">
          <button
            className="widget-toggle-button"
            onClick={handleToggle}
            title="Open chat"
            aria-label="Open chat widget"
            style={{
              background: `linear-gradient(135deg, ${settings?.primary_color || '#ea580c'}, #f97316)`
            }}
          >
            <ChatToggleIcon />
          </button>
        </div>
      )}
      
      {/* Chat interface when expanded (or always for inline) */}
      {(isExpanded || !config?.floating) && (
        <div className="widget-chat-container">
          {/* Header for floating mode only */}
          {config?.floating && (
            <div 
              className="widget-header"
              style={{
                background: `linear-gradient(135deg, ${settings?.primary_color || '#ea580c'}, #f97316)`
              }}
            >
              <div className="header-content">
              <div className="header-info">
                <h3 className="header-title">
                  {settings?.company_name || 'Chat Support'}
                </h3>
                <p className="header-subtitle">
                  {isTyping ? 'AI is typing...' : 'We\'re here to help!'}
                </p>
              </div>
              <div className="header-controls">
                <button 
                  className="header-control-button"
                  onClick={handleToggle}
                  title="Minimize chat"
                  aria-label="Minimize chat widget"
                >
                  <MinusIcon />
                </button>
                <button 
                  className="header-control-button"
                  onClick={handleClose}
                  title="Close chat"
                  aria-label="Close chat and start fresh"
                >
                  <CloseIcon />
                </button>
              </div>
              </div>
            </div>
          )}
          
          {/* NEW: Use TabbedChatWidget instead of ChatInterface */}
          <TabbedChatWidget
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

// Icon components
const ChatToggleIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    <path d="M13 8H7"/>
    <path d="M17 12H7"/>
  </svg>
);

const MinusIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const CloseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18"/>
    <line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

export default WidgetApp;