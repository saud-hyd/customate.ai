// Path: frontend/dashboard/src/components/chat/ChatInterface.jsx

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import ChatBubble from './ChatBubble'; // Ensure this is the correct path
import ChatInput from './ChatInput'; // Ensure this is the correct path
import chatService from '../../services/chatService';


const ChatInterface = ({ config }) => {
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const cancelStreamRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const userMessage = {
      role: 'user',
      content: text,
      id: `temp-${Date.now()}`,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }

      const tempBotMessageId = `temp-bot-${Date.now()}`;
      const tempBotMessage = {
        role: 'assistant',
        content: '',
        id: tempBotMessageId,
        timestamp: new Date().toISOString(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, tempBotMessage]);

      // Create LLM settings from config
      let llmSettings = null;
      if (config && config.llmProvider) {
        llmSettings = {
          llm_provider: config.llmProvider,
          llm_model: config.llmModel,
          temperature: config.temperature
        };
      }

      const sentMessage = text;

      // Create a custom chatService with API key authentication
      const apiKey = localStorage.getItem('apiKey');
      const customChatService = {
        ...chatService,
        sendMessageStreaming: (message, sessionId, onChunk, onDone, onError, llmSettings) => {
          // Create request data
          const requestData = {
            message,
            session_id: sessionId,
          };
          
          // Add LLM settings if provided
          if (llmSettings) {
            requestData.llm_settings = llmSettings;
          }
          
          // Force API key authentication
          const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': apiKey
          };
          
          // Create abort controller for cancellation
          const controller = new AbortController();
          const signal = controller.signal;
          
          // Get API URL
          const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
          
          // Start the fetch request
          fetch(`${API_URL}/api/chatbot/message/stream`, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(requestData),
            signal: signal
          })
          .then(response => {
            // Rest of the implementation (use the existing one from chatService)
            if (!response.ok) {
              throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            // Get the readable stream from the response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let messageId = null;
            let fullMessage = '';
            
            // Process the stream
            function processStream() {
              return reader.read().then(({ done, value }) => {
                if (done) {
                  // Process any remaining data in buffer
                  if (buffer) {
                    try {
                      // Handle any remaining event data
                      const lines = buffer.split('\n\n');
                      lines.forEach(line => {
                        if (line.startsWith('data: ')) {
                          const eventData = line.substring(6);
                          if (eventData && eventData !== '[DONE]') {
                            const data = JSON.parse(eventData);
                            
                            // Handle different message types
                            if (data.type === 'info') {
                              sessionId = data.session_id;
                            } else if (data.type === 'chunk') {
                              if (!messageId) messageId = data.message_id;
                              fullMessage += data.content;
                              onChunk(data.content, messageId);
                            } else if (data.type === 'complete') {
                              fullMessage = data.content;
                              onChunk(data.content, messageId, true);
                            } else if (data.type === 'done') {
                              onDone({
                                message: data.message,
                                session_id: sessionId,
                              });
                            }
                          }
                        }
                      });
                    } catch (e) {
                      console.error('Error parsing final SSE chunk:', e);
                    }
                  }
                  return;
                }
                
                // Decode the incoming chunk and add to buffer
                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;
                
                // Process complete events in buffer
                const lines = buffer.split('\n\n');
                // Keep the last (potentially incomplete) line in the buffer
                buffer = lines.pop() || '';
                
                // Process each complete SSE event
                lines.forEach(line => {
                  if (line.startsWith('data: ')) {
                    const eventData = line.substring(6);
                    if (eventData && eventData !== '[DONE]') {
                      try {
                        const data = JSON.parse(eventData);
                        
                        // Handle different message types
                        if (data.type === 'info') {
                          sessionId = data.session_id;
                        } else if (data.type === 'chunk') {
                          if (!messageId) messageId = data.message_id;
                          fullMessage += data.content;
                          onChunk(data.content, messageId);
                        } else if (data.type === 'complete') {
                          fullMessage = data.content;
                          onChunk(data.content, messageId, true);
                        } else if (data.type === 'done') {
                          onDone({
                            message: data.message,
                            session_id: sessionId,
                          });
                        } else if (data.type === 'error') {
                          onError(new Error(data.error || 'Unknown error'));
                        }
                      } catch (e) {
                        console.error('Error parsing SSE chunk:', e);
                      }
                    }
                  }
                });
                
                // Continue reading the stream
                return processStream();
              }).catch(err => {
                if (err.name !== 'AbortError') {
                  console.error('Stream reading error:', err);
                  onError(err);
                }
              });
            }
            
            // Start processing the stream
            return processStream();
          })
          .catch(err => {
            console.error('Fetch error:', err);
            onError(err);
          });
          
          // Return a function to abort the fetch request
          return () => {
            controller.abort();
          };
        }
      };

      // Use the custom chat service instead of the regular one
      cancelStreamRef.current = customChatService.sendMessageStreaming(
        sentMessage,
        sessionId,
        (chunk, messageId, isComplete) => {
          setMessages(prev => {
            const updatedMessages = [...prev];
            const botMessageIndex = updatedMessages.findIndex(
              msg => msg.id === tempBotMessageId ||
                     (msg.role === 'assistant' && msg.isStreaming)
            );

            if (botMessageIndex !== -1) {
              if (isComplete) {
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: typeof chunk === 'string' ? chunk : chunk?.text || '',
                  id: messageId || tempBotMessageId,
                  isStreaming: false,
                };
              } else {
                updatedMessages[botMessageIndex] = {
                  ...updatedMessages[botMessageIndex],
                  content: updatedMessages[botMessageIndex].content + (typeof chunk === 'string' ? chunk : chunk?.text || ''),
                  id: messageId || tempBotMessageId,
                };
              }
            }

            return updatedMessages;
          });

          setTimeout(scrollToBottom, 50);
        },
        (response) => {
          setIsLoading(false);
          if (response?.session_id) {
            setSessionId(response.session_id);
          }

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
                knowledge_used: response?.knowledge_used
              };
            }

            return updatedMessages;
          });

          cancelStreamRef.current = null;
        },
        (error) => {
          console.error('Error in streaming response:', error);
          setIsLoading(false);

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
        llmSettings
      );
    } catch (error) {
      console.error('Failed to send message:', error);
      setIsLoading(false);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
        id: `error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        isError: true
      }]);
    }
  };

  useEffect(() => {
    if (config?.resetSession) {
      setMessages([]);
      setSessionId(null);

      if (config.greeting) {
        setMessages([{
          role: 'assistant',
          content: config.greeting,
          id: 'welcome',
          timestamp: new Date().toISOString()
        }]);
      }
    }
  }, [config?.resetSession]);

  useEffect(() => {
    if (messages.length === 0 && config?.greeting) {
      setMessages([{
        role: 'assistant',
        content: config.greeting || 'Hello! How can I help you today?',
        id: 'welcome',
        timestamp: new Date().toISOString()
      }]);
    }
  }, []);

  return (
    <div className="flex flex-col h-full bg-white rounded-md">
      <div className="flex-1 p-4 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Send a message to start a conversation</p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatBubble 
                key={message.id} 
                message={typeof message.content === 'string' ? message.content : message.content?.text || ''}
                isUser={message.role === 'user'}
                timestamp={message.timestamp}
                primaryColor={config?.primaryColor}
                isError={message.isError}
              />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 text-gray-800 rounded-lg rounded-bl-none px-4 py-2">
                  <div className="flex space-x-1">
                    <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="bg-gray-500 rounded-full h-2 w-2 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput 
        onSendMessage={handleSendMessage} 
        disabled={isLoading}
        primaryColor={config?.primaryColor}
      />
    </div>
  );
};

ChatInterface.propTypes = {
  config: PropTypes.shape({
    primaryColor: PropTypes.string,
    chatbotName: PropTypes.string,
    greeting: PropTypes.string,
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