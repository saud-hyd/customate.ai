import React from 'react';

/**
 * Animated typing indicator to show that the assistant is generating a response
 */
const TypingIndicator = () => {
  return (
    <div className="customate-typing-indicator">
      <div className="customate-typing-dot"></div>
      <div className="customate-typing-dot"></div>
      <div className="customate-typing-dot"></div>
    </div>
  );
};

export default TypingIndicator;