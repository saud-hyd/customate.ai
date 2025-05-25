import React, { useState, useEffect, useRef, useCallback } from 'react';
import { toast } from 'react-toastify';
import { 
  AdjustmentsHorizontalIcon, 
  CodeBracketIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  InformationCircleIcon,
  Cog6ToothIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  SparklesIcon,
  ExclamationTriangleIcon,
  ChatBubbleLeftRightIcon,
  BoltIcon
} from '@heroicons/react/24/outline';
import clientService from '../services/clientService';
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
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  // Refs
  const widgetContainerRef = useRef(null);
  const widgetScriptRef = useRef(null);
  const cleanupTimeoutRef = useRef(null);
  const reloadTimeoutRef = useRef(null);
  const syncCheckInterval = useRef(null);
  
  // Enhanced chat settings with sync tracking
  const [chatSettings, setChatSettings] = useState({
    primaryColor: '#ea580c',
    chatbotName: 'Customate.AI Assistant',
    widgetPosition: 'bottom-right',
    showTypingIndicator: true,
    enableSuggestions: true,
    resetOnPageRefresh: true,
    sessionTimeout: 30,
    apiKey: '',
    greeting: 'Hello! How can I help you today?',
    llmProvider: "deepseek",
    llmModel: "deepseek-chat",
  });
  
  // Track previous settings for change detection
  const [previousSettings, setPreviousSettings] = useState({});
  const [settingsHash, setSettingsHash] = useState('');
  
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

  // Enhanced cleanup function
  const cleanupWidget = useCallback(() => {
    console.log('🧹 Cleaning up widget...');
    
    // Clear timeouts and intervals
    [cleanupTimeoutRef, reloadTimeoutRef, syncCheckInterval].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        clearInterval(ref.current);
        ref.current = null;
      }
    });

    // Reset states
    setWidgetLoaded(false);
    setWidgetError(null);
    setConnectionStatus('connecting');

    // Clean up global widget variables
    ['customateConfig', 'customateWidget', 'customateWidgetInstance'].forEach(prop => {
      if (window[prop]) {
        delete window[prop];
      }
    });

    // Clear widget container
    if (widgetContainerRef.current) {
      try {
        widgetContainerRef.current.innerHTML = '';
      } catch (error) {
        console.warn('Container cleanup warning:', error);
      }
    }

    // Remove widget styles
    const stylesToRemove = ['customate-widget-styles', 'customate-theme-vars'];
    stylesToRemove.forEach(id => {
      const element = document.getElementById(id);
      if (element && element.parentNode) {
        try {
          element.parentNode.removeChild(element);
        } catch (error) {
          console.warn(`Style cleanup warning for ${id}:`, error);
        }
      }
    });

    // Remove script
    if (widgetScriptRef.current && widgetScriptRef.current.parentNode) {
      try {
        widgetScriptRef.current.parentNode.removeChild(widgetScriptRef.current);
      } catch (error) {
        console.warn('Script cleanup warning:', error);
      }
      widgetScriptRef.current = null;
    }
    
    console.log('✅ Widget cleanup complete');
  }, []);

  // Enhanced widget initialization with sync support
  const initializeWidget = useCallback(async () => {
    if (!chatSettings.apiKey) {
      console.warn('No API key available for widget initialization');
      setWidgetError('API key is missing');
      return;
    }
    
    console.log('🚀 Initializing widget with enhanced sync support...');
    
    try {
      setConnectionStatus('connecting');
      setWidgetError(null);
      
      // Clean up previous widget
      cleanupWidget();
      
      // Wait for cleanup to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get backend URL
      const backendUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
        ? 'http://localhost:8000' 
        : 'https://customate-ai-1.onrender.com';
      
      console.log('🔗 Backend URL:', backendUrl);
      
      // Test comprehensive connection
      const connectionTest = await clientService.checkConnection();
      if (!connectionTest.success) {
        throw new Error(`Backend connection failed: ${connectionTest.message}`);
      }
      
      setConnectionStatus('connected');
      
      // Set up enhanced widget configuration
      window.customateConfig = {
        apiKey: chatSettings.apiKey,
        apiUrl: backendUrl,
        position: 'inline',
        primaryColor: chatSettings.primaryColor,
        chatbotName: chatSettings.chatbotName,
        greeting: chatSettings.greeting,
        enableTypingIndicator: chatSettings.showTypingIndicator,
        enableSuggestions: chatSettings.enableSuggestions,
        widgetPosition: chatSettings.widgetPosition,
        testMode: true,
        container: widgetContainerRef.current,
        debug: process.env.NODE_ENV === 'development',
        settingsSyncInterval: 10000 // 10 seconds for test mode
      };
      
      console.log('📝 Enhanced widget configuration set:', window.customateConfig);
      
      // Load widget script with enhanced error handling
      const script = document.createElement('script');
      script.src = `${backendUrl}/api/widget/widget.js?v=${Date.now()}`;
      script.async = true;
      
      script.onload = () => {
        console.log('✅ Widget script loaded successfully');
        setWidgetLoaded(true);
        setConnectionStatus('ready');
        setLastSyncTime(new Date());
        toast.success('Widget loaded with sync support!', { autoClose: 2000 });
        
        // Start sync monitoring
        startSyncMonitoring();
      };
      
      script.onerror = (error) => {
        console.error('❌ Widget script load error:', error);
        setWidgetError('Failed to load widget script');
        setConnectionStatus('error');
        toast.error('Failed to load widget script. Please check your connection.');
      };
      
      widgetScriptRef.current = script;
      document.head.appendChild(script);
      
    } catch (error) {
      console.error('❌ Error initializing widget:', error);
      setWidgetError(error.message);
      setConnectionStatus('error');
      toast.error('Failed to initialize widget: ' + error.message);
    }
  }, [chatSettings, cleanupWidget]);

  // Start sync monitoring
  const startSyncMonitoring = useCallback(() => {
    if (syncCheckInterval.current) {
      clearInterval(syncCheckInterval.current);
    }
    
    syncCheckInterval.current = setInterval(async () => {
      try {
        // Check if widget instance exists and has updateSettings method
        if (window.customateWidgetInstance && window.customateWidgetInstance.updateSettings) {
          console.log('🔄 Widget sync active');
          setLastSyncTime(new Date());
        }
      } catch (error) {
        console.warn('Sync check error:', error);
      }
    }, 30000); // Check every 30 seconds
  }, []);
  
  // Enhanced reload function with sync notification
  const reloadWidget = useCallback((delay = 500) => {
    console.log('🔄 Reloading widget with sync...');
    
    if (reloadTimeoutRef.current) {
      clearTimeout(reloadTimeoutRef.current);
    }
    
    reloadTimeoutRef.current = setTimeout(() => {
      initializeWidget();
    }, delay);
  }, [initializeWidget]);

  // Fetch data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        await Promise.all([
          fetchCurrentSettings(),
          fetchClientApiKey()
        ]);
      } catch (error) {
        console.error('Error initializing test chatbot:', error);
        toast.error('Failed to load settings. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Initialize widget when settings are loaded
  useEffect(() => {
    if (!isLoading && chatSettings.apiKey) {
      initializeWidget();
    }
    
    // Cleanup on unmount
    return () => {
      [cleanupTimeoutRef, reloadTimeoutRef, syncCheckInterval].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
          clearInterval(ref.current);
        }
      });
      cleanupWidget();
    };
  }, [isLoading, chatSettings.apiKey, initializeWidget, cleanupWidget]);

  // Detect settings changes and update hash
  useEffect(() => {
    const newHash = JSON.stringify(chatSettings);
    if (settingsHash && settingsHash !== newHash && widgetLoaded) {
      console.log('⚙️ Settings changed, preparing sync...');
      setSettingsHash(newHash);
      
      // Don't auto-reload, let user save to trigger sync
    } else if (!settingsHash) {
      setSettingsHash(newHash);
    }
    
    setPreviousSettings({ ...chatSettings });
  }, [chatSettings, widgetLoaded, settingsHash]);

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
        llmProvider: settings.custom_settings?.llm_provider || prev.llmProvider,
        llmModel: settings.custom_settings?.llm_model || prev.llmModel || "deepseek-chat",
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
    try {
      if (window.customateWidgetInstance && window.customateWidgetInstance.reset) {
        window.customateWidgetInstance.reset();
        toast.info('Chat session reset');
      } else if (window.customateWidget && window.customateWidget.reset) {
        window.customateWidget.reset();
        toast.info('Chat session reset');
      } else {
        reloadWidget();
        toast.info('Chat reloaded');
      }
    } catch (error) {
      console.warn('Reset error:', error);
      reloadWidget();
      toast.info('Chat reloaded');
    }
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
      
      // Save settings to unified endpoint
      await clientService.updateWidgetSettings(settingsToSave);
      
      // Update the widget immediately if it's loaded
      if (window.customateWidgetInstance && window.customateWidgetInstance.updateSettings) {
        window.customateWidgetInstance.updateSettings({
          primaryColor: chatSettings.primaryColor,
          chatbotName: chatSettings.chatbotName,
          greeting: chatSettings.greeting,
          widgetPosition: chatSettings.widgetPosition,
          showTypingIndicator: chatSettings.showTypingIndicator,
          enableSuggestions: chatSettings.enableSuggestions,
          llmProvider: chatSettings.llmProvider,
          llmModel: chatSettings.llmModel
        });
      }
      
      // Trigger sync to all deployed widgets
      await clientService.triggerWidgetReload();
      
      // Update hash to prevent unnecessary reloads
      setSettingsHash(JSON.stringify(chatSettings));
      setLastSyncTime(new Date());
      
      toast.success('Settings saved and synced to all widgets!', {
        icon: '🔄'
      });
      
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save chatbot settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleTestConnection = async () => {
    try {
      setConnectionStatus('testing');
      const result = await clientService.checkConnection();
      
      if (result.success) {
        setConnectionStatus('connected');
        toast.success('All connections successful!', {
          icon: '✅'
        });
      } else {
        throw new Error(result.message || 'Connection test failed');
      }
    } catch (error) {
      setConnectionStatus('error');
      toast.error(`Connection failed: ${error.message}`);
    }
  };
  
  // Generate embed code
  const generateEmbedCode = () => {
    let backendUrl = 'https://customate-ai-1.onrender.com';
    
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      backendUrl = 'http://localhost:8000';
    }
    
    return `<!-- Customate.ai Chat Widget -->
<script>
  window.customateConfig = {
    apiKey: '${chatSettings.apiKey}',
    apiUrl: '${backendUrl}'
    // All settings are automatically synced from your dashboard
  };
</script>
<script src="${backendUrl}/api/widget/widget.js" async></script>`;
  };    
  
  if (isLoading) {
    return <LoadingState message="Initializing enhanced chatbot test environment..." />;
  }
  
  // Find the current model name from the options
  const currentProvider = llmOptions.find(p => p.provider === chatSettings.llmProvider);
  const currentModel = currentProvider?.models.find(m => m.id === chatSettings.llmModel);
  const currentModelName = currentModel?.name || chatSettings.llmModel || 'Default';
  
  // Enhanced connection status component
  const ConnectionStatus = () => {
    const statusConfig = {
      connecting: { icon: '🔄', color: 'text-yellow-600', bg: 'bg-yellow-50', pulse: true },
      connected: { icon: '✅', color: 'text-green-600', bg: 'bg-green-50', pulse: false },
      ready: { icon: '🚀', color: 'text-blue-600', bg: 'bg-blue-50', pulse: false },
      error: { icon: '❌', color: 'text-red-600', bg: 'bg-red-50', pulse: false },
      testing: { icon: '🔍', color: 'text-orange-600', bg: 'bg-orange-50', pulse: true }
    };
    
    const config = statusConfig[connectionStatus] || statusConfig.connecting;
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${config.color} ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`}>
        <span className="mr-2">{config.icon}</span>
        {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
        {lastSyncTime && connectionStatus === 'ready' && (
          <span className="ml-2 text-xs opacity-75">
            • Synced {new Date(lastSyncTime).toLocaleTimeString()}
          </span>
        )}
      </div>
    );
  };
  
  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gradient-to-br from-orange-50 via-amber-50 to-orange-100">
      {/* Enhanced top control bar with sync status */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-orange-200/50 py-4 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center">
          <div className="flex items-center mr-6">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
              <BoltIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">Test Your Chatbot</h2>
              <div className="flex items-center mt-1 space-x-3">
                <ConnectionStatus />
                {connectionStatus === 'error' && (
                  <button
                    onClick={handleTestConnection}
                    className="text-xs text-orange-600 hover:text-orange-700 underline"
                  >
                    Retry Connection
                  </button>
                )}
                {widgetLoaded && lastSyncTime && (
                  <div className="text-xs text-gray-500 flex items-center">
                    <BoltIcon className="h-3 w-3 mr-1" />
                    Live Sync Active
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Enhanced LLM Provider Selector */}
          <div className="relative llm-menu-container">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-orange-200 shadow-sm text-sm font-medium rounded-lg text-orange-700 bg-white/80 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
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
              <div className="absolute left-0 mt-2 w-64 rounded-xl shadow-lg bg-white ring-1 ring-orange-100 focus:outline-none z-10 overflow-hidden">
                <div className="py-2 divide-y divide-orange-50" role="menu" aria-orientation="vertical">
                  {llmOptions.map((provider) => (
                    <div key={provider.provider} className="py-2">
                      <div className="px-4 py-2 text-xs font-semibold text-orange-600 uppercase tracking-wider bg-orange-50">
                        {provider.name}
                      </div>
                      {provider.models.map((model) => (
                        <button
                          key={model.id}
                          onClick={() => handleSelectModel(provider.provider, model.id)}
                          className={`block w-full text-left px-4 py-3 text-sm transition-colors duration-150 ${
                            chatSettings.llmProvider === provider.provider && chatSettings.llmModel === model.id
                              ? 'bg-orange-100 text-orange-800'
                              : 'text-gray-700 hover:bg-orange-50'
                          }`}
                          role="menuitem"
                        >
                          <div className="flex items-center justify-between">
                            <span>{model.name}</span>
                            {chatSettings.llmProvider === provider.provider && 
                             chatSettings.llmModel === model.id && 
                             <CheckCircleIcon className="h-4 w-4 text-orange-600" />}
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
            className="inline-flex items-center px-4 py-2 border border-orange-200 shadow-sm text-sm font-medium rounded-lg text-orange-700 bg-white/80 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Reset
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-orange-200 shadow-sm text-sm font-medium rounded-lg text-orange-700 bg-white/80 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-2" />
            Settings
          </button>
          
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className="inline-flex items-center px-4 py-2 border border-orange-200 shadow-sm text-sm font-medium rounded-lg text-orange-700 bg-white/80 hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-all duration-200"
          >
            <CodeBracketIcon className="h-4 w-4 mr-2" />
            Get Code
          </button>
          
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`inline-flex items-center px-6 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white transition-all duration-200 ${
              isSaving 
                ? 'bg-orange-400 cursor-not-allowed' 
                : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <BoltIcon className="h-4 w-4 mr-2" />
                Save & Sync
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Enhanced Widget Container */}
      <div className="flex-1 flex justify-center items-center p-6">
        <div className="w-full max-w-md h-full max-h-[600px]">
          <div 
            ref={widgetContainerRef}
            id="customate-test-widget"
            className="h-full w-full flex items-center justify-center"
            key={`widget-${chatSettings.apiKey}-${settingsHash}`}
          >
            {!widgetLoaded && !widgetError && (
              <div className="flex flex-col items-center justify-center text-center p-8">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-gray-600 font-medium">Loading enhanced widget...</p>
                <p className="text-sm text-gray-400 mt-2">Initializing real-time sync</p>
                <div className="mt-4 text-xs text-gray-500 space-y-1">
                  <p>API Key: {chatSettings.apiKey ? '✓ Available' : '✗ Missing'}</p>
                  <p>Backend: {connectionStatus}</p>
                  <p>Model: {chatSettings.llmProvider}:{chatSettings.llmModel}</p>
                  <p>Sync: {lastSyncTime ? '✓ Active' : '⏳ Pending'}</p>
                </div>
              </div>
            )}
            
{widgetError && (
              <div className="flex flex-col items-center justify-center text-center p-8 max-w-md">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <ExclamationTriangleIcon className="w-8 h-8 text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Widget Failed to Load</h3>
                <p className="text-gray-600 mb-4 text-sm">
                  {widgetError}
                </p>
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setWidgetError(null);
                      initializeWidget();
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
                  >
                    Try Again
                  </button>
                  
                  <div className="text-xs text-gray-500 mt-3 p-3 bg-gray-50 rounded border max-w-sm">
                    <p className="font-medium mb-1">Troubleshooting Tips:</p>
                    <ul className="text-left space-y-1">
                      <li>• Make sure your backend server is running</li>
                      <li>• Check that the API key is valid</li>
                      <li>• Verify the widget routes are configured</li>
                      <li>• Check browser console for detailed errors</li>
                      <li>• Ensure settings sync is enabled</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Enhanced status footer with sync information */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-orange-200/50 py-3 px-6 text-sm text-gray-600 flex justify-between items-center">
        <div className="flex items-center space-x-6">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              widgetLoaded ? 'bg-green-500' : 
              widgetError ? 'bg-red-500' : 
              'bg-orange-500 animate-pulse'
            }`}></div>
            <span className="font-medium">
              Status: {widgetLoaded ? 'Online' : widgetError ? 'Error' : 'Loading...'}
            </span>
          </div>
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-4 w-4 mr-1 text-orange-600" />
            <span>Model: </span>
            <span className="font-medium text-orange-700 ml-1">
              {chatSettings.llmProvider ? `${chatSettings.llmProvider}${chatSettings.llmModel ? `: ${chatSettings.llmModel}` : ''}` : 'Default'}
            </span>
          </div>
          <div className="flex items-center">
            <span>Session: </span>
            <span className="font-medium text-orange-700 ml-1">
              {window.customateWidgetInstance?.getSessionId?.()?.slice(-8) || 
               window.customateWidget?.getSessionId?.()?.slice(-8) || 'New'}
            </span>
          </div>
          {lastSyncTime && (
            <div className="flex items-center">
              <BoltIcon className="h-4 w-4 mr-1 text-green-600" />
              <span>Last Sync: </span>
              <span className="font-medium text-green-700 ml-1">
                {lastSyncTime.toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center text-orange-600">
          <InformationCircleIcon className="h-4 w-4 mr-1" />
          <span>Real-time sync with {currentModelName} • All changes auto-deploy</span>
        </div>
      </div>
      
      {/* Settings Modal - Same structure but with enhanced sync features */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Chatbot Settings - Live Sync"
        size="lg"
      >
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            {[
              { id: 'appearance', label: 'Appearance' },
              { id: 'behavior', label: 'Behavior' },
              { id: 'model', label: 'Model' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveSettingsTab(tab.id)}
                className={`${
                  activeSettingsTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center transition-colors duration-200`}
              >
                {tab.label}
                {activeSettingsTab === tab.id && (
                  <BoltIcon className="h-4 w-4 ml-2" />
                )}
              </button>
            ))}
          </nav>
        </div>
        
        <div className="mt-6" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          {/* Appearance settings */}
          {activeSettingsTab === 'appearance' && (
            <div className="space-y-6">
              <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-6">
                <div className="flex">
                  <BoltIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-blue-800">
                      <strong>Live Sync:</strong> Changes are instantly applied to your test widget and will be synced to all deployed widgets when you save.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="primaryColor" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    id="primaryColor"
                    value={chatSettings.primaryColor}
                    onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                    className="h-12 w-12 rounded-lg border-2 border-gray-200 cursor-pointer focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  />
                  <input
                    type="text"
                    value={chatSettings.primaryColor}
                    onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm w-32"
                  />
                  <div className="text-sm text-gray-500">
                    Applied instantly to test widget
                  </div>
                </div>
              </div>
              
              <div>
                <label htmlFor="chatbotName" className="block text-sm font-medium text-gray-700 mb-2">
                  Chatbot Name
                </label>
                <input
                  type="text"
                  id="chatbotName"
                  value={chatSettings.chatbotName}
                  onChange={(e) => handleSettingChange('chatbotName', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm w-full max-w-md"
                  placeholder="Enter chatbot name"
                />
              </div>
              
              <div>
                <label htmlFor="widgetPosition" className="block text-sm font-medium text-gray-700 mb-2">
                  Widget Position (for deployed widgets)
                </label>
                <select
                  id="widgetPosition"
                  value={chatSettings.widgetPosition}
                  onChange={(e) => handleSettingChange('widgetPosition', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm w-full max-w-xs"
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                  <option value="top-right">Top Right</option>
                  <option value="top-left">Top Left</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="greeting" className="block text-sm font-medium text-gray-700 mb-2">
                  Greeting Message
                </label>
                <textarea
                  id="greeting"
                  value={chatSettings.greeting}
                  onChange={(e) => handleSettingChange('greeting', e.target.value)}
                  rows={3}
                  className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm w-full resize-none"
                  placeholder="Enter greeting message..."
                />
                <p className="mt-1 text-xs text-gray-500">
                  This message will be shown to users when they first open the chat
                </p>
              </div>
            </div>
          )}
          
          {/* Behavior settings */}
          {activeSettingsTab === 'behavior' && (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label htmlFor="showTypingIndicator" className="text-sm font-medium text-gray-900">
                      Show typing indicator
                    </label>
                    <p className="text-xs text-gray-500">Display animated dots when bot is typing</p>
                  </div>
                  <input
                    id="showTypingIndicator"
                    type="checkbox"
                    checked={chatSettings.showTypingIndicator}
                    onChange={(e) => handleSettingChange('showTypingIndicator', e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label htmlFor="enableSuggestions" className="text-sm font-medium text-gray-900">
                      Enable suggested responses
                    </label>
                    <p className="text-xs text-gray-500">Show quick reply suggestions to users</p>
                  </div>
                  <input
                    id="enableSuggestions"
                    type="checkbox"
                    checked={chatSettings.enableSuggestions}
                    onChange={(e) => handleSettingChange('enableSuggestions', e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <label htmlFor="resetOnPageRefresh" className="text-sm font-medium text-gray-900">
                      Reset on page refresh
                    </label>
                    <p className="text-xs text-gray-500">Start fresh conversation on page reload</p>
                  </div>
                  <input
                    id="resetOnPageRefresh"
                    type="checkbox"
                    checked={chatSettings.resetOnPageRefresh}
                    onChange={(e) => handleSettingChange('resetOnPageRefresh', e.target.checked)}
                    className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="sessionTimeout" className="block text-sm font-medium text-gray-700 mb-2">
                  Session Timeout (minutes)
                </label>
                <input
                  type="number"
                  id="sessionTimeout"
                  min="1"
                  max="1440"
                  value={chatSettings.sessionTimeout}
                  onChange={(e) => handleSettingChange('sessionTimeout', parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm w-24"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Chat session will reset after this period of inactivity
                </p>
              </div>
            </div>
          )}
          
          {/* Model settings */}
          {activeSettingsTab === 'model' && (
            <div className="space-y-6">
              <div className="bg-orange-50 border-l-4 border-orange-400 p-4 rounded-r-lg">
                <div className="flex">
                  <BoltIcon className="h-5 w-5 text-orange-400 flex-shrink-0" />
                  <div className="ml-3">
                    <p className="text-sm text-orange-800">
                      <strong>Model Sync:</strong> LLM changes are applied immediately and synced across all your deployed widgets.
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Select LLM Provider and Model
                </label>
                <div className="space-y-3">
                  {llmOptions.map((provider) => (
                    <div key={provider.provider} className="border border-gray-200 rounded-lg p-4 hover:border-orange-200 transition-colors duration-200">
                      <div className="text-sm font-medium text-gray-700 mb-3 flex items-center">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                        {provider.name}
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {provider.models.map((model) => (
                          <button
                            key={model.id}
                            onClick={() => handleSelectModel(provider.provider, model.id)}
                            className={`flex items-center justify-between px-4 py-3 text-sm rounded-lg transition-all duration-200 ${
                              chatSettings.llmProvider === provider.provider && chatSettings.llmModel === model.id
                                ? 'bg-orange-50 text-orange-700 border-2 border-orange-200 shadow-sm'
                                : 'border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300'
                            }`}
                          >
                            <span className="font-medium">{model.name}</span>
                            <div className="flex items-center">
                              {chatSettings.llmProvider === provider.provider && 
                               chatSettings.llmModel === model.id && (
                                <>
                                  <BoltIcon className="h-4 w-4 text-orange-600 mr-1" />
                                  <CheckCircleIcon className="h-5 w-5 text-orange-600" />
                                </>
                              )}
                            </div>
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
        
        <div className="mt-8 flex justify-end space-x-3 border-t border-gray-200 pt-6">
          <Button
            variant="outline"
            onClick={() => setIsSettingsOpen(false)}
            className="border-gray-300 text-gray-700 hover:bg-gray-50"
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
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 flex items-center"
          >
            <BoltIcon className="h-4 w-4 mr-2" />
            {isSaving ? 'Syncing...' : 'Save & Sync All Widgets'}
          </Button>
        </div>
      </Modal>
      
      {/* Enhanced Installation Code Modal */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="Installation Code - Auto-Sync Enabled"
        size="lg"
      >
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 flex items-center">
            <CodeBracketIcon className="h-5 w-5 mr-2 text-orange-600" />
            Enhanced Embed Code for Your Website
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            Copy and paste this code into your website, just before the closing &lt;/body&gt; tag. 
            All settings will be automatically synced from your dashboard:
          </p>
          
          <div className="relative">
            <pre className="bg-gray-900 text-green-400 p-6 rounded-xl overflow-x-auto text-sm font-mono leading-relaxed border border-gray-700" 
                 style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {generateEmbedCode()}
            </pre>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateEmbedCode());
                toast.success('Code copied to clipboard!');
              }}
              className="absolute top-3 right-3 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-lg text-xs font-medium transition-colors duration-200 flex items-center focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
              Copy
            </button>
          </div>
          
          <div className="mt-6 space-y-4">
            <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
              <div className="flex">
                <BoltIcon className="h-5 w-5 text-green-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-green-800">
                    <strong className="font-semibold">Auto-Sync Enabled:</strong> This widget automatically syncs all settings from your dashboard. 
                    Changes you make here will appear on your live website within 30 seconds - no code updates needed!
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg">
              <div className="flex">
                <InformationCircleIcon className="h-5 w-5 text-blue-400 flex-shrink-0" />
                <div className="ml-3">
                  <p className="text-sm text-blue-800">
                    <strong className="font-semibold">Perfect Preview:</strong> This test environment uses the exact same widget code 
                    that will be deployed on your website, ensuring 100% accuracy between what you see here and what your users will experience.
                    All settings, colors, AI responses, and sync behavior work identically on your live site.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            onClick={() => setIsCodeModalOpen(false)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 px-6"
          >
            Close
          </Button>
        </div>
      </Modal>
      
    </div>
  );
};

export default TestChatbotPage;