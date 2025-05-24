// Path: frontend/dashboard/src/components/chat/ChatInput.jsx
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { useToast } from '../../context/ToastContext';

const ChatInput = ({ 
  onSendMessage, 
  disabled = false, 
  placeholder = "Type your message...",
  suggestions = []
}) => {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState('');
  const textareaRef = useRef(null);
  const { showSubscriptionError } = useToast();

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [message]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading || disabled || isBlocked) {
      return;
    }

    const messageToSend = message.trim();
    setMessage('');
    setIsLoading(true);
    setIsBlocked(false);

    try {
      await onSendMessage(messageToSend);
    } catch (error) {
      // Handle subscription limit errors
      if (error.response?.status === 402) {
        const errorData = error.response.data;
        setIsBlocked(true);
        setBlockMessage(errorData.message || 'Message limit reached');
        
        // Show subscription error toast
        showSubscriptionError(
          errorData.message || 'You have reached your monthly message limit.',
          errorData.upgrade_url || '/subscription'
        );
      } else {
        // Handle other errors
        console.error('Error sending message:', error);
        setMessage(messageToSend); // Restore message on error
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
    textareaRef.current?.focus();
  };

  const isDisabled = disabled || isLoading || isBlocked;

  return (
    <div className="space-y-3">
      {/* Subscription limit warning */}
      {isBlocked && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 rounded-md">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-800">Message Limit Reached</p>
              <p className="text-sm text-red-700 mt-1">{blockMessage}</p>
              <a 
                href="/subscription" 
                className="text-sm text-red-600 underline hover:text-red-800 mt-1 inline-block"
              >
                Upgrade your plan to continue chatting
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && !message && (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isDisabled}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex items-end space-x-2">
        <div className="relative flex-1">
          <textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isBlocked ? 'Message limit reached' : placeholder}
            disabled={isDisabled}
            className={`w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${
              isBlocked ? 'border-red-300 bg-red-50' : 'border-gray-300'
            }`}
            rows="1"
            style={{ maxHeight: '120px' }}
          />
        </div>
        
        <button
          type="submit"
          disabled={isDisabled || !message.trim()}
          className={`p-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            isBlocked 
              ? 'bg-red-100 text-red-600' 
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isLoading ? (
            <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
          ) : isBlocked ? (
            <ExclamationTriangleIcon className="h-5 w-5" />
          ) : (
            <PaperAirplaneIcon className="h-5 w-5" />
          )}
        </button>
      </form>

      {/* Character/status indicator */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>
          {isBlocked ? (
            <span className="text-red-600">✋ Messaging blocked - upgrade needed</span>
          ) : isLoading ? (
            <span>🤖 AI is thinking...</span>
          ) : (
            <span>💬 Press Enter to send, Shift+Enter for new line</span>
          )}
        </span>
        <span>{message.length}/2000</span>
      </div>
    </div>
  );
};

export default ChatInput;