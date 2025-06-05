import React from 'react';

const TypingIndicator = ({ settings }) => {
  return (
    <div className="message assistant typing">
      <div className="message-bubble typing-bubble">
        <div className="typing-indicator">
          <div 
            className="typing-dot"
            style={{ 
              backgroundColor: settings?.primary_color || '#ea580c'
            }}
          ></div>
          <div 
            className="typing-dot"
            style={{ 
              backgroundColor: settings?.primary_color || '#ea580c'
            }}
          ></div>
          <div 
            className="typing-dot"
            style={{ 
              backgroundColor: settings?.primary_color || '#ea580c'
            }}
          ></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;