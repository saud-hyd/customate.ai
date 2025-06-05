import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, settings, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  // Sync internal sending state with external disabled state
  useEffect(() => {
    if (!disabled && isSending) {
      setIsSending(false);
    }
  }, [disabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSending) {
      console.log('❌ Cannot send message:', { 
        hasMessage: !!message.trim(), 
        disabled, 
        isSending 
      });
      return;
    }

    const messageText = message.trim();
    console.log('📤 Sending message:', messageText);
    
    setMessage(''); // Clear input immediately
    setIsSending(true);

    try {
      await onSendMessage(messageText);
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Restore message on error
      setMessage(messageText);
    } finally {
      setIsSending(false);
      // Focus input after sending (with small delay)
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isInputDisabled = disabled || isSending;
  const canSend = message.trim() && !isInputDisabled;

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
            isInputDisabled 
              ? "Please wait..." 
              : "Type your message..."
          }
          disabled={isInputDisabled}
          className="message-input"
          autoComplete="off"
          autoFocus={!isInputDisabled}
        />
        
        <button
          type="submit"
          disabled={!canSend}
          className="send-button"
          title={
            !canSend 
              ? (isInputDisabled ? "Please wait..." : "Enter a message")
              : "Send message"
          }
          style={{ 
            backgroundColor: settings?.primary_color || '#ea580c',
            opacity: !canSend ? 0.6 : 1,
            cursor: !canSend ? 'not-allowed' : 'pointer'
          }}
        >
          {isSending || disabled ? (
            <div className="loading-spinner small"></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
      
      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
          Disabled: {disabled ? 'Yes' : 'No'} | 
          Sending: {isSending ? 'Yes' : 'No'} | 
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