// frontend/dashboard/src/components/chat/SuggestionChips.jsx
import React from 'react';
import PropTypes from 'prop-types';

const SuggestionChips = ({ suggestions, onSuggestionClick, primaryColor }) => {
  if (!suggestions || suggestions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          onClick={() => onSuggestionClick(suggestion)}
          className="text-sm px-3 py-1 rounded-full border transition-colors"
          style={{ 
            borderColor: primaryColor,
            color: primaryColor,
            background: 'white',
            '&:hover': {
              backgroundColor: `${primaryColor}10`
            }
          }}
        >
          {suggestion}
        </button>
      ))}
    </div>
  );
};

SuggestionChips.propTypes = {
  suggestions: PropTypes.arrayOf(PropTypes.string),
  onSuggestionClick: PropTypes.func.isRequired,
  primaryColor: PropTypes.string.isRequired
};

SuggestionChips.defaultProps = {
  suggestions: [],
  primaryColor: '#4f46e5'
};

export default SuggestionChips;