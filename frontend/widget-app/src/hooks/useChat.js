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

  // SIMPLIFIED: Send message with clean state management - FIXED VERSION
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
    setIsTyping(true); // Start typing indicator
    setError(null);

    try {
      const credentials = getCredentials();
      
      // FIXED: Prepare assistant message ID but DON'T create the message yet
      const assistantMessageId = `assistant-${Date.now()}`;
      let accumulatedContent = '';
      let assistantMessageCreated = false; // Track if message is created

      // SIMPLIFIED: Single stream handling
      await widgetApi.sendMessageStream(
        credentials,
        messageText,
        sessionId,
        {
          onChunk: (chunk) => {
            accumulatedContent += chunk;
            
            // FIXED: Create assistant message only on first chunk
            if (!assistantMessageCreated) {
              assistantMessageCreated = true;
              
              // Create assistant message with actual content
              const assistantMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: chunk,
                created_at: new Date().toISOString()
              };
              
              setMessages(prev => [...prev, assistantMessage]);
              setIsTyping(false); // Stop typing when content appears
            } else {
              // Update existing message
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: accumulatedContent }
                  : msg
              ));
            }
          },
          
          onInfo: (info) => {
            if (info.session_id) {
              setSessionId(info.session_id);
            }
          },
          
          onComplete: (finalContent) => {
            console.log('✅ Message completed');
            
            const content = finalContent || accumulatedContent;
            
            // FIXED: Handle completion without chunks (edge case)
            if (!assistantMessageCreated && content) {
              const assistantMessage = {
                id: assistantMessageId,
                role: 'assistant',
                content: content,
                created_at: new Date().toISOString()
              };
              setMessages(prev => [...prev, assistantMessage]);
            } else if (assistantMessageCreated) {
              // Update final content
              setMessages(prev => prev.map(msg => 
                msg.id === assistantMessageId 
                  ? { ...msg, content: content }
                  : msg
              ));
            }
            
            // ALWAYS stop typing on completion
            setIsTyping(false);
          },
          
          onError: (error) => {
            console.error('❌ Message error:', error);
            setError('Failed to get response. Please try again.');
            
            // FIXED: Only remove message if it was created
            if (assistantMessageCreated) {
              setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
            }
            
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