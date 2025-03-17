import React from 'react';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';

const ChatMessages = ({ 
  messages, 
  isLoading, 
  showTypingIndicator, 
  messagesEndRef 
}) => {
  // Group consecutive messages from the same sender
  const groupedMessages = messages.reduce((groups, message, index) => {
    // If this is the first message or if the sender changes, create a new group
    if (index === 0 || message.role !== messages[index - 1].role) {
      groups.push({
        role: message.role,
        messages: [message]
      });
    } else {
      // Add to the existing group
      groups[groups.length - 1].messages.push(message);
    }
    return groups;
  }, []);

  // Format date for timestamp display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      console.error('Invalid timestamp format:', e);
      return '';
    }
  };
  
  return (
    <div className="customate-messages-container">
      {isLoading && messages.length === 0 ? (
        <div className="customate-loading-container">
          <div className="customate-loading-spinner"></div>
          <p>Loading conversation...</p>
        </div>
      ) : (
        <>
          {groupedMessages.map((group, groupIndex) => (
            <div 
              key={`group-${groupIndex}`} 
              className={`customate-message-group ${group.role === 'user' ? 'user' : 'assistant'}`}
            >
              {group.messages.map((message, messageIndex) => (
                <ChatBubble
                  key={message.id || `${group.role}-${groupIndex}-${messageIndex}`}
                  message={message}
                  showTimestamp={messageIndex === group.messages.length - 1}
                  formatTimestamp={formatTimestamp}
                  isError={message.isError}
                />
              ))}
            </div>
          ))}
          
          {showTypingIndicator && (
            <div className="customate-message-group assistant">
              <TypingIndicator />
            </div>
          )}
          
          {/* This is used to scroll to the bottom */}
          <div ref={messagesEndRef} className="customate-messages-end" />
        </>
      )}
    </div>
  );
};

export default ChatMessages;