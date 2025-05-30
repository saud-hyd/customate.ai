import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  AdjustmentsHorizontalIcon, 
  CodeBracketIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  BoltIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import clientService from '../services/clientService';
import Button from '../components/common/Button';
import LoadingState from '../components/common/LoadingState';
import Modal from '../components/common/Modal';

const TestChatbotPage = () => {
  // State management
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLlmMenuOpen, setIsLlmMenuOpen] = useState(false);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  
  // Chat settings
  const [chatSettings, setChatSettings] = useState({
    primaryColor: '#ea580c',
    chatbotName: 'AI Assistant',
    widgetPosition: 'bottom-right',
    showTypingIndicator: true,
    enableSuggestions: true,
    apiKey: '',
    greeting: 'Hello! How can I help you today?',
    llmProvider: "deepseek",
    llmModel: "deepseek-chat",
  });
  
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
        { id: 'gpt-4', name: 'GPT-4' }
      ]
    }
  ];

  // Get backend URL
  const getBackendUrl = () => {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
      ? 'http://localhost:8000' 
      : 'https://customate-ai-1.onrender.com';
  };

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        setIsLoading(true);
        
        // Test backend connection
        const backendUrl = getBackendUrl();
        const healthResponse = await fetch(`${backendUrl}/health`);
        if (!healthResponse.ok) {
          throw new Error(`Backend not responding: ${healthResponse.status}`);
        }
        
        // Fetch settings and API key
        await Promise.all([
          fetchCurrentSettings(),
          fetchClientApiKey()
        ]);
        
      } catch (error) {
        console.error('❌ Initialization error:', error);
        setWidgetError(`Initialization failed: ${error.message}`);
        toast.error('Failed to initialize. Please check your backend connection.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeComponent();
  }, []);

  // Fetch current settings
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
        llmProvider: settings.custom_settings?.llm_provider || prev.llmProvider,
        llmModel: settings.custom_settings?.llm_model || prev.llmModel || "deepseek-chat",
      }));
    } catch (err) {
      console.error('❌ Error fetching current settings:', err);
      toast.error('Failed to fetch settings. Using defaults.');
    }
  };
  
  // Fetch client API key
  const fetchClientApiKey = async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      setChatSettings(prev => ({
        ...prev,
        apiKey: clientInfo.api_key
      }));
    } catch (err) {
      console.error('❌ Error fetching client API key:', err);
      toast.error('Failed to fetch API key.');
    }
  };

  // Generate widget URL for testing
  const generateWidgetUrl = () => {
    if (!chatSettings.apiKey) return null;
    
    const backendUrl = getBackendUrl();
    const url = new URL(`${backendUrl}/api/widget/app/`);
    url.searchParams.set('api_key', chatSettings.apiKey);
    url.searchParams.set('inline', 'true');
    url.searchParams.set('test', 'true');
    
    return url.toString();
  };

  // Generate production embed code
  const generateProductionEmbedCode = () => {
    const backendUrl = getBackendUrl().replace('http://localhost:8000', 'https://customate-ai-1.onrender.com');
    
    return `<!-- Customate.ai Widget -->
<div id="customate-widget-container"></div>
<script>
(function() {
    const config = {
        apiKey: '${chatSettings.apiKey}',
        backendUrl: '${backendUrl}'
    };

    function createWidget() {
        const container = document.getElementById('customate-widget-container');
        if (!container) return;

        const iframe = document.createElement('iframe');
        const widgetUrl = new URL(config.backendUrl + '/api/widget/app/');
        widgetUrl.searchParams.set('api_key', config.apiKey);

        iframe.src = widgetUrl.toString();
        iframe.style.cssText = \`
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 350px;
            height: 500px;
            border: none;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.12);
            z-index: 999999;
        \`;
        
        iframe.allow = 'clipboard-write';
        iframe.sandbox = 'allow-scripts allow-same-origin allow-forms allow-popups';
        iframe.title = 'Chat Widget';

        container.appendChild(iframe);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', createWidget);
    } else {
        createWidget();
    }
})();
</script>`;
  };

  // Handle iframe events
  const handleIframeLoad = () => {
    setWidgetLoaded(true);
    setWidgetError(null);
    toast.success('Widget loaded successfully!');
  };

  const handleIframeError = () => {
    setWidgetLoaded(false);
    setWidgetError('Failed to load widget');
    toast.error('Failed to load widget');
  };

  const reloadWidget = () => {
    setWidgetLoaded(false);
    setWidgetError(null);
    setIframeKey(prev => prev + 1);
    toast.info('Reloading widget...');
  };

  // Save settings
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
        custom_settings: {
          llm_provider: chatSettings.llmProvider,
          llm_model: chatSettings.llmModel
        }
      };
      
      await clientService.updateWidgetSettings(settingsToSave);
      reloadWidget();
      toast.success('Settings saved and applied!');
      
    } catch (err) {
      console.error('❌ Error saving settings:', err);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
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

  if (isLoading) {
    return <LoadingState message="Loading chatbot..." />;
  }

  const widgetUrl = generateWidgetUrl();
  const currentProvider = llmOptions.find(p => p.provider === chatSettings.llmProvider);
  const currentModel = currentProvider?.models.find(m => m.id === chatSettings.llmModel);
  const currentModelName = currentModel?.name || 'Default';

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      {/* Header with controls */}
      <div className="bg-white border-b border-gray-200 py-3 px-6 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-4">
          <div className="flex items-center">
            <ChatBubbleLeftRightIcon className="h-6 w-6 text-orange-600 mr-2" />
            <h1 className="text-lg font-semibold text-gray-900">Test Chatbot</h1>
          </div>
          
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            widgetLoaded ? 'bg-green-100 text-green-800' : 
            widgetError ? 'bg-red-100 text-red-800' : 
            'bg-yellow-100 text-yellow-800'
          }`}>
            {widgetLoaded ? '✅ Ready' : widgetError ? '❌ Error' : '🔄 Loading'}
          </div>
          
          {/* LLM Selector */}
          <div className="relative">
            <button
              type="button"
              className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
              onClick={() => setIsLlmMenuOpen(!isLlmMenuOpen)}
            >
              <span className="text-gray-700">
                {chatSettings.llmProvider ? 
                  `${chatSettings.llmProvider}: ${currentModelName}` : 
                  'Select Model'
                }
              </span>
              <ChevronDownIcon className="h-4 w-4 ml-1 text-gray-500" />
            </button>
            
            {isLlmMenuOpen && (
              <div className="absolute left-0 mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-10">
                {llmOptions.map((provider) => (
                  <div key={provider.provider}>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 first:rounded-t-lg">
                      {provider.name}
                    </div>
                    {provider.models.map((model) => (
                      <button
                        key={model.id}
                        onClick={() => handleSelectModel(provider.provider, model.id)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${
                          chatSettings.llmProvider === provider.provider && chatSettings.llmModel === model.id
                            ? 'bg-orange-50 text-orange-700'
                            : 'text-gray-700'
                        }`}
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
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={reloadWidget}
            className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Reload
          </button>
          
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <AdjustmentsHorizontalIcon className="h-4 w-4 mr-1" />
            Settings
          </button>
          
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            Get Code
          </button>
          
          <button
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`flex items-center px-4 py-1.5 text-sm rounded-lg text-white ${
              isSaving 
                ? 'bg-orange-400 cursor-not-allowed' 
                : 'bg-orange-600 hover:bg-orange-700'
            }`}
          >
            {isSaving ? (
              <>
                <svg className="animate-spin -ml-1 mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Saving...
              </>
            ) : (
              <>
                <BoltIcon className="h-4 w-4 mr-1" />
                Save
              </>
            )}
          </button>
        </div>
      </div>
      
      {/* Chat interface - Full screen */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md h-full max-h-[700px] bg-white rounded-lg shadow-lg overflow-hidden">
          {!widgetUrl || !chatSettings.apiKey ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : widgetError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-red-500 mb-4">❌ {widgetError}</div>
              <button
                onClick={reloadWidget}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
              >
                Try Again
              </button>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              src={widgetUrl}
              width="100%"
              height="100%"
              frameBorder="0"
              allow="clipboard-write"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              title="Test Widget"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              className="w-full h-full"
            />
          )}
        </div>
      </div>
      
      {/* Settings Modal */}
      <Modal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        title="Widget Settings"
        size="lg"
      >
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Primary Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                type="color"
                value={chatSettings.primaryColor}
                onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                className="h-10 w-16 rounded border-2 border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={chatSettings.primaryColor}
                onChange={(e) => handleSettingChange('primaryColor', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded text-sm w-32"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Chatbot Name
            </label>
            <input
              type="text"
              value={chatSettings.chatbotName}
              onChange={(e) => handleSettingChange('chatbotName', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Welcome Message
            </label>
            <textarea
              value={chatSettings.greeting}
              onChange={(e) => handleSettingChange('greeting', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Widget Position
            </label>
            <select
              value={chatSettings.widgetPosition}
              onChange={(e) => handleSettingChange('widgetPosition', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm"
            >
              <option value="bottom-right">Bottom Right</option>
              <option value="bottom-left">Bottom Left</option>
              <option value="top-right">Top Right</option>
              <option value="top-left">Top Left</option>
            </select>
          </div>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">
                Show typing indicator
              </label>
              <input
                type="checkbox"
                checked={chatSettings.showTypingIndicator}
                onChange={(e) => handleSettingChange('showTypingIndicator', e.target.checked)}
                className="h-4 w-4 text-orange-600 rounded"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-gray-900">
                Enable suggestions
              </label>
              <input
                type="checkbox"
                checked={chatSettings.enableSuggestions}
                onChange={(e) => handleSettingChange('enableSuggestions', e.target.checked)}
                className="h-4 w-4 text-orange-600 rounded"
              />
            </div>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end space-x-3">
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
            Save Settings
          </Button>
        </div>
      </Modal>
      
      {/* Code Modal */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="Widget Embed Code"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-auto max-h-80">
            <pre className="text-sm whitespace-pre-wrap">{generateProductionEmbedCode()}</pre>
          </div>
          
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">
              Copy and paste this code before the closing &lt;/body&gt; tag.
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(generateProductionEmbedCode());
                toast.success('Code copied to clipboard!');
              }}
              className="flex items-center px-3 py-2 bg-orange-600 text-white rounded text-sm hover:bg-orange-700"
            >
              <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
              Copy Code
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TestChatbotPage;