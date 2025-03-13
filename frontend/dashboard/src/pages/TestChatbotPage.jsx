import React, { useState, useEffect, useRef } from 'react';

const TestChatbotPage = () => {
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      content: "Hi there! I'm your Customate.AI assistant. How can I help you today?",
      timestamp: '10:30 AM'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  
  const handleSendMessage = () => {
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
    
    // Simulate bot response after a delay
    setTimeout(() => {
      const botResponse = simulateResponse(inputValue);
      const botMessage = {
        role: 'bot',
        content: botResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // Random delay between 1-2 seconds
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };
  
  const simulateResponse = (message) => {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('pricing') || lowerMessage.includes('cost')) {
      return "Customate.AI offers several pricing tiers starting at $49/month for our Basic plan, $149/month for Professional, and custom pricing for Enterprise tiers. Each plan includes different features and usage limits. Would you like me to explain each plan in more detail?";
    }
    
    if (lowerMessage.includes('integrate') || lowerMessage.includes('website')) {
      return "Integration is simple! You can add our chatbot to your website by adding a small JavaScript snippet to your site's header or footer. Go to Settings > Deployment to get your unique code snippet. Would you like me to guide you through the process?";
    }
    
    if (lowerMessage.includes('free') || lowerMessage.includes('trial')) {
      return "Yes, we offer a 14-day free trial with full access to all features of the Professional plan. No credit card is required to start the trial. You can sign up on our website and get started right away.";
    }
    
    // Generic responses
    const genericResponses = [
      "That's a great question! Our team is continuously working on improving our platform's capabilities in that area.",
      "Thanks for your question. Would you like me to connect you with a team member who specializes in that topic?",
      "I understand you're asking about that feature. It's available in our Professional and Enterprise plans.",
      "I'd be happy to help you with that. Could you provide a bit more information about your specific use case?"
    ];
    
    return genericResponses[Math.floor(Math.random() * genericResponses.length)];
  };
  
  const handleResetChat = () => {
    setMessages([
      {
        role: 'bot',
        content: "Hi there! I'm your Customate.AI assistant. How can I help you today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]);
  };
  
  const handleSuggestedQuestion = (question) => {
    setInputValue(question);
    setTimeout(() => {
      handleSendMessage();
    }, 100);
  };

  return (
    <section className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Your Chatbot</h2>
        <button 
          onClick={handleResetChat}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-50"
        >
          <i className="fas fa-redo-alt mr-2"></i> Reset Chat
        </button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow">
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 bg-indigo-600 text-white rounded-t-lg flex items-center">
              <div className="w-10 h-10 rounded-full bg-white text-indigo-600 flex items-center justify-center font-bold mr-3">
                AI
              </div>
              <div>
                <h3 className="text-lg font-semibold">Customate.AI Assistant</h3>
                <p className="text-xs text-indigo-200">Online</p>
              </div>
            </div>
            
            {/* Chat Messages */}
            <div className="p-4 h-96 overflow-y-auto flex flex-col space-y-4">
              {messages.map((msg, index) => (
                <div key={index} className={`flex justify-${msg.role === 'user' ? 'end' : 'start'}`}>
                  <div className={`max-w-3/4 ${
                    msg.role === 'user' 
                      ? 'bg-indigo-600 text-white rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                      : 'bg-gray-100 text-gray-800 rounded-tr-lg rounded-tl-lg rounded-br-lg'
                  } p-3 text-sm`}>
                    <p>{msg.content}</p>
                    <p className="text-xs mt-1 opacity-70 text-right">{msg.timestamp}</p>
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
                  onClick={() => handleSuggestedQuestion("How much does it cost?")}
                >
                  How much does it cost?
                </button>
                <button 
                  className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm mr-2 mb-2 hover:bg-gray-200"
                  onClick={() => handleSuggestedQuestion("How do I integrate with my website?")}
                >
                  How do I integrate with my website?
                </button>
                <button 
                  className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-sm mr-2 mb-2 hover:bg-gray-200"
                  onClick={() => handleSuggestedQuestion("Do you offer a free trial?")}
                >
                  Do you offer a free trial?
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Testing Information</h3>
            
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Environment</h4>
                <div className="mt-2">
                  <div className="flex items-center">
                    <input id="env-prod" name="environment" type="radio" className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                    <label htmlFor="env-prod" className="ml-3 block text-sm text-gray-700">
                      Production
                    </label>
                  </div>
                  <div className="flex items-center mt-2">
                    <input id="env-staging" name="environment" type="radio" checked className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500" />
                    <label htmlFor="env-staging" className="ml-3 block text-sm text-gray-700">
                      Staging
                    </label>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Session ID</h4>
                <p className="text-sm text-gray-600 break-all">session_2df37a81ce9e4c5d</p>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Test Mode</h4>
                <div className="bg-yellow-100 text-yellow-800 text-xs p-2 rounded">
                  <i className="fas fa-exclamation-triangle mr-1"></i>
                  Simulation mode (not connected to API)
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-1">Performance Metrics</h4>
                <div className="space-y-2 mt-2">
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Response Time</span>
                      <span className="text-xs font-medium text-gray-700">245ms</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '15%'}}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Intent Recognition</span>
                      <span className="text-xs font-medium text-gray-700">96%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-green-500 h-2 rounded-full" style={{width: '96%'}}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-medium text-gray-700">Fallback Rate</span>
                      <span className="text-xs font-medium text-gray-700">4%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-yellow-500 h-2 rounded-full" style={{width: '4%'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TestChatbotPage;