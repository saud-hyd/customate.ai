import React from 'react';

const ChatBubble = ({ message, showTimestamp, formatTimestamp, isError }) => {
  // Function to render message content with line breaks
  const renderContent = (content) => {
    // Check if content contains markdown or HTML - in a real app we would parse this properly
    if (typeof content !== 'string') {
      return <div>{String(content)}</div>;
    }
    
    // Split by line breaks and render paragraphs
    const paragraphs = content.split('\n').filter(p => p.trim());
    
    if (paragraphs.length <= 1) {
      return <div>{content}</div>;
    }
    
    return (
      <>
        {paragraphs.map((paragraph, index) => (
          <div key={index} className="customate-message-paragraph">
            {paragraph}
          </div>
        ))}
      </>
    );
  };

  return (
    <div 
      className={`customate-message-bubble ${message.role} ${isError ? 'error' : ''}`}
    >
      <div className="customate-message-content">
        {renderContent(message.content)}
      </div>
      
      {showTimestamp && message.timestamp && (
        <div className="customate-message-timestamp">
          {formatTimestamp(message.timestamp)}
        </div>
      )}
    </div>
  );
};

export default ChatBubble;