import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage, settings, isTyping = false }) => {
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const textareaRef = useRef(null);
  
  // BEST PRACTICE: Character limits with proper UX
  const MAX_CHARACTERS = 4000; // Industry standard for chat
  const SHOW_COUNTER_AT = 3500; // Show counter when approaching limit
  
  // UX PRINCIPLE: Smart height that shows context (current + previous lines)
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      
      // UX: Calculate height to show meaningful content
      const lineHeight = 20; // Approximate line height
      const minLines = 1; // Minimum 1 line
      const maxLines = 4; // Show up to 4 lines before limiting
      
      const minHeight = minLines * lineHeight + 24; // Add padding
      const maxHeight = maxLines * lineHeight + 24; // Add padding
      
      const scrollHeight = textarea.scrollHeight;
      const contentHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      
      textarea.style.height = contentHeight + 'px';
      
      // UX PRINCIPLE: Only scroll when absolutely necessary
      // Always keep cursor visible, but avoid showing scrollbar for small content
      if (scrollHeight > maxHeight) {
        textarea.scrollTop = textarea.scrollHeight;
      }
    }
  }, [message]);
  
  // BEST PRACTICE: Focus on mount for better UX
  useEffect(() => {
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (!trimmedMessage || isSending || trimmedMessage.length > MAX_CHARACTERS) {
      return;
    }

    // Clear input immediately when user sends
    setMessage('');
    
    try {
      setIsSending(true);
      await onSendMessage(trimmedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      // On error, restore the message so user doesn't lose their text
      setMessage(trimmedMessage);
    } finally {
      setIsSending(false);
      
      // Refocus for next message
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  };

  const handleKeyDown = (e) => {
    // BEST PRACTICE: Enter to send, Shift+Enter for new line
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Removed complex message clearing logic - let user type freely

  const handleChange = (e) => {
    setMessage(e.target.value);
  };

  // BEST PRACTICE: Only disable SEND BUTTON, never the input
  const canSend = message.trim().length > 0 && 
                  message.trim().length <= MAX_CHARACTERS && 
                  !isSending;
  
  const isOverLimit = message.length > MAX_CHARACTERS;
  const showCounter = message.length >= SHOW_COUNTER_AT || isOverLimit;

  return (
    <form onSubmit={handleSubmit} className="chat-input-container">
      {/* BEST PRACTICE: Show character counter when needed */}
      {showCounter && (
        <div className={`character-counter ${isOverLimit ? 'over-limit' : ''}`}>
          {message.length}/{MAX_CHARACTERS} characters
        </div>
      )}
      
      <div className="input-wrapper">
        {/* BEST PRACTICE: Input is NEVER disabled - users can always type */}
        <textarea
          ref={textareaRef}
          value={message}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={
            isTyping 
              ? "AI is responding... type your next message" 
              : "Type your message..."
          }
          disabled={false} // CRITICAL: NEVER disable the input
          className={`message-input-textarea ${isOverLimit ? 'over-limit' : ''}`}
          rows={1}
          aria-label="Type your message"
          aria-describedby={showCounter ? "char-counter" : undefined}
        />
        
        {/* BEST PRACTICE: Only disable send button, with clear visual feedback */}
        <button
          type="submit"
          className={`send-button-tabbed ${canSend ? 'enabled' : 'disabled'}`}
          disabled={!canSend}
          title={
            isOverLimit
              ? `Message too long (${message.length}/${MAX_CHARACTERS} characters)`
              : isSending 
                ? "Sending message..." 
                : canSend 
                  ? "Send message (Enter)" 
                  : message.trim().length === 0
                    ? "Enter a message to send"
                    : "Cannot send message"
          }
          aria-label={canSend ? "Send message" : "Cannot send message"}
        >
          {isSending ? (
            <div className="loading-spinner-small" aria-label="Sending..."></div>
          ) : (
            <SendIcon />
          )}
        </button>
      </div>
      
      {/* BEST PRACTICE: Show helpful hint when AI is responding */}
      {isTyping && message.length === 0 && (
        <div className="typing-hint">
          💬 You can type while I'm responding
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