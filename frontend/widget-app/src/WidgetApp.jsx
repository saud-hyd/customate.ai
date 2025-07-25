import React, { useState, useEffect, useRef } from 'react';
import ChatInterface from './components/ChatInterface';
import useSettings from './hooks/useSettings';
import useChat from './hooks/useChat';

const WidgetApp = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTestMode, setIsTestMode] = useState(false);
  const [isFloating, setIsFloating] = useState(true);
  const [settingsOverride, setSettingsOverride] = useState(null);
  const containerRef = useRef(null);
  
  // Get URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const testMode = urlParams.get('test') === 'true';
    const inline = urlParams.get('inline') === 'true';
    
    setIsTestMode(testMode);
    setIsFloating(!inline);
    
    // CRITICAL: For floating widgets, ALWAYS start collapsed
    if (inline) {
      setIsExpanded(true);
      console.log('🔧 Inline mode: Widget starts expanded');
    } else {
      setIsExpanded(false);
      console.log('🔧 Floating mode: Widget starts collapsed (iframe will be button size)');
    }
  }, []);

  // CRITICAL: Send immediate status to parent when state changes
  const sendStatusToParent = (expanded, immediate = false) => {
    if (window.parent !== window) {
      const status = {
        type: 'WIDGET_STATUS',
        data: {
          loaded: true,
          expanded: expanded,
          floating: isFloating,
          testMode: isTestMode,
          timestamp: Date.now()
        }
      };
      
      if (immediate) {
        // Send immediately for state changes
        window.parent.postMessage(status, '*');
        console.log('📡 IMMEDIATE status sent to parent:', { expanded, floating: isFloating });
      } else {
        // Small delay for initial load
        setTimeout(() => {
          window.parent.postMessage(status, '*');
          console.log('📡 Status sent to parent:', { expanded, floating: isFloating });
        }, 100);
      }
    }
  };

  // Handle expand/collapse for floating mode
  const handleToggle = () => {
    if (isFloating) {
      const newState = !isExpanded;
      console.log(`🔄 Widget toggling: ${isExpanded ? 'EXPANDED' : 'COLLAPSED'} → ${newState ? 'EXPANDED' : 'COLLAPSED'}`);
      
      setIsExpanded(newState);
      
      // CRITICAL: Send status immediately when toggling
      sendStatusToParent(newState, true);
    }
  };

  // Send status when expansion state changes
  useEffect(() => {
    sendStatusToParent(isExpanded);
  }, [isExpanded, isFloating, isTestMode]);

  // Listen for postMessage updates from parent
  useEffect(() => {
    const handlePostMessage = (event) => {
      const trustedOrigins = [
        'http://localhost:3000',
        'https://customate.vercel.app',
        'https://customate-ai-1.onrender.com'
      ];
      
      if (!trustedOrigins.includes(event.origin) && event.origin !== window.location.origin) {
        return;
      }

      if (event.data && typeof event.data === 'object') {
        switch (event.data.type) {
          case 'SETTINGS_UPDATE':
            console.log('📨 Received settings update via postMessage:', event.data.settings);
            setSettingsOverride(event.data.settings);
            break;
          
          case 'RESET_CHAT':
            console.log('🔄 Received chat reset command via postMessage');
            if (window.resetChatFunction) {
              window.resetChatFunction();
            }
            break;
          
          case 'PING':
            event.source?.postMessage({
              type: 'PONG',
              timestamp: Date.now(),
              status: 'healthy',
              expanded: isExpanded,
              floating: isFloating
            }, event.origin);
            break;
          
          default:
            console.log('📨 Received unknown postMessage:', event.data);
        }
      }
    };

    window.addEventListener('message', handlePostMessage);
    
    // Send ready signal to parent
    if (window.parent !== window) {
      window.parent.postMessage({
        type: 'WIDGET_READY',
        expanded: isExpanded,
        floating: isFloating,
        timestamp: Date.now()
      }, '*');
    }

    return () => {
      window.removeEventListener('message', handlePostMessage);
    };
  }, [isExpanded, isFloating]);

  // Get settings and chat functionality
  const { settings: apiSettings, loading: settingsLoading, error: settingsError } = useSettings();
  
  // Merge API settings with postMessage overrides
  const settings = settingsOverride ? { ...apiSettings, ...settingsOverride } : apiSettings;
  
  const { 
    messages, 
    isTyping, 
    sendMessage, 
    sessionId,
    error: chatError,
    resetChat
  } = useChat(settings);

  // Expose reset function for postMessage
  useEffect(() => {
    window.resetChatFunction = resetChat;
    return () => {
      window.resetChatFunction = null;
    };
  }, [resetChat]);

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

  // CRITICAL: Determine what to render based on mode and state
  const shouldShowChatContainer = () => {
    if (!isFloating) {
      // Inline mode: always show chat
      return true;
    }
    
    // Floating mode: only show when expanded
    return isExpanded;
  };

  const shouldShowToggleButton = () => {
    if (!isFloating) {
      // Inline mode: never show toggle button
      return false;
    }
    
    // Floating mode: show toggle button when collapsed
    return !isExpanded;
  };

  console.log('🎯 Widget render decision:', {
    isFloating,
    isExpanded,
    shouldShowChatContainer: shouldShowChatContainer(),
    shouldShowToggleButton: shouldShowToggleButton()
  });

  return (
    <div 
      ref={containerRef}
      className={`widget-container ${isFloating ? 'floating' : 'inline'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{
        '--primary-color': settings?.primary_color || '#ea580c',
        '--widget-position': settings?.widget_position || 'bottom-right',
        // CRITICAL: Ensure container fills iframe appropriately
        width: '100%',
        height: '100%',
        overflow: 'hidden'
      }}
    >
      {/* TOGGLE BUTTON: Only show for floating widgets when collapsed */}
      {shouldShowToggleButton() && (
        <div 
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <button 
            className="widget-toggle-button"
            onClick={handleToggle}
            style={{ 
              backgroundColor: settings?.primary_color || '#ea580c',
              // Ensure button fits in smaller iframe
              width: '60px',
              height: '60px'
            }}
            title={`Open ${settings?.chatbot_name || 'AI Assistant'}`}
          >
            <ChatIcon />
          </button>
        </div>
      )}

      {/* CHAT CONTAINER: Only render when should be visible */}
      {shouldShowChatContainer() && (
        <div 
          className="widget-chat-container"
          style={{
            // CRITICAL: Fill entire iframe when expanded
            width: '100%',
            height: '100%',
            position: 'relative'
          }}
        >
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
                  {settingsOverride && (
                    <span className="ml-2 text-xs opacity-75">• Live sync</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Close button for floating mode */}
            {isFloating && (
              <button 
                className="close-button" 
                onClick={handleToggle}
                title="Close chat"
              >
                <CloseIcon />
              </button>
            )}
            
            {isTestMode && (
              <div className="test-badge">
                Test Mode
              </div>
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

      {/* Debug info for development */}
      {isTestMode && (
        <div style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '8px',
          borderRadius: '4px',
          fontSize: '12px',
          zIndex: 1000001,
          fontFamily: 'monospace'
        }}>
          Mode: {isFloating ? 'Floating' : 'Inline'} | 
          State: {isExpanded ? 'EXPANDED' : 'COLLAPSED'} | 
          Chat: {shouldShowChatContainer() ? 'VISIBLE' : 'HIDDEN'} |
          Button: {shouldShowToggleButton() ? 'VISIBLE' : 'HIDDEN'}
        </div>
      )}
    </div>
  );
};

// Chat icon
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