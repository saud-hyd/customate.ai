// frontend/dashboard/src/components/ChatInterface.jsx

import React, { useState, useEffect, useRef } from 'react';
import chatService from '../services/chatService';

const ChatInterface = () => {
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
    e.preventDefault();
    
    if (!input.trim()) return;
    
    // Add user message to state
    const userMessage = {
      role: 'user',
      content: input,
      id: `temp-${Date.now()}`,
    };
    
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setInput('');
    
    // Create a placeholder for the bot's response
    const tempBotMessage = {
      role: 'assistant',
      content: '',
      id: `temp-bot-${Date.now()}`,
      isStreaming: true,
    };
    
    setMessages((prevMessages) => [...prevMessages, tempBotMessage]);
    setIsLoading(true);

    try {
      // Cancel any existing stream
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }
      
      // Create a streaming response
      cancelStreamRef.current = chatService.sendMessageStreaming(
        input,
        sessionId,
        // On chunk received
        (chunk, messageId, isComplete) => {
          setMessages((prevMessages) => {
            // Find the bot message placeholder
            const updatedMessages = [...prevMessages];
            const botMessageIndex = updatedMessages.findIndex(
              (msg) => msg.role === 'assistant' && msg.isStreaming
            );
            
            if (botMessageIndex !== -1) {
              if (isComplete) {
                // Replace with complete message
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: chunk,
                  id: messageId,
                  isStreaming: false,
                };
              } else {
                // Append to existing content
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: updatedMessages[botMessageIndex].content + chunk,
                  id: messageId,
                };
              }
            }
            
            return updatedMessages;
          });
        },
        // On done
        (response) => {
          setIsLoading(false);
          setSessionId(response.session_id);
          
          // Make sure we have the final message
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const botMessageIndex = updatedMessages.findIndex(
              (msg) => msg.role === 'assistant' && msg.isStreaming
            );
            
            if (botMessageIndex !== -1) {
              updatedMessages[botMessageIndex] = {
                ...updatedMessages[botMessageIndex],
                content: response.message.content,
                id: response.message.id,
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
          setMessages((prevMessages) => {
            const updatedMessages = [...prevMessages];
            const botMessageIndex = updatedMessages.findIndex(
              (msg) => msg.role === 'assistant' && msg.isStreaming
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
        }
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);
      
      // Update the bot message with error
      setMessages((prevMessages) => {
        const updatedMessages = [...prevMessages];
        const botMessageIndex = updatedMessages.findIndex(
          (msg) => msg.role === 'assistant' && msg.isStreaming
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

  // Handle input change
  const handleInputChange = (e) => {
    setInput(e.target.value);
  };

  // Message component
  const Message = ({ message }) => {
    const isUser = message.role === 'user';
    
    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div
          className={`${
            isUser ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'
          } ${message.isError ? 'bg-red-100 text-red-800' : ''} 
            rounded-lg py-2 px-4 max-w-[80%]`}
        >
          {message.content}
          {message.isStreaming && <span className="ml-1 animate-pulse">▌</span>}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-md shadow-md">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Send a message to start a conversation</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <Message key={`${message.id}-${index}`} message={message} />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="border-t p-4">
        <div className="flex">
          <input
            type="text"
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
            placeholder="Type your message..."
            className="flex-1 px-4 py-2 border rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className={`px-4 py-2 bg-blue-500 text-white rounded-r-md 
              ${
                isLoading || !input.trim()
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-blue-600'
              }`}
          >
            {isLoading ? 'Sending...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatInterface;