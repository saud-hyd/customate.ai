// frontend/dashboard/src/components/chat/ChatInterface.jsx
import React, { useState, useEffect, useRef } from 'react';
import { PaperAirplaneIcon, XMarkIcon, CogIcon } from '@heroicons/react/24/outline';
import { nanoid } from 'nanoid';
import chatbotService from '../../services/chatbotService';
import ChatBubble from './ChatBubble';
import TypingIndicator from './TypingIndicator';
import SuggestionChips from './SuggestionChips';

const DEFAULT_SUGGESTIONS = [
  "Tell me about your features",
  "How do I upload documents?",
  "What industries do you support?",
  "How does the knowledge base work?"
];

const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [settings, setSettings] = useState({
    primary_color: '#4f46e5',
    chatbot_name: 'AI Assistant',
    greeting_message: 'Hello! How can I help you today?',
    enable_suggestions: true,
    enable_typing_indicator: true,
    widget_position: 'bottom-right'
  });
  const [suggestions, setSuggestions] = useState(DEFAULT_SUGGESTIONS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize chat session and load settings
  useEffect(() => {
    const initChat = async () => {
      try {
        // Generate a session ID
        const newSessionId = nanoid();
        setSessionId(newSessionId);
        
        // Load chatbot settings
        const chatSettings = await chatbotService.getChatbotSettings();
        setSettings(chatSettings);
        
        // Add initial greeting message after a short delay
        setTimeout(() => {
          setMessages([
            {
              id: nanoid(),
              content: chatSettings.greeting_message || 'Hello! How can I help you today?',
              role: 'assistant',
              timestamp: new Date().toISOString()
            }
          ]);
        }, 500);
      } catch (error) {
        console.error('Error initializing chat:', error);
        // Use defaults if loading settings fails
      }
    };
    
    initChat();
  }, []);

  // Scroll to the bottom of the messages container
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    const userMessage = {
      id: nanoid(),
      content: inputValue,
      role: 'user',
      timestamp: new Date().toISOString()
    };
    
    // Update messages with user message
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input field
    setInputValue('');
    
    // Show typing indicator if enabled
    if (settings.enable_typing_indicator) {
      setIsTyping(true);
    }
    
    try {
      // Send message to the chatbot API
      const response = await chatbotService.sendMessage(userMessage.content, sessionId);
      
      // Hide typing indicator
      setIsTyping(false);
      
      // Add response to messages
      if (response && response.message) {
        const botMessage = {
          id: nanoid(),
          content: response.message.content,
          role: 'assistant',
          timestamp: response.message.created_at || new Date().toISOString()
        };
        
        setMessages(prev => [...prev, botMessage]);
        
        // Update session ID if it was created by the backend
        if (response.session_id && !sessionId) {
          setSessionId(response.session_id);
        }
      }
    } catch (error) {
      // Hide typing indicator
      setIsTyping(false);
      
      // Show error message
      setMessages(prev => [
        ...prev,
        {
          id: nanoid(),
          content: "I'm sorry, I encountered an error while processing your request. Please try again later.",
          role: 'assistant',
          timestamp: new Date().toISOString()
        }
      ]);
      
      console.error('Error sending message:', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    // Auto-send the suggestion after a short delay
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow-lg overflow-hidden">
      {/* Chat header */}
      <div 
        className="flex justify-between items-center px-4 py-3"
        style={{ backgroundColor: settings.primary_color }}
      >
        <h3 className="text-lg font-medium text-white">{settings.chatbot_name}</h3>
        <div className="flex space-x-2">
          <button 
            onClick={() => setSettingsOpen(!settingsOpen)}
            className="text-white hover:text-gray-200"
          >
            <CogIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
      
      {/* Settings panel */}
      {settingsOpen && (
        <div className="bg-gray-50 p-4 border-b">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Chat Settings</h4>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Primary Color</label>
              <div className="flex items-center">
                <input
                  type="color"
                  value={settings.primary_color}
                  onChange={(e) => handleSettingsChange('primary_color', e.target.value)}
                  className="h-8 w-8 rounded border"
                />
                <input
                  type="text"
                  value={settings.primary_color}
                  onChange={(e) => handleSettingsChange('primary_color', e.target.value)}
                  className="ml-2 border rounded p-1 text-sm w-24"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Chatbot Name</label>
              <input
                type="text"
                value={settings.chatbot_name}
                onChange={(e) => handleSettingsChange('chatbot_name', e.target.value)}
                className="border rounded p-1 text-sm w-full"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Greeting Message</label>
              <input
                type="text"
                value={settings.greeting_message}
                onChange={(e) => handleSettingsChange('greeting_message', e.target.value)}
                className="border rounded p-1 text-sm w-full"
              />
            </div>
            
            <div className="flex space-x-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableTyping"
                  checked={settings.enable_typing_indicator}
                  onChange={(e) => handleSettingsChange('enable_typing_indicator', e.target.checked)}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="enableTyping" className="ml-2 text-xs text-gray-700">
                  Typing Indicator
                </label>
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enableSuggestions"
                  checked={settings.enable_suggestions}
                  onChange={(e) => handleSettingsChange('enable_suggestions', e.target.checked)}
                  className="h-4 w-4 text-primary-600 rounded"
                />
                <label htmlFor="enableSuggestions" className="ml-2 text-xs text-gray-700">
                  Suggestions
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end mt-4">
            <button
              onClick={() => setSettingsOpen(false)}
              className="text-xs font-medium text-primary-600 hover:text-primary-800"
            >
              Close Settings
            </button>
          </div>
        </div>
      )}
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto p-4">
        {messages.map((message) => (
          <ChatBubble
            key={message.id}
            message={message.content}
            isUser={message.role === 'user'}
            timestamp={message.timestamp}
          />
        ))}
        
        {isTyping && <TypingIndicator />}
        
        {/* Invisible element to scroll to */}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestions */}
      {settings.enable_suggestions && messages.length === 1 && (
        <div className="px-4">
          <SuggestionChips 
            suggestions={suggestions} 
            onSuggestionClick={handleSuggestionClick}
            primaryColor={settings.primary_color}
          />
        </div>
      )}
      
      {/* Input area */}
      <div className="border-t p-4">
        <div className="flex items-center">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 resize-none border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 p-2 text-sm"
            placeholder="Type your message..."
            rows={1}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim()}
            className="ml-2 p-2 rounded-full bg-primary-600 text-white disabled:opacity-50"
            style={{ backgroundColor: settings.primary_color }}
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
        <div className="text-xs text-gray-500 mt-2 text-center">
          This is a test chatbot interfacing with your backend API
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;