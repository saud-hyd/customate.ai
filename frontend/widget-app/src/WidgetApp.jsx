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
    
    // FIXED: Only auto-expand in test mode, not inline mode
    if (testMode) {
      setIsExpanded(true);
    } else {
      setIsExpanded(false); // Ensure it starts collapsed for normal floating mode
    }
  }, []);

  // Listen for postMessage updates from parent (TestChatbotPage)
  useEffect(() => {
    const handlePostMessage = (event) => {
      // Security check - only accept messages from same origin or trusted origins
      const trustedOrigins = [
        'http://localhost:3000',
        'https://customate.vercel.app',
        'https://customate-ai-1.onrender.com'
      ];
      
      if (!trustedOrigins.includes(event.origin) && event.origin !== window.location.origin) {
        console.warn('Ignored postMessage from untrusted origin:', event.origin);
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
              status: 'healthy'
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
        timestamp: Date.now()
      }, '*');
    }

    return () => {
      window.removeEventListener('message', handlePostMessage);
    };
  }, []);

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

  // Handle expand/collapse for floating mode
  const handleToggle = () => {
    if (isFloating) {
      setIsExpanded(!isExpanded);
      console.log('🔄 Widget toggled:', !isExpanded ? 'expanded' : 'collapsed');
    }
  };

  // Send status updates to parent
  useEffect(() => {
    if (window.parent !== window) {
      const status = {
        type: 'WIDGET_STATUS',
        data: {
          loaded: !settingsLoading,
          expanded: isExpanded,
          floating: isFloating,
          testMode: isTestMode,
          messagesCount: messages.length,
          sessionId: sessionId,
          settings: settings,
          error: settingsError || chatError,
          timestamp: Date.now()
        }
      };
      
      window.parent.postMessage(status, '*');
    }
  }, [settingsLoading, isExpanded, isFloating, isTestMode, messages.length, sessionId, settings, settingsError, chatError]);

  if (settingsLoading) {
    return (
      <div className="widget-loading">
        <div className="loading-spinner"></div>
        <p>Loading widget...</p>
        {isTestMode && (
          <p className="text-xs text-gray-500 mt-2">Test mode active</p>
        )}
      </div>
    );
  }

  if (settingsError) {
    return (
      <div className="widget-error">
        <div className="error-icon">⚠️</div>
        <p>Failed to load widget</p>
        <button onClick={() => window.location.reload()}>Retry</button>
        {isTestMode && (
          <div className="text-xs text-gray-500 mt-2">
            <p>Test mode error details:</p>
            <p>{settingsError}</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`widget-container ${isFloating ? 'floating' : 'inline'} ${isExpanded ? 'expanded' : 'collapsed'}`}
      style={{
        '--primary-color': settings?.primary_color || '#ea580c',
        '--widget-position': settings?.widget_position || 'bottom-right'
      }}
    >
      {/* FIXED: Only show toggle button when floating AND not expanded */}
      {isFloating && !isExpanded && (
        <button 
          className="widget-toggle-button"
          onClick={handleToggle}
          style={{ backgroundColor: settings?.primary_color || '#ea580c' }}
          title={`Open ${settings?.chatbot_name || 'AI Assistant'}`}
        >
          <ChatIcon />
        </button>
      )}

      {/* FIXED: Only show chat interface when explicitly expanded OR in inline/test mode */}
      {(isExpanded || (!isFloating && isTestMode)) && (
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
                  {settingsOverride && (
                    <span className="ml-2 text-xs opacity-75">• Live sync</span>
                  )}
                </div>
              </div>
            </div>
            
            {/* FIXED: Only show close button in floating mode */}
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
                {settingsOverride && (
                  <span className="ml-1">• Live</span>
                )}
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
    </div>
  );
};

// Enhanced orange chat icon
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