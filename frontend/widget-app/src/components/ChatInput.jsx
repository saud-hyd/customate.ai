import React, { useState, useRef } from 'react';

const ChatInput = ({ onSendMessage, settings, disabled }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || disabled || isSending) return;

    const messageText = message.trim();
    setMessage('');
    setIsSending(true);

    try {
      await onSendMessage(messageText);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="chat-input-container">
      <div className="input-wrapper">
        <input
          ref={inputRef}
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message..."
          disabled={disabled || isSending}
          className="message-input"
        />
        
        <button
          type="submit"
          disabled={!message.trim() || disabled || isSending}
          className="send-button"
          style={{ 
            backgroundColor: settings.primary_color,
            opacity: (!message.trim() || disabled || isSending) ? 0.6 : 1
          }}
        >
          {isSending ? (
            <div className="loading-spinner small"></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
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