// frontend/dashboard/src/widget/components/ChatBubble.jsx
import React from 'react';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ChatBubble = ({ message, showTimestamp, formatTimestamp, isError }) => {
  // Function to render message content with proper formatting
  const renderContent = (content) => {
    // Check if content is not a string
    if (typeof content !== 'string') {
      return <div>{String(content)}</div>;
    }
    
    // Use marked to parse markdown for assistant messages
    if (message.role === 'assistant') {
      return (
        <div 
          className="customate-message-content-markdown"
          dangerouslySetInnerHTML={{ 
            __html: DOMPurify.sanitize(marked.parse(content)) 
          }}
        />
      );
    }
    
    // For user messages, just split by line breaks
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
      
      {/* Show knowledge used badge if applicable */}
      {message.role === 'assistant' && message.knowledge_used && (
        <div className="bg-green-600 text-white text-xs px-2 py-0.5 rounded absolute -top-2 -right-2">
          Knowledge Used
        </div>
      )}
    </div>
  );
};

export default ChatBubble;