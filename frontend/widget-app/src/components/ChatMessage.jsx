import React from 'react';

const ChatMessage = ({ message, settings }) => {
  const isUser = message.role === 'user';
  
  // Simple markdown parser
  const parseMarkdown = (text) => {
    if (!text) return '';
    
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
      .replace(/^- (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
  };

  return (
    <div className={`message ${isUser ? 'user' : 'assistant'}`}>
      <div 
        className="message-bubble"
        style={{
          backgroundColor: isUser ? settings.primary_color : '#ffffff',
          color: isUser ? '#ffffff' : '#1f2937'
        }}
        dangerouslySetInnerHTML={{
          __html: parseMarkdown(message.content)
        }}
      />
    </div>
  );
};

export default ChatMessage;