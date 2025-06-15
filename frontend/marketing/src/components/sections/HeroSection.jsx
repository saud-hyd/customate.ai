import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import Button from '../ui/Button';

const HeroSection = () => {
  // Include both namespaces
  const { t, i18n } = useTranslation(['home', 'demo']); 

  const [activeTab, setActiveTab] = useState('ecommerce');
  const [messages, setMessages] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [showInputCursor, setShowInputCursor] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [conversationActive, setConversationActive] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  
  const chatContainerRef = useRef(null);
  const heroRef = useRef(null);
  const timerIdsRef = useRef([]);
  const currentConversationRef = useRef(null);
  const tabTimerRef = useRef(null);

  // Fallback conversations - will be used until translation files are created
  const fallbackConversations = {
    ecommerce: [
      { role: 'user', text: 'Do you have this t-shirt in size Medium?' },
      { role: 'bot', text: 'Yes! We have the Premium Cotton T-shirt in Medium. Currently in stock in 3 colors: Navy, White, and Gray.' },
      { role: 'user', text: 'What\'s the return policy?' },
      { role: 'bot', text: 'We offer free returns within 30 days of purchase. No questions asked! Just use our prepaid return label.' }
    ],
    healthcare: [
      { role: 'user', text: 'What are your operating hours?' },
      { role: 'bot', text: 'We are open Monday-Friday 8AM-6PM, Saturday 9AM-4PM. Emergency services available 24/7.' },
      { role: 'user', text: 'Can I schedule a telehealth appointment?' },
      { role: 'bot', text: 'Absolutely! We offer telehealth consultations. I can help you book an appointment with one of our specialists.' }
    ],
    finance: [
      { role: 'user', text: 'What is the current interest rate?' },
      { role: 'bot', text: 'Our current savings account rate is 4.5% APY. Would you like to learn about our other investment options?' },
      { role: 'user', text: 'How do I apply for a loan?' },
      { role: 'bot', text: 'I can help you start the loan application process. First, let me gather some basic information.' }
    ],
    education: [
      { role: 'user', text: 'When is my Data Science project due?' },
      { role: 'bot', text: 'Your Data Science project is due next Friday, May 24th. You\'ve completed 3 out of 5 required sections so far.' },
      { role: 'user', text: 'What resources are available for the physics exam?' },
      { role: 'bot', text: 'We have practice tests, video tutorials, and study guides available in the learning center.' }
    ],
    support: [
      { role: 'user', text: 'My subscription isn\'t working correctly.' },
      { role: 'bot', text: 'I\'m sorry to hear that. Let me help troubleshoot. What specific issue are you experiencing?' },
      { role: 'user', text: 'I can\'t access premium features after payment' },
      { role: 'bot', text: 'Let me check that for you. I see your payment was processed but there\'s a sync issue. I\'ve refreshed your account access.' }
    ]
  };

  // Get chat examples with robust fallback - NOW REACTIVE
  const getChatExamples = () => {
    const examples = {};
    
    Object.keys(fallbackConversations).forEach(key => {
      try {
        const translated = t(`demo:heroChat.conversations.${key}`, { returnObjects: true });
        // Check if translation returned a valid array with proper structure
        if (Array.isArray(translated) && translated.length > 0 && translated[0]?.role && translated[0]?.text) {
          examples[key] = translated;
        } else {
          examples[key] = fallbackConversations[key];
        }
      } catch (error) {
        examples[key] = fallbackConversations[key];
      }
    });
    
    return examples;
  };

  // Get tab labels with fallback - NOW REACTIVE
  const getTabLabels = () => {
    const fallbackLabels = {
      ecommerce: 'E-commerce',
      healthcare: 'Healthcare',
      finance: 'Finance',
      education: 'Education',
      support: 'Support'
    };

    try {
      const translated = t('demo:heroChat.tabLabels', { returnObjects: true });
      // Check if translation returned a valid object
      if (translated && typeof translated === 'object' && !Array.isArray(translated)) {
        return { ...fallbackLabels, ...translated };
      } else {
        return fallbackLabels;
      }
    } catch (error) {
      return fallbackLabels;
    }
  };

  // Get assistant info with fallback - NOW REACTIVE
  const getAssistantInfo = () => {
    try {
      const name = t('demo:heroChat.assistant.name');
      const status = t('demo:heroChat.assistant.status');
      
      return {
        name: (name && name !== 'demo:heroChat.assistant.name') ? name : 'Customate Assistant',
        status: (status && status !== 'demo:heroChat.assistant.status') ? status : 'Online'
      };
    } catch (error) {
      return {
        name: 'Customate Assistant',
        status: 'Online'
      };
    }
  };

  // NOW THESE ARE REACTIVE - they update when language changes
  const chatExamples = getChatExamples();
  const tabLabels = getTabLabels();
  const assistantInfo = getAssistantInfo();

  // Helper function to clear all timers
  const clearAllTimers = () => {
    timerIdsRef.current.forEach(id => clearTimeout(id));
    timerIdsRef.current = [];
    
    if (tabTimerRef.current) {
      clearInterval(tabTimerRef.current);
      tabTimerRef.current = null;
    }
    
    // Clear any current conversation
    currentConversationRef.current = null;
  };
  
  // Helper function to create a tracked timer
  const createTimer = (callback, delay) => {
    const id = setTimeout(() => {
      // Remove this timer ID from the list
      timerIdsRef.current = timerIdsRef.current.filter(timerId => timerId !== id);
      // Execute callback
      callback();
    }, delay);
    
    timerIdsRef.current.push(id);
    return id;
  };

  // NEW: Handle language changes
  useEffect(() => {
    const handleLanguageChange = () => {
      // Clear current conversation and reset chat
      clearAllTimers();
      setMessages([]);
      setInputValue('');
      setIsTyping(false);
      setShowInputCursor(false);
      setConversationActive(false);
      
      // Update current language
      setCurrentLanguage(i18n.language);
      
      // Start new conversation with new language after a short delay
      createTimer(() => {
        startConversation();
      }, 500);
    };

    // Listen for language changes
    i18n.on('languageChanged', handleLanguageChange);
    
    return () => {
      i18n.off('languageChanged', handleLanguageChange);
    };
  }, [i18n]);

  // Handle page visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setIsHidden(true);
        clearAllTimers();
      } else {
        setIsHidden(false);
        
        // Reset the conversation on visibility change
        setMessages([]);
        setInputValue('');
        setIsTyping(false);
        setShowInputCursor(false);
        
        // Start a new conversation
        createTimer(() => {
          startConversation();
        }, 500);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearAllTimers();
    };
  }, []);

  // Scroll to bottom of chat when new messages appear
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Reset and start new conversation when tab changes
  useEffect(() => {
    // Clear all existing timers
    clearAllTimers();
    
    // Reset UI state
    setMessages([]);
    setInputValue('');
    setIsTyping(false);
    setShowInputCursor(false);
    setConversationActive(false);
    
    // Only start conversation if tab is visible
    if (!isHidden) {
      createTimer(() => {
        startConversation();
      }, 500);
      
      // Setup auto-rotation if not currently in a conversation
      setupTabRotation();
    }
    
    return () => {
      clearAllTimers();
    };
  }, [activeTab, isHidden, currentLanguage]); // ADD currentLanguage as dependency
  
  // Setup tab rotation
  const setupTabRotation = () => {
    if (tabTimerRef.current) {
      clearInterval(tabTimerRef.current);
    }
    
    tabTimerRef.current = setInterval(() => {
      // Only rotate tabs if the page is visible and no conversation is active
      if (!isHidden && !conversationActive) {
        rotateToNextTab();
      }
    }, 15000);
  };
  
  // Rotate to next tab
  const rotateToNextTab = () => {
    const tabs = Object.keys(chatExamples);
    const currentIndex = tabs.indexOf(activeTab);
    const nextIndex = (currentIndex + 1) % tabs.length;
    setActiveTab(tabs[nextIndex]);
  };

  // Handle manual tab change
  const handleTabChange = (tab) => {
    if (tab === activeTab) return;
    
    // Clear all timers and reset conversation state
    clearAllTimers();
    setConversationActive(false);
    
    // Change the tab
    setActiveTab(tab);
  };

  // Start a conversation
  const startConversation = () => {
    // Set flag to prevent other conversations from starting
    setConversationActive(true);
    
    // Get conversation messages for current tab (NOW ALWAYS FRESH)
    const currentChatExamples = getChatExamples();
    const conversation = currentChatExamples[activeTab];
    
    if (!conversation || !Array.isArray(conversation) || conversation.length === 0) {
      setConversationActive(false);
      return;
    }
    
    // Initialize conversation state
    let messageIndex = 0;
    
    // Define the conversation runner function
    const runConversation = () => {
      // Store the current conversation in a ref
      currentConversationRef.current = runConversation;
      
      // Check if we've reached the end of the conversation
      if (messageIndex >= conversation.length) {
        setConversationActive(false);
        currentConversationRef.current = null;
        return;
      }
      
      const currentMessage = conversation[messageIndex];
      
      // Validate message structure
      if (!currentMessage || !currentMessage.role || !currentMessage.text) {
        messageIndex++;
        if (messageIndex < conversation.length) {
          createTimer(runConversation, 100);
        } else {
          setConversationActive(false);
          currentConversationRef.current = null;
        }
        return;
      }
      
      if (currentMessage.role === 'user') {
        // Handle user message
        handleUserMessage(currentMessage, () => {
          messageIndex++;
          if (messageIndex < conversation.length) {
            createTimer(runConversation, 1000);
          } else {
            setConversationActive(false);
            currentConversationRef.current = null;
          }
        });
      } else {
        // Handle bot message
        handleBotMessage(currentMessage, () => {
          messageIndex++;
          if (messageIndex < conversation.length) {
            createTimer(runConversation, 1000);
          } else {
            setConversationActive(false);
            currentConversationRef.current = null;
          }
        });
      }
    };
    
    // Start the conversation
    createTimer(runConversation, 500);
  };
  
  // Handle user message display
  const handleUserMessage = (message, onComplete) => {
    // Validate message
    if (!message || !message.text) {
      if (onComplete) onComplete();
      return;
    }
    
    // First simulate typing
    simulateTyping(message.text, () => {
      // Then add the message to the chat
      setMessages(prev => [...prev, message]);
      setInputValue('');
      
      // Proceed to next step
      if (onComplete) onComplete();
    });
  };
  
  // Handle bot message display
  const handleBotMessage = (message, onComplete) => {
    // Validate message
    if (!message || !message.text) {
      if (onComplete) onComplete();
      return;
    }
    
    // Show typing indicator
    setIsTyping(true);
    
    // Calculate typing time based on message length
    const typingTime = Math.min(1500, 800 + message.text.length * 10);
    
    // After delay, show the message
    createTimer(() => {
      setIsTyping(false);
      setMessages(prev => [...prev, message]);
      
      // Proceed to next step
      if (onComplete) onComplete();
    }, typingTime);
  };
  
  // Simulate typing animation
  const simulateTyping = (text, onComplete) => {
    // Validate text
    if (!text) {
      if (onComplete) createTimer(onComplete, 300);
      return;
    }
    
    // Clear input and show cursor
    setInputValue('');
    setShowInputCursor(true);
    
    let currentPos = 0;
    let lastUpdate = Date.now();
    
    // Create a typing function that's aware of timing
    const typeNextCharacter = () => {
      const now = Date.now();
      const elapsed = now - lastUpdate;
      
      // If enough time has passed, update the input
      if (elapsed >= 50) { // 50ms per character for natural typing
        currentPos = Math.min(currentPos + 1, text.length);
        setInputValue(text.substring(0, currentPos));
        lastUpdate = now;
      }
      
      // If we haven't finished typing yet, continue
      if (currentPos < text.length) {
        requestAnimationFrame(typeNextCharacter);
      } else {
        // Finished typing, hide cursor and complete
        setShowInputCursor(false);
        if (onComplete) createTimer(onComplete, 300);
      }
    };
    
    // Start typing
    requestAnimationFrame(typeNextCharacter);
  };

  // Message bubble component
  const MessageBubble = ({ message }) => {
    // Validate message
    if (!message || !message.role || !message.text) {
      return null;
    }
    
    const { role, text } = message;
    
    return (
      <div className={`flex ${role === 'bot' ? 'justify-start' : 'justify-end'} mb-6`}>
        {role === 'bot' && (
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg">
            <span className="text-sm font-bold text-white">C</span>
          </div>
        )}
        
        <div className={`max-w-xs p-4 rounded-2xl ${
          role === 'bot'
            ? 'bg-white/10 text-white rounded-tl-none border border-white/10 shadow-lg backdrop-blur-sm'
            : 'bg-orange-500 text-white rounded-tr-none shadow-lg'
        }`}>
          <p className="text-sm">{text}</p>
        </div>
        
        {role === 'user' && (
          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center ml-3 flex-shrink-0 shadow-lg">
            <span className="text-sm font-bold text-gray-600">U</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <section 
      ref={heroRef} 
      id="hero"
      className="relative mt-16 pt-4 pb-8 overflow-hidden bg-gradient-to-br from-slate-900 via-gray-800 to-slate-900"    >
      {/* Modern Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Static Gradients */}
        <div className="absolute top-20 -left-20 w-96 h-96 bg-orange-500/20 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-0 right-10 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]"></div>
        
        {/* Tech Grid Pattern */}
        <div className="absolute inset-0">
          <svg className="w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M100 0H0V100" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"></path>
              </pattern>
              <pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="rgba(255,255,255,0.05)"></circle>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)"></rect>
            <rect width="100%" height="100%" fill="url(#dots)"></rect>
          </svg>
        </div>
        
        {/* Fixed Static Particles - no animations */}
        {[...Array(6)].map((_, index) => (
          <div
            key={index}
            className="absolute rounded-full bg-white/5"
            style={{
              width: 6 + 'px',
              height: 6 + 'px',
              left: (index * 16) + 5 + '%',
              top: (index * 10) + 15 + '%',
            }}
          />
        ))}
      </div>

      {/* Content Container */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left Column - Text Content */}
          <div className="lg:w-1/2 space-y-8">
            <div className="space-y-6">
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-amber-500/20 border border-orange-500/30 text-orange-400">
                <span className="h-2 w-2 rounded-full bg-orange-500 mr-2"></span>
                <span className="text-sm font-medium uppercase tracking-wider">{t('home:hero.badge')}</span>
              </div>
              
                <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight leading-none text-white">
                  {t('home:hero.title.part1')} <br/>
                  <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-yellow-300">{t('home:hero.title.part2')}</span>
                </h1>
              
              <p className="text-xl md:text-2xl font-light max-w-2xl text-gray-300">
                {t('home:hero.subtitle')}
              </p>
              {/* Buttons removed per request */}
            </div>
          </div>
          
          {/* Right Column - Interactive ChatBot Preview */}
          <div className="lg:w-1/2 relative z-10">
            <div className="relative mx-auto w-full max-w-md">
              {/* Chat Container - Modern Frosted Glass */}
              <div className="bg-white/10 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                {/* Chat Header */}
                <div className="bg-gradient-to-r from-orange-600 to-amber-500 px-6 py-5 flex items-center">
                  <div className="w-12 h-12 rounded-full bg-white/95 flex items-center justify-center mr-4 shadow-lg">
                    <div className="text-2xl font-bold text-orange-600">C</div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{assistantInfo.name}</h3>
                    <div className="flex items-center">
                      <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
                      <p className="text-orange-100 text-sm">{assistantInfo.status}</p>
                    </div>
                  </div>
                </div>
                
                {/* Chat Body - Messages Area - No animations */}
                <div 
                  ref={chatContainerRef}
                  className="h-[400px] p-5 bg-slate-800/60 backdrop-blur-md overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent"
                >
                  {messages.map((msg, index) => (
                    <MessageBubble
                      key={`${activeTab}-${index}-${currentLanguage}`}
                      message={msg}
                    />
                  ))}
                  
                  {/* Bot typing indicator - without animations */}
                  {isTyping && (
                    <div className="flex justify-start mb-6">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-center mr-3 flex-shrink-0 shadow-lg">
                        <span className="text-sm font-bold text-white">C</span>
                      </div>
                      <div className="bg-white/10 text-white rounded-2xl rounded-tl-none border border-white/10 shadow-lg backdrop-blur-sm p-4">
                        <div className="flex space-x-2">
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                          <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Chat Input Bar */}
                <div className="px-4 py-3 bg-slate-800/80 border-t border-white/10">
                  <div className="flex items-center">
                    <div className="relative flex-grow">
                      <input
                        type="text"
                        value={inputValue}
                        readOnly
                        className="w-full bg-white/10 text-white placeholder-gray-400 rounded-full px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 border border-white/10"
                        placeholder="Type your message..."
                      />
                      {showInputCursor && (
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white">
                          |
                        </div>
                      )}
                    </div>
                    <div className="ml-2 p-3 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white opacity-75">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Industry Tabs - Modern Pill Design */}
              <div className="mt-8 flex justify-center">
                <div className="inline-flex bg-slate-800/60 backdrop-blur-sm p-1.5 rounded-full border border-white/10 shadow-inner">
                  {Object.keys(chatExamples).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => handleTabChange(tab)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all
                        ${activeTab === tab
                          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md'
                          : 'text-white/70 hover:text-white'
                        }`}
                    >
                      {tabLabels[tab] || tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bottom Wave Divider */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg className="w-full h-auto fill-white" viewBox="0 0 1440 120" preserveAspectRatio="none">
          <path d="M0,64L48,80C96,96,192,128,288,128C384,128,480,96,576,85.3C672,75,768,85,864,96C960,107,1056,117,1152,112C1248,107,1344,85,1392,74.7L1440,64L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;