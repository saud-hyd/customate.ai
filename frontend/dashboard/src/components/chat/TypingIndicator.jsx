// Path: frontend/dashboard/src/components/chat/TypingIndicator.jsx
import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex justify-start mb-4">
      <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
        <div className="flex space-x-1">
          <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '0ms' }}></div>
          <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '150ms' }}></div>
          <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    </div>
  );
};

export default TypingIndicator;