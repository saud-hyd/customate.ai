import React, { useState, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';

const ChatInput = ({ onSendMessage, disabled = false, primaryColor = '#4f46e5' }) => {
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
    
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
    }
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
    <form className="flex border-t p-4" onSubmit={handleSubmit}>
      <textarea
        ref={inputRef}
        className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        disabled={disabled}
        rows={1}
        aria-label="Type your message"
      />
      <button 
        type="submit" 
        className={`px-4 py-2 text-white rounded-r-md transition-colors ${
          disabled || !message.trim()
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:opacity-90'
        }`}
        style={{ backgroundColor: primaryColor }}
        disabled={disabled || !message.trim()}
        aria-label="Send message"
      >
        {disabled ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Sending
          </span>
        ) : 'Send'}
      </button>
    </form>
  );
};

ChatInput.propTypes = {
  onSendMessage: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  primaryColor: PropTypes.string
  
};

export default ChatInput;