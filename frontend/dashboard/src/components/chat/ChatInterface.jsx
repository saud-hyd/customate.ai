// Path: frontend/dashboard/src/components/chat/ChatInterface.jsx
// Usage: Enhanced chat interface with voice mode support for testing
// MODIFICATION: Add voice interaction capability to existing text chat

import React, { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { 
  MicrophoneIcon, 
  ChatBubbleLeftRightIcon,
  SpeakerWaveIcon,
  StopIcon
} from '@heroicons/react/24/outline'; // NEW IMPORTS
import ChatBubble from './ChatBubble';
import ChatInput from './ChatInput';
import VoiceRecorder from '../testing/VoiceRecorder'; // NEW IMPORT
import VoicePlayback from '../testing/VoicePlayback'; // NEW IMPORT
import chatService from '../../services/chatService';
import voiceService from '../../services/voiceService'; // NEW IMPORT
import TypingIndicator from './TypingIndicator';

const ChatInterface = ({ 
  config, 
  testMode = false, // NEW PROP
  voiceMode = false, // NEW PROP
  onModeChange, // NEW PROP
  onSendMessage // NEW PROP for test mode
}) => {
  // EXISTING STATE
  const [messages, setMessages] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const cancelStreamRef = useRef(null);

  // NEW STATE FOR VOICE INTEGRATION
  const [isVoiceMode, setIsVoiceMode] = useState(voiceMode);
  const [isRecording, setIsRecording] = useState(false);
  const [audioResponses, setAudioResponses] = useState(new Map()); // Store audio URLs by message ID

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  // NEW: Sync voice mode with prop
  useEffect(() => {
    setIsVoiceMode(voiceMode);
  }, [voiceMode]);

  // Initialize with greeting message (EXISTING)
  useEffect(() => {
    if (messages.length === 0) {
      const greeting = config?.greeting || "Hello! 👋 How can I help you today?";
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString(),
          type: 'text'
        }
      ]);
    }
  }, []);

  // Handle session reset if config changes (EXISTING)
  useEffect(() => {
    if (config?.resetSession) {
      setMessages([]);
      setSessionId(null);
      setAudioResponses(new Map());
      
      // Re-add greeting after reset
      const greeting = config?.greeting || "Hello! 👋 How can I help you today?";
      setMessages([
        {
          id: 'greeting',
          role: 'assistant',
          content: greeting,
          timestamp: new Date().toISOString(),
          type: 'text'
        }
      ]);
    }
  }, [config?.resetSession]);

  // NEW: Toggle between voice and text mode
  const handleModeToggle = () => {
    const newMode = !isVoiceMode;
    setIsVoiceMode(newMode);
    if (onModeChange) {
      onModeChange(newMode ? 'voice' : 'text');
    }
  };

  // EXISTING: Handle text message (enhanced for voice mode)
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;
    
    // Add user message to state
    const userMessageId = `user-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: text.trim(),
      timestamp: new Date().toISOString(),
      type: 'text'
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    // Show loading/typing indicator
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Cancel any ongoing stream
      if (cancelStreamRef.current) {
        cancelStreamRef.current();
        cancelStreamRef.current = null;
      }

      const botMessageId = `bot-${Date.now()}`;
      let hasStartedStreaming = false;

      // Set up LLM settings if provided
      const llmSettings = config?.llmProvider ? {
        provider: config.llmProvider,
        model: config.llmModel,
        temperature: config.temperature,
        maxTokens: config.maxTokens
      } : {};

      // For test mode, use callback instead of direct service call
      if (testMode && onSendMessage) {
        await onSendMessage(text);
        return;
      }

      // Enhanced: Support voice response generation
      const messageData = {
        message: text,
        session_id: sessionId,
        config: {
          ...config,
          ...llmSettings,
          // NEW: Request voice response if in voice mode
          generate_voice: isVoiceMode,
          voice_settings: isVoiceMode ? {
            voice: config?.voice || 'alloy',
            speed: config?.voiceSpeed || 1.0
          } : undefined
        }
      };

      const response = await chatService.sendMessage(messageData);
      
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }

      // Add bot response
      const botMessage = {
        id: botMessageId,
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toISOString(),
        type: 'text',
        // NEW: Include voice response URL if available
        voiceUrl: response.voice_response_url || null
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);

      // NEW: Store audio URL for playback
      if (response.voice_response_url) {
        setAudioResponses(prev => new Map(prev.set(botMessageId, response.voice_response_url)));
      }

    } catch (err) {
      console.error('Failed to send message:', err);
      
      // Add error message
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString(),
        type: 'error'
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  // NEW: Handle voice recording completion
  const handleVoiceRecordingComplete = async (audioBlob, transcript) => {
    setIsRecording(false);
    
    // Add user voice message
    const userMessageId = `user-voice-${Date.now()}`;
    const userMessage = {
      id: userMessageId,
      role: 'user',
      content: transcript || 'Voice message',
      timestamp: new Date().toISOString(),
      type: 'voice',
      audioBlob: audioBlob
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    setIsLoading(true);
    setIsTyping(true);
    
    try {
      // Process voice interaction
      const response = await voiceService.processVoiceInteraction(audioBlob, config);
      
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }

      // Add bot response with voice
      const botMessageId = `bot-voice-${Date.now()}`;
      const botMessage = {
        id: botMessageId,
        role: 'assistant',
        content: response.response_text,
        timestamp: new Date().toISOString(),
        type: 'voice',
        voiceUrl: response.response_audio_url
      };

      setMessages(prevMessages => [...prevMessages, botMessage]);

      // Store audio URL
      if (response.response_audio_url) {
        setAudioResponses(prev => new Map(prev.set(botMessageId, response.response_audio_url)));
      }

    } catch (err) {
      console.error('Voice interaction failed:', err);
      
      const errorMessage = {
        id: `error-voice-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I had trouble processing your voice message. Please try again.',
        timestamp: new Date().toISOString(),
        type: 'error'
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg border border-gray-200">
      {/* NEW: Mode Toggle Header (only in test mode) */}
      {testMode && (
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-700">Test Mode:</span>
            <div className="flex items-center space-x-1">
              {isVoiceMode ? (
                <MicrophoneIcon className="w-4 h-4 text-green-600" />
              ) : (
                <ChatBubbleLeftRightIcon className="w-4 h-4 text-blue-600" />
              )}
              <span className="text-sm text-gray-600 capitalize">
                {isVoiceMode ? 'Voice' : 'Text'}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleModeToggle}
            className={`
              px-3 py-1 text-xs font-medium rounded-full transition-colors
              ${isVoiceMode 
                ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }
            `}
          >
            Switch to {isVoiceMode ? 'Text' : 'Voice'}
          </button>
        </div>
      )}

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id}>
            {/* ENHANCED: Chat bubble with voice support */}
            <ChatBubble
              message={message}
              isOwn={message.role === 'user'}
            />
            
            {/* NEW: Voice playback for assistant messages with audio */}
            {message.role === 'assistant' && message.voiceUrl && (
              <div className="mt-2 ml-12">
                <VoicePlayback 
                  audioUrl={message.voiceUrl}
                  showDuration={false}
                  className="max-w-sm"
                />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg p-3 max-w-xs">
              <TypingIndicator />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        {isVoiceMode ? (
          /* NEW: Voice Input Interface */
          <div className="space-y-4">
            <VoiceRecorder
              onRecordingComplete={handleVoiceRecordingComplete}
              isDisabled={isLoading}
              autoTranscribe={true}
              maxDuration={180} // 3 minutes for chat
            />
            
            {/* Voice mode indicator */}
            <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
              <MicrophoneIcon className="w-4 h-4" />
              <span>Voice mode active - Click microphone to record</span>
            </div>
          </div>
        ) : (
          /* EXISTING: Text Input */
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isLoading}
            placeholder="Type your message..."
          />
        )}
      </div>

      {/* NEW: Voice Mode Status Bar */}
      {isVoiceMode && (
        <div className="bg-green-50 border-t border-green-200 px-4 py-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center space-x-2 text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Voice AI enabled</span>
            </div>
            
            <div className="text-green-600 text-xs">
              OpenAI Whisper + TTS
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

ChatInterface.propTypes = {
  config: PropTypes.object,
  testMode: PropTypes.bool,
  voiceMode: PropTypes.bool,
  onModeChange: PropTypes.func,
  onSendMessage: PropTypes.func
};

export default ChatInterface;