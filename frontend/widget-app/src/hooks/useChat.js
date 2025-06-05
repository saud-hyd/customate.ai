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

    console.log('🚀 Starting message send process...');

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

    console.log('✅ User message added, typing indicator started');

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
      console.log('✅ Assistant message placeholder created');

      let accumulatedContent = '';
      let chunkCount = 0;

      // Handle streaming response
      await widgetApi.sendMessageStream(
        credentials,
        messageText,
        sessionId,
        {
          onChunk: (chunk) => {
            chunkCount++;
            accumulatedContent += chunk;
            console.log(`📝 Chunk ${chunkCount} received:`, chunk.substring(0, 50) + '...');
            
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: accumulatedContent }
                : msg
            ));
          },
          onInfo: (info) => {
            console.log('📡 Info received:', info);
            if (info.session_id) {
              setSessionId(info.session_id);
            }
          },
          onComplete: (completeContent) => {
            console.log('✅ Stream completed! Final content length:', completeContent?.length);
            console.log('🛑 Setting typing to false...');
            
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: completeContent || accumulatedContent }
                : msg
            ));
            
            // CRITICAL: Stop the typing indicator
            setIsTyping(false);
            
            console.log('✅ Typing indicator stopped, chat ready for new messages');
          },
          onError: (error) => {
            console.error('❌ Streaming error:', error);
            console.log('🛑 Setting typing to false due to error...');
            
            setError('Failed to get response. Please try again.');
            setIsTyping(false);
            
            console.log('✅ Error handled, typing indicator stopped');
          }
        }
      );

      console.log(`📊 Stream process completed. Total chunks: ${chunkCount}`);

    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      console.log('🛑 Setting typing to false due to catch error...');
      
      setError('Failed to send message. Please try again.');
      setIsTyping(false);
      
      console.log('✅ Catch error handled, typing indicator stopped');
    }
  }, [sessionId]);

  // Reset chat
  const resetChat = useCallback(() => {
    console.log('🔄 Resetting chat...');
    setMessages([]);
    setSessionId(null);
    setError(null);
    setIsTyping(false);
    console.log('✅ Chat reset complete');
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