import { useState, useCallback } from 'react';
import widgetApi from '../services/widgetApi';

const useChat = (settings) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);

  // Get credentials
  const getCredentials = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      apiKey: urlParams.get('api_key'),
      clientId: urlParams.get('client_id'),
      token: urlParams.get('token')
    };
  };

  // Send message with streaming
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true);
    setError(null);

    try {
      const credentials = getCredentials();
      
      // Create assistant message placeholder
      const assistantMessageId = `assistant-${Date.now()}`;
      const assistantMessage = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

      let accumulatedContent = '';

      // Handle streaming response
      await widgetApi.sendMessageStream(
        credentials,
        messageText,
        sessionId,
        {
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedContent }
                : msg
            ));
          },
          onInfo: (info) => {
            if (info.session_id) {
              setSessionId(info.session_id);
            }
          },
          onComplete: (completeContent) => {
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: completeContent }
                : msg
            ));
            setIsTyping(false);
          },
          onError: (error) => {
            console.error('Streaming error:', error);
            setError('Failed to get response. Please try again.');
            setIsTyping(false);
          }
        }
      );

    } catch (error) {
      console.error('Error sending message:', error);
      setError('Failed to send message. Please try again.');
      setIsTyping(false);
    }
  }, [sessionId]);

  // Reset chat
  const resetChat = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsTyping(false);
  }, []);

  return {
    messages,
    isTyping,
    sessionId,
    error,
    sendMessage,
    resetChat
  };
};

export default useChat;