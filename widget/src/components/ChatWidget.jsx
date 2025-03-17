import React, { useState, useEffect, useRef } from 'react';
import ChatHeader from './ChatHeader';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import ChatSuggestions from './ChatSuggestions';
import { getConfig, generateCssVariables } from '../config';
import { sendMessage, getHistory } from '../utils/api-local';
import { getSessionId, saveSessionId } from '../utils/storage';
import { trackEvent } from '../utils/analytics';

const ChatWidget = () => {
  // Widget state
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [session, setSession] = useState(null);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [error, setError] = useState(null);
  
  // References
  const widgetRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Get config
  const config = getConfig();
  const cssVars = generateCssVariables();
  
  // Initialize widget
  useEffect(() => {
    // Check if widget should be initially open
    if (config.showInitiallyOpen) {
      setIsOpen(true);
    }
    
    // Add event listeners for external control
    window.addEventListener('customate-widget-open', handleOpen);
    window.addEventListener('customate-widget-close', handleClose);
    
    // Load session ID from storage
    const existingSessionId = getSessionId();
    if (existingSessionId) {
      setSession({ id: existingSessionId });
      
      // Load chat history
      loadChatHistory(existingSessionId);
    }
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('customate-widget-open', handleOpen);
      window.removeEventListener('customate-widget-close', handleClose);
    };
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  // Load chat history
  const loadChatHistory = async (sessionId) => {
    try {
      setIsLoading(true);
      const history = await getHistory(sessionId);
      
      if (history && history.length > 0) {
        setMessages(history);
      } else {
        // Add welcome message if no history
        addWelcomeMessage();
      }
    } catch (err) {
      console.error('Failed to load chat history:', err);
      // Still add welcome message on error
      addWelcomeMessage();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Add initial welcome message
  const addWelcomeMessage = () => {
    const welcomeMessage = {
      id: 'welcome',
      content: config.greeting || 'Hello! How can I help you today?',
      role: 'assistant',
      timestamp: new Date().toISOString()
    };
    
    setMessages([welcomeMessage]);
  };
  
  // Open widget
  const handleOpen = () => {
    setIsOpen(true);
    trackEvent('widget_opened');
  };
  
  // Close widget
  const handleClose = () => {
    setIsOpen(false);
    trackEvent('widget_closed');
  };
  
  // Toggle widget open/closed
  const toggleWidget = () => {
    if (isOpen) {
      handleClose();
    } else {
      handleOpen();
    }
  };
  
  // Scroll to bottom of messages
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  // Handle new user message
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    
    // Create new message object
    const userMessage = {
      id: `user-${Date.now()}`,
      content: text,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Add to messages
    setMessages(prev => [...prev, userMessage]);
    
    // Show typing indicator
    if (config.enableTypingIndicator) {
      setShowTypingIndicator(true);
    }
    
    try {
      // Send message to backend
      const response = await sendMessage({
        message: text,
        session_id: session?.id || null
      });
      
      // If we get a new session ID, save it
      if (response.session_id && (!session || session.id !== response.session_id)) {
        setSession({ id: response.session_id });
        saveSessionId(response.session_id);
      }
      
      // Hide typing indicator
      setShowTypingIndicator(false);
      
      // Add response to messages
      const assistantMessage = {
        id: response.message.id || `assistant-${Date.now()}`,
        content: response.message.content,
        role: 'assistant',
        timestamp: response.message.created_at || new Date().toISOString()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Update suggestions if any
      if (response.suggestions && response.suggestions.length > 0) {
        setSuggestions(response.suggestions);
      } else {
        setSuggestions([]);
      }
      
      // Track successful message
      trackEvent('message_sent', { 
        knowledge_used: response.knowledge_used || false,
        session_id: response.session_id
      });
    } catch (err) {
      // Hide typing indicator
      setShowTypingIndicator(false);
      
      // Add error message
      const errorMessage = {
        id: `error-${Date.now()}`,
        content: "I'm sorry, I couldn't process your message. Please try again later.",
        role: 'assistant',
        isError: true,
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      setError(err.message || 'Failed to send message');
      
      // Track error
      trackEvent('message_error', { error: err.message });
      console.error('Failed to send message:', err);
    }
  };
  
  // Handle suggestion click
  const handleSuggestionClick = (suggestion) => {
    handleSendMessage(suggestion);
    setSuggestions([]);
    trackEvent('suggestion_clicked');
  };
  
  // Render the widget
  return (
    <div 
      className={`customate-widget ${isOpen ? 'open' : 'closed'}`}
      ref={widgetRef}
      style={cssVars}
      data-position={config.position}
    >
      {!isOpen && (
        <button 
          className="customate-widget-toggle-button"
          onClick={toggleWidget}
          aria-label="Open chat"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M20 2H4C2.9 2 2 2.9 2 4V22L6 18H20C21.1 18 22 17.1 22 16V4C22 2.9 21.1 2 20 2Z" fill="currentColor"/>
          </svg>
        </button>
      )}
      
      {isOpen && (
        <div className="customate-widget-container">
          <ChatHeader 
            title={config.title || 'Chat with us'} 
            onClose={handleClose} 
          />
          
          <ChatMessages 
            messages={messages} 
            isLoading={isLoading}
            showTypingIndicator={showTypingIndicator}
            messagesEndRef={messagesEndRef}
          />
          
          {suggestions.length > 0 && config.enableSuggestions && (
            <ChatSuggestions 
              suggestions={suggestions} 
              onSuggestionClick={handleSuggestionClick} 
            />
          )}
          
          <ChatInput onSendMessage={handleSendMessage} />
          
          {error && (
            <div className="customate-error-message">
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatWidget;