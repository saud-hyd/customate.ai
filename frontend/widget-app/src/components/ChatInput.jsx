import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, settings, disabled }) => {
  const [message, setMessage] = useState('');
  const [isLocalSending, setIsLocalSending] = useState(false);
  const inputRef = useRef(null);

  // FIXED: Simple disabled state management
  const isDisabled = disabled || isLocalSending;

  // Reset local sending state when external disabled changes
  useEffect(() => {
    if (!disabled && isLocalSending) {
      setIsLocalSending(false);
    }
  }, [disabled, isLocalSending]);

  // FIXED: Simplified submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || isDisabled) {
      console.log('❌ Cannot send - disabled or empty message');
      return;
    }

    const messageText = message.trim();
    console.log('📤 Sending message:', messageText);
    
    // Clear input and set local sending state
    setMessage('');
    setIsLocalSending(true);

    try {
      await onSendMessage(messageText);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Restore message on error
      setMessage(messageText);
    } finally {
      // Always reset local sending state
      setIsLocalSending(false);
      
      // Focus input after brief delay
      setTimeout(() => {
        if (inputRef.current && !disabled) {
          inputRef.current.focus();
        }
      }, 100);
    }
  };

  // Handle Enter key
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isDisabled) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const canSend = message.trim() && !isDisabled;

  return (
    <form onSubmit={handleSubmit} className="chat-input-container">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isDisabled 
              ? "AI is responding..." 
              : "Type your message..."
          }
          disabled={isDisabled}
          className="message-input"
          autoComplete="off"
          autoFocus={!isDisabled}
          maxLength={1000} // Reasonable limit
        />
        
        <button
          type="submit"
          disabled={!canSend}
          className="send-button"
          title={
            !canSend 
              ? (isDisabled ? "Please wait for response..." : "Enter a message")
              : "Send message"
          }
          style={{ 
            backgroundColor: canSend ? (settings?.primary_color || '#ea580c') : '#9ca3af',
            cursor: canSend ? 'pointer' : 'not-allowed'
          }}
        >
          {isDisabled ? (
            <div className="loading-spinner small"></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
      
      {/* Status indicator for debugging */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ 
          fontSize: '10px', 
          color: '#666', 
          marginTop: '4px',
          fontFamily: 'monospace'
        }}>
          External Disabled: {disabled ? 'Yes' : 'No'} | 
          Local Sending: {isLocalSending ? 'Yes' : 'No'} | 
          Can Send: {canSend ? 'Yes' : 'No'}
        </div>
      )}
    </form>
  );
};

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="22" y1="2" x2="11" y2="13"></line>
    <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
  </svg>
);

export default ChatInput;