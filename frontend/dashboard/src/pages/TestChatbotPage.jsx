import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { RadioGroup } from '@headlessui/react';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { 
  SwatchIcon, 
  Cog6ToothIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  InformationCircleIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import knowledgeService from '../services/knowledgeService';
import clientService from '../services/clientService';
import WidgetComponent from '../widget/components/WidgetComponent';

const TestChatbotPage = () => {
  // State
  const [activeSettingsTab, setActiveSettingsTab] = useState('appearance');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatSettings, setChatSettings] = useState({
    primaryColor: '#4f46e5',
    chatbotName: 'Customate.AI Assistant',
    widgetPosition: 'bottom-right',
    showTypingIndicator: true,
    enableSuggestions: true,
    resetOnPageRefresh: true,
    sessionTimeout: 30,
    apiKey: "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50", // Default API key (will be replaced)
    apiUrl: 'http://localhost:8000', // Backend URL
    // Initial message to show
    greeting: "Hi there! I'm your Customate.AI assistant. How can I help you today?",
    // LLM settings
    llmProvider: "deepseek",
    llmModel: null
  });
  
  // LLM options for selection
  const llmOptions = [
    { 
      provider: 'deepseek', 
      name: 'DeepSeek', 
      models: [
        { id: 'deepseek-chat', name: 'DeepSeek Chat' }
      ]
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
  
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch collections and settings on component mount
  useEffect(() => {
    fetchCollections();
    fetchCurrentSettings();
    fetchClientApiKey();
  }, []);
  
  const fetchCollections = async () => {
    try {
      const data = await knowledgeService.getCollections();
      setCollections(data);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load knowledge collections');
    }
  };
  
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
        // Load LLM settings
        llmProvider: settings.llm_provider || prev.llmProvider,
        llmModel: settings.llm_model || prev.llmModel
      }));
    } catch (err) {
      console.error('Error fetching current settings:', err);
      // Continue with default settings
    }
  };
  
  const fetchClientApiKey = async () => {
    try {
      // Get the client's real API key
      const clientInfo = await clientService.getClientInfo();
      
      setChatSettings(prev => ({
        ...prev,
        apiKey: clientInfo.api_key // Use the real API key
      }));
    } catch (err) {
      console.error('Error fetching client API key:', err);
      // Continue with default key if there's an error
    }
  };
  
  const handleSelectCollection = (collection) => {
    setSelectedCollection(collection);
    setShowCollectionDropdown(false);
    
    // Update widget settings with collection
    if (collection) {
      setChatSettings(prev => ({
        ...prev,
        selectedCollection: collection.collection_id,
        customData: {
          ...prev.customData,
          collectionId: collection.collection_id
        }
      }));
    } else {
      // Remove collection selection
      setChatSettings(prev => {
        const newSettings = {...prev};
        delete newSettings.selectedCollection;
        delete newSettings.customData?.collectionId;
        return newSettings;
      });
    }
  };
  
  // Function to handle settings changes
  const handleSettingChange = (setting, value) => {
    setChatSettings(prev => ({
      ...prev,
      [setting]: value
    }));
  };
  
  // Handler for LLM provider change
  const handleLlmProviderChange = (provider) => {
    setChatSettings(prev => ({
      ...prev,
      llmProvider: provider,
      // Reset model when provider changes
      llmModel: null
    }));
  };

  // Handler for LLM model change
  const handleLlmModelChange = (model) => {
    setChatSettings(prev => ({
      ...prev,
      llmModel: model
    }));
  };
  
  // Save settings
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
        reset_on_page_refresh: chatSettings.resetOnPageRefresh,
        session_timeout: chatSettings.sessionTimeout,
        custom_settings: {
          llm_provider: chatSettings.llmProvider,
          llm_model: chatSettings.llmModel
        }
      };
      
      console.log("Saving settings:", settingsToSave); // Add this debug line
      
      await clientService.updateWidgetSettings(settingsToSave);
      
      toast.success('Chatbot settings saved successfully!');
    } catch (err) {
      console.error('Error saving settings:', err);
      toast.error('Failed to save chatbot settings');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Reset chat
  const handleResetChat = () => {
    setChatSettings(prev => ({
      ...prev,
      resetSession: true, // Signal to widget to reset session
    }));
    
    // Remove the flag after a short delay
    setTimeout(() => {
      setChatSettings(prev => {
        const newSettings = {...prev};
        delete newSettings.resetSession;
        return newSettings;
      });
    }, 100);
  };
  
  return (
    <div className="mb-12">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Test Your Chatbot</h2>
        <div className="flex space-x-3">
          {/* Collection selector dropdown */}
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
          
          <button 
            onClick={handleSaveSettings}
            disabled={isSaving}
            className={`${
              isSaving ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
            } text-white px-4 py-2 rounded-md flex items-center`}
          >
            <Cog6ToothIcon className="h-5 w-5 mr-2" />
            {isSaving ? 'Saving...' : 'Save Changes'}
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
                onClick={() => setActiveSettingsTab('llm')}
                className={`${
                  activeSettingsTab === 'llm'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
              >
                <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                LLM Settings
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
                
                {/* Session behavior settings */}
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

            {/* LLM Settings tab */}
            {activeSettingsTab === 'llm' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-4">LLM Provider</h4>
                  <RadioGroup value={chatSettings.llmProvider} onChange={handleLlmProviderChange}>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {llmOptions.map((option) => (
                        <RadioGroup.Option
                          key={option.provider}
                          value={option.provider}
                          className={({ checked }) => `
                            ${checked ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200'}
                            relative border rounded-lg p-4 flex cursor-pointer focus:outline-none
                          `}
                        >
                          {({ checked }) => (
                            <>
                              <div className="flex items-center justify-between w-full">
                                <div className="flex items-center">
                                  <div className="text-sm">
                                    <RadioGroup.Label
                                      as="p"
                                      className={`font-medium ${
                                        checked ? 'text-indigo-900' : 'text-gray-900'
                                      }`}
                                    >
                                      {option.name}
                                    </RadioGroup.Label>
                                  </div>
                                </div>
                                {checked && (
                                  <div className="flex-shrink-0 text-indigo-500">
                                    <CheckCircleIcon className="h-5 w-5" />
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </RadioGroup.Option>
                      ))}
                    </div>
                  </RadioGroup>
                </div>
                
                {/* Show model options for selected provider */}
                {chatSettings.llmProvider && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-4">Model</h4>
                    <RadioGroup 
                      value={chatSettings.llmModel} 
                      onChange={handleLlmModelChange}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {llmOptions
                          .find(opt => opt.provider === chatSettings.llmProvider)
                          ?.models.map((model) => (
                            <RadioGroup.Option
                              key={model.id}
                              value={model.id}
                              className={({ checked }) => `
                                ${checked ? 'bg-indigo-50 border-indigo-500' : 'bg-white border-gray-200'}
                                relative border rounded-lg p-3 flex cursor-pointer focus:outline-none
                              `}
                            >
                              {({ checked }) => (
                                <>
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center">
                                      <div className="text-sm">
                                        <RadioGroup.Label
                                          as="p"
                                          className={`font-medium ${
                                            checked ? 'text-indigo-900' : 'text-gray-900'
                                          }`}
                                        >
                                          {model.name}
                                        </RadioGroup.Label>
                                      </div>
                                    </div>
                                    {checked && (
                                      <div className="flex-shrink-0 text-indigo-500">
                                        <CheckCircleIcon className="h-5 w-5" />
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                            </RadioGroup.Option>
                          ))}
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Description of LLM options */}
                <div className="bg-blue-50 rounded-md p-4 mt-4">
                  <h4 className="text-sm font-medium text-blue-800 mb-2">About LLM Settings</h4>
                  <p className="text-sm text-blue-700">
                    Select the LLM (Large Language Model) provider and specific model to use for your chatbot. 
                    Each provider has different capabilities and pricing. Your selection here will be used for all 
                    interactions with your chatbot.
                  </p>
                  <div className="mt-3 text-xs text-blue-600">
                    <p>• DeepSeek: Default model with good performance for general queries</p>
                    <p>• OpenAI: Offers GPT models with strong reasoning capabilities</p>
                    <p>• Claude: Anthropic's models with excellent conversation and instruction-following abilities</p>
                  </div>
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
                
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-gray-700 mb-2">Installation Code</h3>
                  <p className="text-xs text-gray-500 mb-3">
                    Copy and paste this code into your website, just before the closing &lt;/body&gt; tag:
                  </p>
                  <pre className="bg-gray-100 p-3 text-xs text-gray-800 rounded overflow-x-auto whitespace-pre-wrap">
{`<!-- Customate.ai Chat Widget -->
<script>
  (function(c,u,s,t,o,m,a,t,e){
    c['CustomateWidget']=o;
    c[o]=c[o]||function(){(c[o].q=c[o].q||[]).push(arguments)};
    c[o].l=1*new Date();a=u.createElement(s);
    t=u.getElementsByTagName(s)[0];a.async=1;a.src=t;
    t.parentNode.insertBefore(a,t)
  })(window,document,'script','https://cdn.customate.ai/widget.js','cw');
  
  cw('init', '${chatSettings.apiKey}', {
    primaryColor: '${chatSettings.primaryColor}',
    position: '${chatSettings.widgetPosition}',
    chatbotName: '${chatSettings.chatbotName}',
    showTypingIndicator: ${chatSettings.showTypingIndicator},
    enableSuggestions: ${chatSettings.enableSuggestions},
    resetOnPageRefresh: ${chatSettings.resetOnPageRefresh},
    sessionTimeout: ${chatSettings.sessionTimeout}${chatSettings.customData?.collectionId ? `,
    customData: {
      collectionId: '${chatSettings.customData.collectionId}'${chatSettings.llmProvider ? `,
      llmProvider: '${chatSettings.llmProvider}'` : ''}${chatSettings.llmModel ? `,
      llmModel: '${chatSettings.llmModel}'` : ''}
    }` : chatSettings.llmProvider ? `,
    customData: {
      llmProvider: '${chatSettings.llmProvider}'${chatSettings.llmModel ? `,
      llmModel: '${chatSettings.llmModel}'` : ''}
    }` : ''}
  });
</script>`}
                  </pre>
                  
                  <button 
                    onClick={() => {
                      const embedCode = `<!-- Customate.ai Chat Widget -->
<script>
  (function(c,u,s,t,o,m,a,t,e){
    c['CustomateWidget']=o;
    c[o]=c[o]||function(){(c[o].q=c[o].q||[]).push(arguments)};
    c[o].l=1*new Date();a=u.createElement(s);
    t=u.getElementsByTagName(s)[0];a.async=1;a.src=t;
    t.parentNode.insertBefore(a,t)
  })(window,document,'script','https://cdn.customate.ai/widget.js','cw');
  
  cw('init', '${chatSettings.apiKey}', {
    primaryColor: '${chatSettings.primaryColor}',
    position: '${chatSettings.widgetPosition}',
    chatbotName: '${chatSettings.chatbotName}',
    showTypingIndicator: ${chatSettings.showTypingIndicator},
    enableSuggestions: ${chatSettings.enableSuggestions},
    resetOnPageRefresh: ${chatSettings.resetOnPageRefresh},
    sessionTimeout: ${chatSettings.sessionTimeout}${chatSettings.customData?.collectionId ? `,
    customData: {
      collectionId: '${chatSettings.customData.collectionId}'${chatSettings.llmProvider ? `,
      llmProvider: '${chatSettings.llmProvider}'` : ''}${chatSettings.llmModel ? `,
      llmModel: '${chatSettings.llmModel}'` : ''}
    }` : chatSettings.llmProvider ? `,
    customData: {
      llmProvider: '${chatSettings.llmProvider}'${chatSettings.llmModel ? `,
      llmModel: '${chatSettings.llmModel}'` : ''}
    }` : ''}
  });
</script>`;
                      navigator.clipboard.writeText(embedCode);
                      toast.success('Code copied to clipboard!');
                    }}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
                  >
                    <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                    Copy to clipboard
                  </button>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-400">
                  <h3 className="text-sm font-medium text-yellow-800 mb-2">Production Deployment</h3>
                  <p className="text-xs text-yellow-700">
                    This widget uses your actual API key. When deploying to production, ensure:
                  </p>
                  <ul className="list-disc ml-5 mt-1 text-xs text-yellow-700 space-y-1">
                    <li>Your subscription has adequate capacity for your traffic</li>
                    <li>Your knowledge base includes only production-ready content</li>
                    <li>You've thoroughly tested the widget's behavior with your users</li>
                  </ul>
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
            
            {/* Real widget integration */}
            <div className="absolute" style={{ right: '0', bottom: '0', zIndex: 100 }}>
              <WidgetComponent config={{
                ...chatSettings,
                // Make sure LLM settings are passed through
                customData: {
                  ...chatSettings.customData,
                  llmProvider: chatSettings.llmProvider,
                  llmModel: chatSettings.llmModel
                }
              }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestChatbotPage;