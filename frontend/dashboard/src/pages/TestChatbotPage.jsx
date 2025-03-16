// frontend/dashboard/src/pages/TestChatbotPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import chatService from '../services/chatService';
import knowledgeService from '../services/knowledgeService';
import { 
  SwatchIcon, 
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const TestChatbotPage = () => {
  // Chat state - keeping existing backend functionality
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: "Hi there! I'm your Customate.AI assistant. How can I help you today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      knowledgeUsed: false
    }
  ]);
  const [sessionId, setSessionId] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const messagesEndRef = useRef(null);
  
  // New UI state
  const [activeSettingsTab, setActiveSettingsTab] = useState('appearance');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatSettings, setChatSettings] = useState({
    primaryColor: '#4f46e5',
    chatbotName: 'Customate.AI Assistant',
    widgetPosition: 'bottom-right',
    showTypingIndicator: true,
    enableSuggestions: true
  });
  
  // Fetch collections on component mount
  useEffect(() => {
    fetchCollections();
  }, []);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const fetchCollections = async () => {
    try {
      const data = await knowledgeService.getCollections();
      setCollections(data);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load knowledge collections');
    }
  };
  
// Update the handleSendMessage function to use streaming
  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    
    // Add user message
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const userMessage = {
      role: 'user',
      content: inputValue,
      timestamp: timeString
    };
    
    setMessages(prev => [...prev, userMessage]);
    
    // Create a placeholder for bot's streaming response
    const botPlaceholder = {
      role: 'bot',
      content: '',
      timestamp: timeString,
      isStreaming: true
    };
    
    setMessages(prev => [...prev, botPlaceholder]);
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Use streaming API instead of regular sendMessage
      let fullContent = '';
      const messageToSend = inputValue; // Capture the input value before reset
      
      // Create and begin the stream
      chatService.sendMessageStreaming(
        messageToSend,
        sessionId,
        // On chunk
        (chunk) => {
          fullContent += chunk;
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            
            if (lastIndex >= 0 && updated[lastIndex].role === 'bot' && updated[lastIndex].isStreaming) {
              updated[lastIndex] = {
                ...updated[lastIndex],
                content: fullContent
              };
            }
            
            return updated;
          });
        },
        // On done
        (response) => {
          setIsTyping(false);
          
          // Update session ID if it's a new conversation
          if (!sessionId && response.session_id) {
            setSessionId(response.session_id);
          }
          
          // Finalize the message
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            
            if (lastIndex >= 0 && updated[lastIndex].role === 'bot' && updated[lastIndex].isStreaming) {
              updated[lastIndex] = {
                role: 'bot',
                content: fullContent,
                timestamp: timeString,
                knowledgeUsed: response.knowledge_used || false,
                isStreaming: false
              };
            }
            
            return updated;
          });
        },
        // On error
        (err) => {
          console.error('Error streaming message:', err);
          setIsTyping(false);
          
          // Add error message
          setMessages(prev => {
            const updated = [...prev];
            const lastIndex = updated.length - 1;
            
            if (lastIndex >= 0 && updated[lastIndex].role === 'bot' && updated[lastIndex].isStreaming) {
              updated[lastIndex] = {
                role: 'bot',
                content: "I'm sorry, I encountered an error while processing your request. Please try again.",
                timestamp: timeString,
                isError: true,
                isStreaming: false
              };
            }
            
            return updated;
          });
        }
      );
    } catch (err) {
      console.error('Error sending message:', err);
      setIsTyping(false);
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      }]);
    }
  };
    
    const handleKeyPress = (e) => {
      if (e.key === 'Enter') {
        handleSendMessage();
      }
    };
    
    const handleResetChat = () => {
      setSessionId('');
      setMessages([
        {
          role: 'bot',
          content: "Hi there! I'm your Customate.AI assistant. How can I help you today?",
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          knowledgeUsed: false
        }
      ]);
    };
  
  const handleSuggestedQuestion = (question) => {
    setInputValue(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };
  
  const handleSelectCollection = (collection) => {
    setSelectedCollection(collection);
    setShowCollectionDropdown(false);
  };
  
  // New function to handle settings changes
  const handleSettingChange = (setting, value) => {
    setChatSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };

  // Get position style based on widget position setting
  const getPositionStyle = () => {
    switch(chatSettings.widgetPosition) {
      case 'bottom-right':
        return { bottom: '20px', right: '20px' };
      case 'bottom-left':
        return { bottom: '20px', left: '20px' };
      case 'top-right':
        return { top: '20px', right: '20px' };
      case 'top-left':
        return { top: '20px', left: '20px' };
      default:
        return { bottom: '20px', right: '20px' };
    }
  };

  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Your Chatbot</h2>
        <div className="flex space-x-3">
          {/* Collection selector dropdown from the original */}
          <div className="relative">
            <button 
              onClick={() => setShowCollectionDropdown(!showCollectionDropdown)}
              className="flex items-center bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
            >
              <DocumentTextIcon className="h-5 w-5 mr-2" />
              {selectedCollection ? selectedCollection.name : 'Select Knowledge Collection'}
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>
            
            {showCollectionDropdown && (
              <div className="absolute right-0 z-10 mt-2 w-64 bg-white rounded-md shadow-lg">
                <div className="py-1">
                  <button
                    onClick={() => handleSelectCollection(null)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    No specific collection (use all)
                  </button>
                  
                  {collections.map(collection => (
                    <button
                      key={collection.collection_id}
                      onClick={() => handleSelectCollection(collection)}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      {collection.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          <button 
            onClick={handleResetChat}
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Reset Chat
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings panel - Left side */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveSettingsTab('appearance')}
                className={`${
                  activeSettingsTab === 'appearance'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <SwatchIcon className="h-5 w-5 mr-2" />
                Appearance
              </button>
              <button
                onClick={() => setActiveSettingsTab('behavior')}
                className={`${
                  activeSettingsTab === 'behavior'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                Behavior
              </button>
              <button
                onClick={() => setActiveSettingsTab('info')}
                className={`${
                  activeSettingsTab === 'info'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <InformationCircleIcon className="h-5 w-5 mr-2" />
                Info
              </button>
            </nav>
          </div>
          
          <div className="mt-6">
            {/* Appearance settings */}
            {activeSettingsTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center">
                    <input
                      type="color"
                      id="primaryColor"
                      value={chatSettings.primaryColor}
                      onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                      className="h-10 w-10 rounded-md border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={chatSettings.primaryColor}
                      onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                      className="ml-2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-32"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="chatbotName" className="block text-sm font-medium text-gray-700 mb-1">
                    Chatbot Name
                  </label>
                  <input
                    type="text"
                    id="chatbotName"
                    value={chatSettings.chatbotName}
                    onChange={(e) => handleSettingChange('chatbotName', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full max-w-md"
                  />
                </div>
                
                <div>
                  <label htmlFor="widgetPosition" className="block text-sm font-medium text-gray-700 mb-1">
                    Widget Position
                  </label>
                  <select
                    id="widgetPosition"
                    value={chatSettings.widgetPosition}
                    onChange={(e) => handleSettingChange('widgetPosition', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full max-w-xs"
                  >
                    <option value="bottom-right">Bottom Right</option>
                    <option value="bottom-left">Bottom Left</option>
                    <option value="top-right">Top Right</option>
                    <option value="top-left">Top Left</option>
                  </select>
                </div>
              </div>
            )}
            
            {/* Behavior settings */}
            {activeSettingsTab === 'behavior' && (
              <div className="space-y-6">
                <div className="flex items-center">
                  <input
                    id="showTypingIndicator"
                    type="checkbox"
                    checked={chatSettings.showTypingIndicator}
                    onChange={(e) => handleSettingChange('showTypingIndicator', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="showTypingIndicator" className="ml-2 block text-sm text-gray-900">
                    Show typing indicator
                  </label>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="enableSuggestions"
                    type="checkbox"
                    checked={chatSettings.enableSuggestions}
                    onChange={(e) => handleSettingChange('enableSuggestions', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <label htmlFor="enableSuggestions" className="ml-2 block text-sm text-gray-900">
                    Enable suggested responses
                  </label>
                </div>

                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Knowledge Collections</h4>
                  {collections.length === 0 ? (
                    <p className="text-sm text-gray-500">No collections available</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-gray-200">
                      {collections.map(collection => (
                        <li key={collection.collection_id} className="py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{collection.name}</span>
                            <button
                              onClick={() => handleSelectCollection(collection)}
                              className={`text-xs px-2 py-1 rounded ${
                                selectedCollection?.collection_id === collection.collection_id
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'text-indigo-600 hover:text-indigo-800'
                              }`}
                            >
                              {selectedCollection?.collection_id === collection.collection_id ? 'Active' : 'Use'}
                            </button>
                          </div>
                          <p className="text-xs text-gray-500">
                            {collection.description || `Type: ${collection.type}`}
                          </p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
            
            {/* Info tab */}
            {activeSettingsTab === 'info' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Testing Tips</h4>
                  <div className="rounded-md bg-blue-50 p-4">
                    <div className="flex">
                      <div className="text-blue-400 flex-shrink-0">
                        <InformationCircleIcon className="h-5 w-5" />
                      </div>
                      <div className="ml-3">
                        <p className="text-sm text-blue-700">
                          Ask questions related to your uploaded documents to see if the chatbot can use that knowledge in responses.
                        </p>
                        <p className="text-sm text-blue-700 mt-1">
                          Watch for the <span className="bg-green-600 text-white px-1 rounded">Knowledge Used</span> badge to confirm knowledge retrieval.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Session Information</h4>
                  <div className="mt-2 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Session ID:</span>
                      <span className="text-sm font-mono">{sessionId || 'Not started'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Knowledge Source:</span>
                      <span className="text-sm">{selectedCollection ? selectedCollection.name : 'All collections'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Messages:</span>
                      <span className="text-sm">{messages.length}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Installation Code</h3>
                  <pre className="bg-gray-100 p-3 text-xs text-gray-800 rounded overflow-x-auto">
{`<script>
  (function(c,u,s,t,o,m,a,t,e){
    c['CustomateWidget']=o;
    c[o]=c[o]||function(){(c[o].q=c[o].q||[]).push(arguments)};
    c[o].l=1*new Date();a=u.createElement(s);
    t=u.getElementsByTagName(s)[0];a.async=1;a.src=t;
    t.parentNode.insertBefore(a,t)
  })(window,document,'script','https://cdn.customate.ai/widget.js','cw');
  
  cw('init', 'YOUR_API_KEY_HERE');
</script>`}
                  </pre>
                  <button className="mt-2 text-sm text-indigo-600 hover:text-indigo-500">
                    Copy to clipboard
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Chatbot Preview - Right side */}
        <div className="lg:col-span-1 relative">
          {/* Mock webpage background */}
          <div className="w-full h-[600px] bg-gray-100 rounded-lg shadow overflow-hidden relative">
            {/* Mock header */}
            <div className="h-10 bg-gray-200 border-b border-gray-300 flex items-center px-4">
              <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
            </div>
            
            {/* Mock content */}
            <div className="p-4">
              <div className="h-6 bg-gray-200 w-3/4 rounded mb-4"></div>
              <div className="h-4 bg-gray-200 w-full rounded mb-2"></div>
              <div className="h-4 bg-gray-200 w-5/6 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 w-4/5 rounded mb-6"></div>
              
              <div className="h-40 bg-gray-200 w-full rounded mb-6"></div>
              
              <div className="h-4 bg-gray-200 w-2/3 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 w-3/4 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 w-1/2 rounded mb-6"></div>
              
              <div className="flex space-x-4">
                <div className="h-20 bg-gray-200 w-1/3 rounded"></div>
                <div className="h-20 bg-gray-200 w-1/3 rounded"></div>
                <div className="h-20 bg-gray-200 w-1/3 rounded"></div>
              </div>
            </div>
            
            {/* Chatbot widget button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="absolute w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white"
              style={{
                backgroundColor: chatSettings.primaryColor,
                ...getPositionStyle()
              }}
            >
              {isChatOpen ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                </svg>
              )}
            </button>
            
            {/* Chatbot window */}
            {isChatOpen && (
              <div 
                className="absolute w-[320px] bg-white rounded-lg shadow-xl flex flex-col"
                style={{
                  height: '450px',
                  ...getPositionStyle(),
                  top: chatSettings.widgetPosition.startsWith('top') ? '70px' : 'auto',
                  bottom: chatSettings.widgetPosition.startsWith('bottom') ? '70px' : 'auto'
                }}
              >
                {/* Chat header */}
                <div 
                  className="px-4 py-3 rounded-t-lg flex items-center"
                  style={{ backgroundColor: chatSettings.primaryColor }}
                >
                  <div className="bg-white rounded-full w-8 h-8 flex items-center justify-center mr-2">
                    <span style={{ color: chatSettings.primaryColor }}>AI</span>
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{chatSettings.chatbotName}</p>
                    <p className="text-white opacity-75 text-xs">
                      {sessionId ? `Session: ${sessionId.substring(0, 8)}...` : 'New Conversation'}
                    </p>
                  </div>
                  {selectedCollection && (
                    <div className="ml-auto bg-white bg-opacity-20 text-white text-xs px-2 py-0.5 rounded-full">
                      {selectedCollection.name}
                    </div>
                  )}
                  <button 
                    className="ml-2 text-white opacity-80 hover:opacity-100"
                    onClick={() => setIsChatOpen(false)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {/* Chat messages */}
                <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
                    >
                      <div 
                        className={`max-w-[75%] p-3 rounded-lg ${
                          msg.role === 'user' 
                            ? 'rounded-br-none text-white ml-auto' 
                            : msg.isError
                              ? 'rounded-bl-none bg-red-100 text-red-800'
                              : 'rounded-bl-none bg-gray-200 text-gray-800'
                        }`}
                        style={msg.role === 'user' ? { backgroundColor: chatSettings.primaryColor } : {}}
                      >
                        <p className="text-sm">{msg.content}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs opacity-75">{msg.timestamp}</p>
                          
                          {/* Knowledge badge */}
                          {msg.role === 'bot' && msg.knowledgeUsed && (
                            <span className="bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full ml-2">
                              KB
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {isTyping && chatSettings.showTypingIndicator && (
                    <div className="flex justify-start mb-3">
                      <div className="bg-gray-200 p-3 rounded-lg rounded-bl-none text-gray-800">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
                
                {/* Chat input area */}
                <div className="p-3 border-t border-gray-200">
                  {chatSettings.enableSuggestions && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      <button
                        onClick={() => handleSuggestedQuestion("What can you tell me about your product features?")}
                        className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs hover:bg-gray-200"
                      >
                        Product features
                      </button>
                      <button
                        onClick={() => handleSuggestedQuestion("Explain your pricing tiers")}
                        className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs hover:bg-gray-200"
                      >
                        Pricing tiers
                      </button>
                      <button
                        onClick={() => handleSuggestedQuestion("How does knowledge integration work?")}
                        className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs hover:bg-gray-200"
                      >
                        Knowledge integration
                      </button>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message..."
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                      disabled={isTyping}
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputValue.trim() || isTyping}
                      className="text-white p-2 rounded-full w-9 h-9 flex items-center justify-center disabled:opacity-50"
                      style={{ backgroundColor: chatSettings.primaryColor }}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                      </svg>
                    </button>
                  </div>
                  
                  <div className="text-center mt-2">
                    <span className="text-xs text-gray-500">Powered by Customate.AI</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestChatbotPage;