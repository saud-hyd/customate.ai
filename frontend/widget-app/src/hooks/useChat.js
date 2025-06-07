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

  // SIMPLIFIED: Send message with clean state management
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim() || isTyping) {
      return;
    }

    console.log('📤 Sending message:', messageText);

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsTyping(true); // Start typing
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

      // SIMPLIFIED: Single stream handling
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
          
          onComplete: (finalContent) => {
            console.log('✅ Message completed');
            
            // Update final content
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: finalContent || accumulatedContent }
                : msg
            ));
            
            // ALWAYS stop typing on completion
            setIsTyping(false);
          },
          
          onError: (error) => {
            console.error('❌ Message error:', error);
            setError('Failed to get response. Please try again.');
            
            // Remove empty assistant message on error
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            
            // ALWAYS stop typing on error
            setIsTyping(false);
          }
        }
      );

    } catch (error) {
      console.error('❌ Send message error:', error);
      setError('Failed to send message. Please try again.');
      setIsTyping(false); // ALWAYS stop typing on catch
    }
  }, [sessionId, isTyping]);

  // Reset chat
  const resetChat = useCallback(() => {
    console.log('🔄 Resetting chat...');
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsTyping(false); // Ensure typing is stopped
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