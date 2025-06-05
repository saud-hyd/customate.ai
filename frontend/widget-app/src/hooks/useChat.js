import { useState, useCallback, useRef } from 'react';
import widgetApi from '../services/widgetApi';

const useChat = (settings) => {
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [error, setError] = useState(null);
  
  // FIXED: Use refs to track state and prevent race conditions
  const isProcessingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  // Get credentials
  const getCredentials = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      apiKey: urlParams.get('api_key'),
      clientId: urlParams.get('client_id'),
      token: urlParams.get('token')
    };
  };

  // FIXED: Enhanced typing indicator management
  const startTyping = () => {
    console.log('🔄 Starting typing indicator...');
    setIsTyping(true);
    setError(null);
    
    // Clear any existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Safety timeout to ensure typing indicator doesn't get stuck
    typingTimeoutRef.current = setTimeout(() => {
      console.log('⏰ Typing indicator safety timeout reached');
      stopTyping();
    }, 30000); // 30 second safety timeout
  };

  const stopTyping = () => {
    console.log('🛑 Stopping typing indicator...');
    setIsTyping(false);
    isProcessingRef.current = false;
    
    // Clear timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    
    console.log('✅ Typing indicator stopped, ready for new messages');
  };

  // Send message with streaming
  const sendMessage = useCallback(async (messageText) => {
    if (!messageText.trim()) return;
    
    // FIXED: Prevent multiple simultaneous requests
    if (isProcessingRef.current) {
      console.log('⚠️ Already processing a message, ignoring new request');
      return;
    }

    console.log('🚀 Starting message send process...');
    isProcessingRef.current = true;

    // Add user message
    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: messageText,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    startTyping();

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
      let streamCompleted = false;

      // Handle streaming response
      await widgetApi.sendMessageStream(
        credentials,
        messageText,
        sessionId,
        {
          onChunk: (chunk) => {
            if (streamCompleted) return; // Ignore chunks after completion
            
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
            if (streamCompleted) return; // Prevent double completion
            streamCompleted = true;
            
            console.log('✅ Stream completed! Final content length:', completeContent?.length);
            console.log('🛑 Stopping typing indicator...');
            
            // Update final message content
            setMessages(prev => prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: completeContent || accumulatedContent }
                : msg
            ));
            
            // FIXED: Ensure typing stops after a brief delay to show completion
            setTimeout(() => {
              stopTyping();
            }, 100);
          },
          
          onError: (error) => {
            if (streamCompleted) return; // Ignore errors after completion
            streamCompleted = true;
            
            console.error('❌ Streaming error:', error);
            console.log('🛑 Stopping typing indicator due to error...');
            
            setError('Failed to get response. Please try again.');
            stopTyping();
            
            // Remove the empty assistant message on error
            setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
          }
        }
      );

      console.log(`📊 Stream process completed. Total chunks: ${chunkCount}`);
      
      // FIXED: Final safety check to ensure typing is stopped
      setTimeout(() => {
        if (isProcessingRef.current) {
          console.log('🔧 Final safety check: forcing typing indicator to stop');
          stopTyping();
        }
      }, 1000);

    } catch (error) {
      console.error('❌ Error in sendMessage:', error);
      console.log('🛑 Stopping typing indicator due to catch error...');
      
      setError('Failed to send message. Please try again.');
      stopTyping();
    }
  }, [sessionId]);

  // Reset chat
  const resetChat = useCallback(() => {
    console.log('🔄 Resetting chat...');
    
    // Stop any ongoing processes
    stopTyping();
    
    setMessages([]);
    setSessionId(null);
    setError(null);
    
    console.log('✅ Chat reset complete');
  }, []);

  // FIXED: Cleanup function to prevent memory leaks
  const cleanup = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    isProcessingRef.current = false;
  }, []);

  // FIXED: Add cleanup on unmount
  React.useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    messages,
    isTyping,
    sessionId,
    error,
    sendMessage,
    resetChat,
    cleanup
  };
};

export default useChat;