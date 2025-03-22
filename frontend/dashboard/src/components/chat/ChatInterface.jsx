// frontend/dashboard/src/components/chat/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import chatService from '../../services/chatService';

const ChatInterface = (props) => {
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
        llm_model: config.llmModel
      };
      console.log("Using LLM settings:", llmSettings);
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
                // Update the content (not append - the backend sends cumulative text)
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: chunk,
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
    if (props.resetSession) {
      setMessages([]);
      setSessionId(null);
    }
  }, [props.resetSession]);

  // Message component with blinking cursor for streaming
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
          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          {message.isStreaming && (
            <span className="ml-1 inline-block h-4 w-[1px] bg-current animate-pulse">▌</span>
          )}
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