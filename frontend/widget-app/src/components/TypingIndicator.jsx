import React, { useEffect, useRef } from 'react';

const TypingIndicator = ({ settings }) => {
  const indicatorRef = useRef(null);

  // FIXED: Ensure typing indicator scrolls into view smoothly
  useEffect(() => {
    if (indicatorRef.current) {
      // Small delay to ensure proper rendering before scrolling
      const timeoutId = setTimeout(() => {
        indicatorRef.current?.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'end' 
        });
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  // FIXED: Get primary color with fallback
  const primaryColor = settings?.primary_color || '#ea580c';

  return (
    <div 
      ref={indicatorRef}
      className="message assistant typing"
      role="status"
      aria-label="AI is typing"
    >
      <div className="message-bubble typing-bubble">
        <div className="typing-indicator">
          <div 
            className="typing-dot"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
          <div 
            className="typing-dot"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
          <div 
            className="typing-dot"
            style={{ backgroundColor: primaryColor }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;