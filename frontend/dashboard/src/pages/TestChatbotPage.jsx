// frontend/dashboard/src/pages/TestChatbotPage.jsx
import React, { useState, useEffect } from 'react';
import knowledgeService from '../services/knowledgeService';
import WidgetComponent from '../widget/components/WidgetComponent';
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
  // State
  const [activeSettingsTab, setActiveSettingsTab] = useState('appearance');
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [chatSettings, setChatSettings] = useState({
    primaryColor: '#4f46e5',
    chatbotName: 'Customate.AI Assistant',
    widgetPosition: 'bottom-right',
    showTypingIndicator: true,
    enableSuggestions: true,
    apiKey: "12b9d3d5-1aa4-466b-af7d-67c1ab4c4a50", // Use your API key
    apiUrl: 'http://localhost:8000', // Use your backend URL
    // Initial message to show
    greeting: "Hi there! I'm your Customate.AI assistant. How can I help you today?"
  });
  
  const [collections, setCollections] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showCollectionDropdown, setShowCollectionDropdown] = useState(false);
  const [error, setError] = useState(null);
  
  // Fetch collections on component mount
  useEffect(() => {
    fetchCollections();
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
  
  cw('init', '${chatSettings.apiKey}');
</script>`}
                  </pre>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(`<script>
  (function(c,u,s,t,o,m,a,t,e){
    c['CustomateWidget']=o;
    c[o]=c[o]||function(){(c[o].q=c[o].q||[]).push(arguments)};
    c[o].l=1*new Date();a=u.createElement(s);
    t=u.getElementsByTagName(s)[0];a.async=1;a.src=t;
    t.parentNode.insertBefore(a,t)
  })(window,document,'script','https://cdn.customate.ai/widget.js','cw');
  
  cw('init', '${chatSettings.apiKey}');
</script>`);
                      alert('Code copied to clipboard!');
                    }}
                    className="mt-2 text-sm text-indigo-600 hover:text-indigo-500"
                  >
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
            
            {/* Real widget integration */}
            <div className="absolute" style={{ right: '0', bottom: '0', zIndex: 100 }}>
              <WidgetComponent config={chatSettings} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestChatbotPage;