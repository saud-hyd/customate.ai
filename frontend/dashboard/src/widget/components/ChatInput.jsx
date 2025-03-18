import React, { useState, useRef, useEffect } from 'react';

const ChatInput = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);
  
  // Focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedMessage = message.trim();
    
    if (trimmedMessage) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
  };
  
  // Handle input changes
  const handleChange = (e) => {
    setMessage(e.target.value);
  };
  
  // Handle keydown events (Shift+Enter for new line, Enter to send)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };
  
  // Auto-resize textarea
  const handleInput = (e) => {
    // Reset height to auto to properly measure the scroll height
    e.target.style.height = 'auto';
    
    // Set the height to the scroll height plus a small buffer
    const newHeight = Math.min(e.target.scrollHeight + 2, 120);
    e.target.style.height = `${newHeight}px`;
  };
  
  return (
    <form className="customate-input-container" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        className="customate-message-input"
        placeholder="Type your message..."
        value={message}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        rows={1}
        aria-label="Type your message"
      />
      <button 
        type="submit" 
        className="customate-send-button"
        disabled={!message.trim()}
        aria-label="Send message"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M2.01 21L23 12L2.01 3L2 10L17 12L2 14L2.01 21Z" fill="currentColor"/>
        </svg>
      </button>
    </form>
  );
};

export default ChatInput;