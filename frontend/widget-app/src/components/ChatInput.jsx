import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, settings, disabled = false }) => {
  const [message, setMessage] = useState('');
  const [isLocalSending, setIsLocalSending] = useState(false);
  const textareaRef = useRef(null);
  
  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      const scrollHeight = Math.min(textarea.scrollHeight, 120); // Max height of ~4 lines
      textarea.style.height = scrollHeight + 'px';
    }
  }, [message]);
  
  // Focus management
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isLocalSending) {
      return;
    }

    try {
      setIsLocalSending(true);
      setMessage(''); // Clear immediately for better UX
      
      await onSendMessage(trimmedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on error
      setMessage(trimmedMessage);
    } finally {
      setIsLocalSending(false);
      
      // Refocus after send
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const isDisabled = isLocalSending;
  const canSend = message.trim().length > 0 && !isDisabled;

  return (
    <form onSubmit={handleSubmit} className="chat-input-container">
      <div className="input-wrapper">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isDisabled ? "Please wait..." : "Type your message..."}
          disabled={isDisabled}
          className="message-input-textarea"
          rows={1}
          maxLength={2000}
        />
        
        <button
          type="submit"
          className="send-button-tabbed"
          disabled={!canSend}
          title={
            isDisabled 
              ? "Please wait for response..." 
              : canSend 
                ? "Send message" 
                : "Enter a message to send"
          }
          style={{ 
            backgroundColor: canSend ? (settings?.primary_color || '#ea580c') : 'rgba(255, 255, 255, 0.3)',
            cursor: canSend ? 'pointer' : 'not-allowed'
          }}
        >
          {isDisabled ? (
            <div className="loading-spinner-small"></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
      
      {/* Character counter for long messages */}
      {message.length > 1500 && (
        <div className="character-counter">
          {message.length}/2000 characters
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