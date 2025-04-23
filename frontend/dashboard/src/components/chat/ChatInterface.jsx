// frontend/dashboard/src/components/chat/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import chatService from '../../services/chatService';
import PropTypes from 'prop-types';

const ChatInterface = ({ config }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const cancelStreamRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!input.trim()) return;
    
    // Get LLM settings from props if available
    let llmSettings = null;
    if (config && config.llmProvider) {
      llmSettings = {
        llm_provider: config.llmProvider,
        llm_model: config.llmModel,
        temperature: config.temperature
      };
    }
    
    // Add user message to state
    const userMessage = {
      role: 'user',
      content: input,
      id: `temp-${Date.now()}`,
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Create a placeholder for the bot's response
    const tempBotMessageId = `temp-bot-${Date.now()}`;
    const tempBotMessage = {
      role: 'assistant',
      content: '',
      id: tempBotMessageId,
      isStreaming: true,
    };
    
    setMessages(prev => [...prev, tempBotMessage]);
    setIsLoading(true);
    setInput(''); // Clear input after sending
    
    try {
      // Cancel any existing stream
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }
      
      // Store the message for reference
      const sentMessage = input;
      
      // Create a streaming response
      cancelStreamRef.current = chatService.sendMessageStreaming(
        sentMessage,
        sessionId,
        // On chunk received
        (chunk, messageId, isComplete) => {
          setMessages(prev => {
            // Find the bot message placeholder by ID or by being the last assistant message
            const updatedMessages = [...prev];
            const botMessageIndex = updatedMessages.findIndex(
              msg => msg.id === tempBotMessageId || 
                    (msg.role === 'assistant' && msg.isStreaming)
            );
            
            if (botMessageIndex !== -1) {
              if (isComplete) {
                // Replace with complete message
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: chunk,
                  id: messageId || tempBotMessageId,
                  isStreaming: false,
                };
              } else {
                // Update the content
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: updatedMessages[botMessageIndex].content + chunk,
                  id: messageId || tempBotMessageId,
                };
              }
            }
            
            return updatedMessages;
          });
          
          // Scroll to bottom with each new chunk
          setTimeout(scrollToBottom, 50);
        },
        // On done
        (response) => {
          setIsLoading(false);
          if (response && response.session_id) {
            setSessionId(response.session_id);
          }
          
          // Make sure we have the final message
          setMessages(prev => {
            const updatedMessages = [...prev];
            const botMessageIndex = updatedMessages.findIndex(
              msg => msg.id === tempBotMessageId || 
                    (msg.role === 'assistant' && msg.isStreaming)
            );
            
            if (botMessageIndex !== -1) {
              updatedMessages[botMessageIndex] = {
                ...updatedMessages[botMessageIndex],
                id: response?.message?.id || tempBotMessageId,
                isStreaming: false,
              };
            }
            
            return updatedMessages;
          });
          
          cancelStreamRef.current = null;
        },
        // On error
        (error) => {
          console.error('Error in streaming response:', error);
          setIsLoading(false);
          
          // Update the bot message with error
          setMessages(prev => {
            const updatedMessages = [...prev];
            const botMessageIndex = updatedMessages.findIndex(
              msg => msg.id === tempBotMessageId || 
                    (msg.role === 'assistant' && msg.isStreaming)
            );
            
            if (botMessageIndex !== -1) {
              updatedMessages[botMessageIndex] = {
                ...updatedMessages[botMessageIndex],
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                isStreaming: false,
                isError: true,
              };
            }
            
            return updatedMessages;
          });
          
          cancelStreamRef.current = null;
        },
        // Pass LLM settings
        llmSettings
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      
      // Update the bot message with error
      setMessages(prev => {
        const updatedMessages = [...prev];
        const botMessageIndex = updatedMessages.findIndex(
          msg => msg.id === tempBotMessageId || 
                (msg.role === 'assistant' && msg.isStreaming)
        );
        
        if (botMessageIndex !== -1) {
          updatedMessages[botMessageIndex] = {
            ...updatedMessages[botMessageIndex],
            content: "I'm sorry, I encountered an error while processing your request. Please try again.",
            isStreaming: false,
            isError: true,
          };
        }
        
        return updatedMessages;
      });
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Reset the chat when the resetSession prop changes
  useEffect(() => {
    if (config && config.resetSession) {
      setMessages([]);
      setSessionId(null);
    }
  }, [config]);

  // Typing indicator component
  const TypingIndicator = () => (
    <div className="flex space-x-1 items-center h-5">
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );

  // Message component with typing indicator
  const Message = ({ message }) => {
    const isUser = message.role === 'user';
    const accentColor = config?.primaryColor || '#4f46e5';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`relative ${
            isUser ? 'text-white rounded-lg py-2 px-4 max-w-[80%]' : 'bg-gray-100 text-gray-800 rounded-lg py-2 px-4 max-w-[80%]'
          } ${message.isError ? 'bg-red-100 text-red-800' : ''}`}
          style={isUser ? { backgroundColor: accentColor } : {}}
        >
          {/* Message content */}
          <div className="text-sm whitespace-pre-wrap break-words">
            {message.content || (message.isStreaming && <TypingIndicator />)}
          </div>
          
          {/* Typing indicator shown while streaming */}
          {message.isStreaming && message.content && (
            <div className="mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
              <TypingIndicator />
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Send a message to start a conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message key={`${message.id || index}-${index}`} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 text-white rounded-r-md transition-colors ${
              isLoading || !input.trim()
                ? 'opacity-50 cursor-not-allowed'
                : 'hover:opacity-90'
            }`}
            style={{ backgroundColor: config?.primaryColor || '#4f46e5' }}
          >
            {isLoading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending
              </span>
            ) : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

ChatInterface.propTypes = {
  config: PropTypes.shape({
    primaryColor: PropTypes.string,
    chatbotName: PropTypes.string,
    resetSession: PropTypes.bool,
    llmProvider: PropTypes.string,
    llmModel: PropTypes.string,
    temperature: PropTypes.number,
    customData: PropTypes.object
  })
};

ChatInterface.defaultProps = {
  config: {
    primaryColor: '#4f46e5',
    temperature: 0.7
  }
};

export default ChatInterface;