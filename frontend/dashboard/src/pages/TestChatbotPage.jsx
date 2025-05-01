import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  AdjustmentsHorizontalIcon, 
  CodeBracketIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ChevronDownIcon
} from '@heroicons/react/24/outline';
import clientService from '../services/clientService';
import ChatInterface from '../components/chat/ChatInterface';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import Modal from '../components/common/Modal';

const TestChatbotPage = () => {
  // Main state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState('appearance');
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLlmMenuOpen, setIsLlmMenuOpen] = useState(false);
  
  // Chat settings
  const [chatSettings, setChatSettings] = useState({
    primaryColor: '#4f46e5',
    chatbotName: 'Customate.AI Assistant',
    widgetPosition: 'bottom-right',
    showTypingIndicator: true,
    enableSuggestions: true,
    resetOnPageRefresh: true,
    sessionTimeout: 30,
    apiKey: '',
    // LLM settings
    llmProvider: "deepseek",
    llmModel: "deepseek-chat",
  });
  
  // LLM options
  const llmOptions = [
    { 
      provider: 'deepseek', 
      name: 'DeepSeek', 
      models: [{ id: 'deepseek-chat', name: 'DeepSeek Chat' }]
    },
    { 
      provider: 'openai', 
      name: 'OpenAI', 
      models: [
        { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' },
        { id: 'gpt-4', name: 'GPT-4' },
        { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' }
      ]
    },
    { 
      provider: 'claude', 
      name: 'Claude', 
      models: [
        { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
        { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet' },
        { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' }
      ]
    }
  ];
  
  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchCurrentSettings(),
          fetchClientApiKey()
        ]);
        setIsLoading(false);
      } catch (error) {
        console.error('Error initializing test chatbot:', error);
        setIsLoading(false);
        toast.error('Failed to load settings. Please try again.');
      }
    };
    
    fetchData();
  }, []);
  
  // Close LLM menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isLlmMenuOpen && !event.target.closest('.llm-menu-container')) {
        setIsLlmMenuOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isLlmMenuOpen]);
  
  // Data fetching functions
  const fetchCurrentSettings = async () => {
    try {
      const settings = await clientService.getSettings();
      setChatSettings(prev => ({
        ...prev,
        primaryColor: settings.primary_color || prev.primaryColor,
        chatbotName: settings.chatbot_name || prev.chatbotName,
        widgetPosition: settings.widget_position || prev.widgetPosition,
        showTypingIndicator: settings.show_typing_indicator !== undefined ? settings.show_typing_indicator : prev.showTypingIndicator,
        enableSuggestions: settings.enable_suggestions !== undefined ? settings.enable_suggestions : prev.enableSuggestions,
        greeting: settings.greeting_message || prev.greeting,
        resetOnPageRefresh: settings.reset_on_page_refresh !== undefined ? settings.reset_on_page_refresh : prev.resetOnPageRefresh,
        sessionTimeout: settings.session_timeout || prev.sessionTimeout,
        llmProvider: settings.llm_provider || prev.llmProvider,
        llmModel: settings.llm_model || prev.llmModel || "deepseek-chat",
      }));
    } catch (err) {
      console.error('Error fetching current settings:', err);
    }
  };
  
  const fetchClientApiKey = async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      setChatSettings(prev => ({
        ...prev,
        apiKey: clientInfo.api_key
      }));
    } catch (err) {
      console.error('Error fetching client API key:', err);
    }
  };
  
  // Event handlers
  const handleSettingChange = (setting, value) => {
    setChatSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  const handleSelectModel = (provider, modelId) => {
    setChatSettings(prev => ({
      ...prev,
      llmProvider: provider,
      llmModel: modelId
    }));
    setIsLlmMenuOpen(false);
  };
  
  const handleResetChat = () => {
    setChatSettings(prev => ({
      ...prev,
      resetSession: true,
    }));
    
    // Remove the flag after a short delay
    setTimeout(() => {
      setChatSettings(prev => {
        const newSettings = {...prev};
        delete newSettings.resetSession;
        return newSettings;
      });
    }, 100);
    
    toast.info('Chat session reset');
  };
  
  const handleSaveSettings = async () => {
    try {
      setIsSaving(true);
      
      const settingsToSave = {
        primary_color: chatSettings.primaryColor,
        chatbot_name: chatSettings.chatbotName,
        widget_position: chatSettings.widgetPosition,
        show_typing_indicator: chatSettings.showTypingIndicator,
        enable_suggestions: chatSettings.enableSuggestions,
        greeting_message: chatSettings.greeting,
        reset_on_page_refresh: chatSettings.resetOnPageRefresh,
        session_timeout: chatSettings.sessionTimeout,
        custom_settings: {
          llm_provider: chatSettings.llmProvider,
          llm_model: chatSettings.llmModel
        }
      };
      
      await clientService.updateWidgetSettings(settingsToSave);
      toast.success('Chatbot settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save chatbot settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Generate embed code for installation
  const generateEmbedCode = () => {
    let backendUrl = 'https://customate-ai-1.onrender.com'; // Production backend URL
    
    // Check if we're in development mode
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      backendUrl = 'http://localhost:8000'; // Local backend URL
    }
    
    return `<!-- Customate.ai Chat Widget -->
  <script>
    window.customateConfig = {
      apiKey: '${chatSettings.apiKey}',
      apiUrl: '${backendUrl}'
      // All other settings will be loaded dynamically from the server
    };
  </script>
  <script src="${backendUrl}/api/widget/widget.js" async></script>`;
  };    
  if (isLoading) {
    return <LoadingState message="Initializing chatbot test environment..." />;
  }
  
  // Find the current model name from the options
  const currentProvider = llmOptions.find(p => p.provider === chatSettings.llmProvider);
  const currentModel = currentProvider?.models.find(m => m.id === chatSettings.llmModel);
  const currentModelName = currentModel?.name || chatSettings.llmModel || 'Default';
  
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      {/* Top control bar */}
      <div className="bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between">
        <div className="flex items-center">
          <h2 className="text-xl font-bold text-gray-800 mr-6">Test Your Chatbot</h2>
          
          {/* LLM Provider Selector - Clickable dropdown */}
          <div className="relative llm-menu-container">
            <button
              type="button"
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              onClick={() => setIsLlmMenuOpen(!isLlmMenuOpen)}
            >
              <Cog6ToothIcon className="h-4 w-4 mr-2" />
              <span>
                {chatSettings.llmProvider ? (
                  `${chatSettings.llmProvider.charAt(0).toUpperCase() + chatSettings.llmProvider.slice(1)}: ${currentModelName}`
                ) : 'Select Model'}
              </span>
              <ChevronDownIcon className="h-4 w-4 ml-2" />
            </button>
            
            {isLlmMenuOpen && (
              <div className="absolute left-0 mt-2 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                <div className="py-1 divide-y divide-gray-100" role="menu" aria-orientation="vertical">
                  {llmOptions.map((provider) => (
                    <div key={provider.provider} className="py-2">
                      <div className="px-4 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {provider.name}
                      </div>
                      {provider.models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleSelectModel(provider.provider, model.id)}
                          className={`block w-full text-left px-4 py-2 text-sm ${
                            chatSettings.llmProvider === provider.provider && chatSettings.llmModel === model.id
                              ? 'bg-indigo-50 text-indigo-700'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                          role="menuitem"
                        >
                          <div className="flex items-center justify-between">
                            <span>{model.name}</span>
                            {chatSettings.llmProvider === provider.provider && 
                             chatSettings.llmModel === model.id && 
                             <CheckCircleIcon className="h-4 w-4 text-indigo-600" />}
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={handleResetChat}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Reset
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
            Settings
          </button>
          
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            Get Code
          </button>
          
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
              isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
      
      {/* Chat area - Exact sizing to prevent scrolling */}
      <div className="flex-1 flex justify-center items-center" style={{ height: 'calc(100vh - 102px)' }}>
        <div className="w-full max-w-md" style={{ height: '100%', maxHeight: 'calc(100vh - 124px)' }}>
          {/* Chat interface with fixed height */}
          <div className="bg-white rounded-lg overflow-hidden shadow-lg border border-gray-200 h-full flex flex-col">
            {/* Chat header */}
            <div 
              className="px-4 py-3 flex items-center border-b"
              style={{ backgroundColor: chatSettings.primaryColor, color: '#fff' }}
            >
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">{chatSettings.chatbotName}</h3>
                <p className="text-xs text-white/80">Online</p>
              </div>
            </div>
            
            {/* Chat interface */}
            <div className="flex-1 overflow-hidden">
              <ChatInterface
                config={{
                  ...chatSettings,
                  customData: {
                    ...chatSettings.customData,
                    llmProvider: chatSettings.llmProvider,
                    llmModel: chatSettings.llmModel
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Status footer */}
      <div className="bg-white border-t border-gray-200 py-2 px-6 text-xs text-gray-500 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <span className="h-2 w-2 bg-green-500 rounded-full mr-1"></span>
            <span>Status: Online</span>
          </div>
          <div className="flex items-center">
            <span>Model: {chatSettings.llmProvider ? `${chatSettings.llmProvider}${chatSettings.llmModel ? `: ${chatSettings.llmModel}` : ''}` : 'Default'}</span>
          </div>
        </div>
        <div>
          <span>Remember to save your changes before deploying</span>
        </div>
      </div>
      
      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Chatbot Settings"
        size="lg"
      >
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
              Behavior
            </button>
            <button
              onClick={() => setActiveSettingsTab('model')}
              className={`${
                activeSettingsTab === 'model'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              Model
            </button>
          </nav>
        </div>
        
        <div className="mt-6" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
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
              
              <div>
                <label htmlFor="greeting" className="block text-sm font-medium text-gray-700 mb-1">
                  Greeting Message
                </label>
                <textarea
                  id="greeting"
                  value={chatSettings.greeting}
                  onChange={(e) => handleSettingChange('greeting', e.target.value)}
                  rows={3}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-full"
                />
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
              
              <div className="flex items-center mt-4">
                <input
                  id="resetOnPageRefresh"
                  type="checkbox"
                  checked={chatSettings.resetOnPageRefresh}
                  onChange={(e) => handleSettingChange('resetOnPageRefresh', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="resetOnPageRefresh" className="ml-2 block text-sm text-gray-900">
                  Start a fresh chat on page refresh
                </label>
              </div>

              <div className="mt-4">
                <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-1">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  id="sessionTimeout"
                  min="1"
                  max="1440"
                  value={chatSettings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm w-24"
                />
                <p className="mt-1 text-xs text-gray-500">
                  The chat session will reset after this period of inactivity
                </p>
              </div>
            </div>
          )}
          
          {/* Model settings */}
          {activeSettingsTab === 'model' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select LLM Provider and Model
                </label>
                <div className="space-y-4">
                  {llmOptions.map((provider) => (
                    <div key={provider.provider} className="border border-gray-200 rounded-md p-4">
                      <div className="text-sm font-medium text-gray-700 mb-2">
                        {provider.name}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {provider.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleSelectModel(provider.provider, model.id)}
                            className={`flex items-center justify-between px-3 py-2 text-sm rounded-md ${
                              chatSettings.llmProvider === provider.provider && chatSettings.llmModel === model.id
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'border border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <span>{model.name}</span>
                            {chatSettings.llmProvider === provider.provider && 
                             chatSettings.llmModel === model.id && 
                             <CheckCircleIcon className="h-4 w-4 text-indigo-600" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end space-x-3">
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              handleSaveSettings();
              setIsSettingsOpen(false);
            }}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </Modal>
      
      {/* Installation Code Modal */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="Installation Code"
        size="lg"
      >
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Embed this code on your website</h3>
          <p className="text-xs text-gray-500 mb-3">
            Copy and paste this code into your website, just before the closing &lt;/body&gt; tag:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm h-64 overflow-y-auto">
              {generateEmbedCode()}
            </pre>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateEmbedCode());
                toast.success('Code copied to clipboard!');
              }}
              className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
            >
              Copy
            </button>
          </div>
          
          <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <InformationCircleIcon className="h-5 w-5 text-yellow-400" />
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong>Important:</strong> This code includes your API key. Make sure to update the configuration 
                  settings if you change them in the future.
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            onClick={() => setIsCodeModalOpen(false)}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default TestChatbotPage;