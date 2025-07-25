// Path: frontend/dashboard/src/components/chat/ChatBubble.jsx
import React from 'react';
import PropTypes from 'prop-types';
import DOMPurify from 'dompurify';
import { marked } from 'marked';

const ChatBubble = ({ message, isUser, timestamp }) => {
  // Format timestamp
  const formattedTime = new Date(timestamp).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  });
  
  // Process markdown in bot messages
  const processedContent = isUser 
    ? message 
    : DOMPurify.sanitize(marked.parse(message));

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div 
        className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-none' 
            : 'bg-gray-100 text-gray-800 rounded-bl-none'
        }`}
      >
        {isUser ? (
          <p className="text-sm whitespace-pre-wrap">{message}</p>
        ) : (
          <div 
            className="text-sm prose prose-sm max-w-none whitespace-pre-wrap"
            dangerouslySetInnerHTML={{ __html: processedContent }}
          />
        )}
        <div className={`text-xs mt-1 text-right ${isUser ? 'text-indigo-200' : 'text-gray-500'}`}>
          {formattedTime}
        </div>
      </div>
    </div>
  );
};

ChatBubble.propTypes = {
  message: PropTypes.string.isRequired,
  isUser: PropTypes.bool.isRequired,
  timestamp: PropTypes.string.isRequired
};

export default ChatBubble;