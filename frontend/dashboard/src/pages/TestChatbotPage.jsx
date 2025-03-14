// frontend/dashboard/src/pages/TestChatbotPage.jsx
import React, { useState, useEffect, useRef } from 'react';
import chatService from '../services/chatService';
import knowledgeService from '../services/knowledgeService';
import { 
  PlusIcon, 
  InformationCircleIcon, 
  DocumentTextIcon, 
  ChevronDownIcon 
} from '@heroicons/react/24/outline';

const TestChatbotPage = () => {
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
  
  // Fetch collections on component mount
  useEffect(() => {
    fetchCollections();
  }, []);
  
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
    setInputValue('');
    setIsTyping(true);
    
    try {
      // Make API call to chatbot service
      const response = await chatService.sendMessage(sessionId, inputValue, selectedCollection?.collection_id);
      
      // Update session ID if it's a new conversation
      if (!sessionId && response.session_id) {
        setSessionId(response.session_id);
      }
      
      // Add bot response
      const botMessage = {
        role: 'bot',
        content: response.message.content,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        knowledgeUsed: response.knowledge_used || false
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      console.error('Error sending message:', err);
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'bot',
        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true
      }]);
    } finally {
      setIsTyping(false);
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

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Your Chatbot</h2>
        <div className="flex space-x-3">
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
            className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
          >
            <i className="fas fa-redo-alt mr-2"></i> Reset Chat
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-indigo-600 text-white rounded-t-lg flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold mr-3">
                  AI
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Customate.AI Assistant</h3>
                  <p className="text-xs text-indigo-200">
                    {sessionId ? `Session: ${sessionId.substring(0, 8)}...` : 'New Conversation'}
                  </p>
                </div>
              </div>
              
              {selectedCollection && (
                <div className="bg-indigo-700 text-white text-xs px-3 py-1 rounded-full">
                  Using: {selectedCollection.name}
                </div>
              )}
            </div>
            
            {/* Chat Messages */}
            <div className="p-4 h-96 overflow-y-auto flex flex-col space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex justify-${msg.role === 'user' ? 'end' : 'start'}`}>
                  <div className={`max-w-3/4 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                      : msg.isError
                        ? 'bg-red-100 text-red-800 rounded-tr-lg rounded-tl-lg rounded-br-lg'
                        : 'bg-gray-100 text-gray-800 rounded-tr-lg rounded-tl-lg rounded-br-lg'
                  } p-3 text-sm`}>
                    <p>{msg.content}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-xs opacity-70">{msg.timestamp}</p>
                      
                      {/* Knowledge badge */}
                      {msg.role === 'bot' && msg.knowledgeUsed && (
                        <span className="bg-green-600 text-white text-xs px-2 py-0.5 rounded-full">
                          Knowledge Used
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className="flex justify-start">
                  <div className="max-w-3/4 bg-gray-100 text-gray-800 rounded-tr-lg rounded-tl-lg rounded-br-lg p-3">
                    <div className="flex space-x-2">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Chat Input */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isTyping}
                  className="bg-indigo-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center disabled:opacity-50"
                >
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
              
              <div className="flex flex-wrap mt-3">
                <button 
                  className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm mr-2 mb-2 hover:bg-gray-200"
                  onClick={() => handleSuggestedQuestion("What can you tell me about your product features?")}
                >
                  Tell me about your product features
                </button>
                <button 
                  className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm mr-2 mb-2 hover:bg-gray-200"
                  onClick={() => handleSuggestedQuestion("Explain your pricing tiers")}
                >
                  Explain your pricing tiers
                </button>
                <button 
                  className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm mr-2 mb-2 hover:bg-gray-200"
                  onClick={() => handleSuggestedQuestion("How does knowledge integration work?")}
                >
                  How does knowledge integration work?
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Testing Information</h3>
            
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
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Available Collections</h4>
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
                            className="text-xs text-indigo-600 hover:text-indigo-800"
                          >
                            Use
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
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestChatbotPage;