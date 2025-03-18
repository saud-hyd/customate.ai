// frontend/dashboard/src/widget/components/ChatSuggestions.jsx
import React from 'react';

/**
 * Component for displaying suggested responses/questions
 * 
 * @param {Array} suggestions - Array of suggestion strings
 * @param {Function} onSuggestionClick - Callback for when a suggestion is clicked
 * @param {String} primaryColor - Primary color for styling
 */
const ChatSuggestions = ({ suggestions, onSuggestionClick, primaryColor }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }
  
  return (
    <div className="customate-suggestions-container">
      <div className="customate-suggestions-scroll">
        {suggestions.map((suggestion, index) => (
          <button
            key={`suggestion-${index}`}
            className="customate-suggestion-button"
            onClick={() => onSuggestionClick(suggestion)}
            style={{ 
              borderColor: primaryColor,
              '&:hover': {
                backgroundColor: `${primaryColor}10`
              }
            }}
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  );
};

export default ChatSuggestions;