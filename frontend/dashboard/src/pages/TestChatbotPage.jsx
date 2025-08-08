import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { 
  CodeBracketIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon,
  SwatchIcon,
  ChatBubbleOvalLeftEllipsisIcon,
  PaintBrushIcon
} from '@heroicons/react/24/outline';
import clientService from '../services/clientService';
import LoadingState from '../components/common/LoadingState';
import Modal from '../components/common/Modal';

const TestChatbotPage = () => {
  // State management
  const [isCodeModalOpen, setIsCodeModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [widgetLoaded, setWidgetLoaded] = useState(false);
  const [widgetError, setWidgetError] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [copied, setCopied] = useState(false);
  
  // Widget customization state - separate preview and applied settings
  const [appliedCustomizations, setAppliedCustomizations] = useState({
    primaryColor: '#ea580c',
    greetingMessage: 'Hello! How can I help you today?',
    chatbotName: 'AI Assistant',
    headerColor: '#ea580c',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '8',
    fontFamily: 'system-ui'
  });
  
  const [previewCustomizations, setPreviewCustomizations] = useState({
    primaryColor: '#ea580c',
    greetingMessage: 'Hello! How can I help you today?',
    chatbotName: 'AI Assistant',
    headerColor: '#ea580c',
    backgroundColor: '#ffffff',
    textColor: '#1f2937',
    borderRadius: '8',
    fontFamily: 'system-ui'
  });
  
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const iframeRef = useRef(null);
  const updateTimeoutRef = useRef(null);

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
        console.log('🚀 Starting TestChatbotPage initialization...');
        setIsLoading(true);
        
        // Test backend connection
        const backendUrl = getBackendUrl();
        console.log('🔧 Testing backend connection to:', backendUrl);
        
        try {
          const healthResponse = await fetch(`${backendUrl}/health`, { 
            timeout: 10000,
            headers: {
              'Accept': 'application/json',
            }
          });
          
          if (!healthResponse.ok) {
            throw new Error(`Backend not responding: ${healthResponse.status}`);
          }
          
          const healthData = await healthResponse.json();
          console.log('✅ Backend health check passed:', healthData);
        } catch (healthError) {
          console.warn('⚠️ Backend health check failed, but continuing:', healthError.message);
          // Don't throw here - let's try to continue and see if widget works anyway
        }
        
        // Fetch API key
        console.log('🔑 Fetching API key...');
        await fetchClientApiKey();
        console.log('✅ Initialization completed');
        
      } catch (error) {
        console.error('❌ Initialization error:', error);
        setWidgetError(`Initialization failed: ${error.message}`);
        toast.error('Failed to initialize. Please check your backend connection.');
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeComponent();
    
    // Cleanup timeout on unmount
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, []);

  // Fetch client API key
  const fetchClientApiKey = async () => {
    try {
      console.log('🔧 Requesting client info from service...');
      const clientInfo = await clientService.getClientInfo();
      console.log('✅ Client info received:', { api_key: clientInfo.api_key ? `${clientInfo.api_key.slice(0, 8)}...` : 'none' });
      setApiKey(clientInfo.api_key);
      
      if (!clientInfo.api_key) {
        throw new Error('No API key found in client info');
      }
    } catch (err) {
      console.error('❌ Error fetching client API key:', err);
      toast.error('Failed to fetch API key.');
      throw err; // Re-throw to be caught by initialization
    }
  };

  // Generate widget URL for testing with customizations
  const generateWidgetUrl = () => {
    if (!apiKey) {
      console.log('❌ No API key available for widget URL');
      return null;
    }
    
    const backendUrl = getBackendUrl();
    console.log('🔧 Backend URL:', backendUrl);
    
    try {
      const url = new URL(`${backendUrl}/api/widget/app/`);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('inline', 'true');
      url.searchParams.set('test', 'true');
      
      // Add customization parameters (use preview settings for real-time preview)
      url.searchParams.set('primary_color', previewCustomizations.primaryColor);
      url.searchParams.set('greeting_message', previewCustomizations.greetingMessage);
      url.searchParams.set('chatbot_name', previewCustomizations.chatbotName);
      url.searchParams.set('header_color', previewCustomizations.headerColor);
      url.searchParams.set('background_color', previewCustomizations.backgroundColor);
      url.searchParams.set('text_color', previewCustomizations.textColor);
      url.searchParams.set('border_radius', previewCustomizations.borderRadius);
      url.searchParams.set('font_family', previewCustomizations.fontFamily);
      
      const finalUrl = url.toString();
      console.log('🔗 Generated widget URL:', finalUrl);
      return finalUrl;
    } catch (error) {
      console.error('❌ Error generating widget URL:', error);
      return null;
    }
  };
  
  // Update preview customization with smooth real-time preview
  const updateCustomization = (key, value) => {
    setPreviewCustomizations(prev => {
      const newPreview = { ...prev, [key]: value };
      
      // Check if changes differ from applied settings
      const hasChanges = JSON.stringify(newPreview) !== JSON.stringify(appliedCustomizations);
      setHasUnsavedChanges(hasChanges);
      
      // Send update to widget via postMessage for smooth updates without reload
      if (iframeRef.current) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'UPDATE_CUSTOMIZATION',
            data: {
              key: key,
              value: value,
              allSettings: newPreview
            }
          }, '*');
        } catch (error) {
          console.warn('Could not send customization update to widget:', error);
          // Fallback to iframe reload if postMessage fails
          if (updateTimeoutRef.current) {
            clearTimeout(updateTimeoutRef.current);
          }
          updateTimeoutRef.current = setTimeout(() => {
            setIframeKey(prevKey => prevKey + 1);
          }, 500);
        }
      }
      
      return newPreview;
    });
  };
  
  // Save changes (widget is already showing preview, just update applied state)
  const saveChanges = () => {
    setAppliedCustomizations({ ...previewCustomizations });
    setHasUnsavedChanges(false);
    
    // No need to reload widget - it's already showing the current preview
    toast.success('Changes saved! Your widget is now using these settings.');
  };

  // Get universal embed code with customizations
  const getUniversalEmbedCode = () => {
    const backendUrl = getBackendUrl().replace('http://localhost:8000', 'https://customate-ai-1.onrender.com');
    const params = new URLSearchParams({
      api_key: apiKey,
      primary_color: appliedCustomizations.primaryColor,
      greeting_message: appliedCustomizations.greetingMessage,
      chatbot_name: appliedCustomizations.chatbotName,
      header_color: appliedCustomizations.headerColor,
      background_color: appliedCustomizations.backgroundColor,
      text_color: appliedCustomizations.textColor,
      border_radius: appliedCustomizations.borderRadius,
      font_family: appliedCustomizations.fontFamily
    });
    return `<script async src="${backendUrl}/api/widget/embed.js?${params.toString()}"></script>`;
  };

  // Copy to clipboard
  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Embed code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy embed code');
    }
  };

  // Handle iframe events
  const handleIframeLoad = () => {
    console.log('✅ Widget iframe loaded successfully');
    setWidgetLoaded(true);
    setWidgetError(null);
    toast.success('Widget loaded successfully!');
  };

  const handleIframeError = (error) => {
    console.error('❌ Widget iframe load error:', error);
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

  // Widget URL updates with preview changes for real-time preview
  const widgetUrl = generateWidgetUrl();
  // Embed code only reflects saved changes  
  const embedCode = getUniversalEmbedCode();

  if (isLoading) {
    return <LoadingState message="Loading chatbot..." />;
  }

  return (
    <div className="h-screen overflow-hidden flex bg-gray-50">
      {/* Customization Panel - Left Side */}
      <div className="w-80 bg-white border-r border-gray-200 flex flex-col shadow-sm">
        {/* Panel Header */}
        <div className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-gray-200 p-4">
          <div className="flex items-center">
            <PaintBrushIcon className="h-5 w-5 text-orange-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Widget Styling</h2>
          </div>
          <p className="text-sm text-gray-600 mt-1">Customize your chatbot appearance</p>
        </div>
        
        {/* Customization Options */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          {/* Colors Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <SwatchIcon className="h-4 w-4 text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-900">Colors</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewCustomizations.primaryColor}
                    onChange={(e) => updateCustomization('primaryColor', e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={previewCustomizations.primaryColor}
                    onChange={(e) => updateCustomization('primaryColor', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="#ea580c"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Header Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewCustomizations.headerColor}
                    onChange={(e) => updateCustomization('headerColor', e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={previewCustomizations.headerColor}
                    onChange={(e) => updateCustomization('headerColor', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="#ea580c"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewCustomizations.backgroundColor}
                    onChange={(e) => updateCustomization('backgroundColor', e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={previewCustomizations.backgroundColor}
                    onChange={(e) => updateCustomization('backgroundColor', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="#ffffff"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Text Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={previewCustomizations.textColor}
                    onChange={(e) => updateCustomization('textColor', e.target.value)}
                    className="w-8 h-8 rounded border border-gray-300"
                  />
                  <input
                    type="text"
                    value={previewCustomizations.textColor}
                    onChange={(e) => updateCustomization('textColor', e.target.value)}
                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                    placeholder="#1f2937"
                  />
                </div>
              </div>
            </div>
          </div>
          
          {/* Content Section */}
          <div className="space-y-4">
            <div className="flex items-center">
              <ChatBubbleOvalLeftEllipsisIcon className="h-4 w-4 text-gray-500 mr-2" />
              <h3 className="text-sm font-medium text-gray-900">Content</h3>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Chatbot Name</label>
                <input
                  type="text"
                  value={previewCustomizations.chatbotName}
                  onChange={(e) => updateCustomization('chatbotName', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="AI Assistant"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Greeting Message</label>
                <textarea
                  value={previewCustomizations.greetingMessage}
                  onChange={(e) => updateCustomization('greetingMessage', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                  rows="2"
                  placeholder="Hello! How can I help you today?"
                />
              </div>
            </div>
          </div>
          
          {/* Styling Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-gray-900">Styling</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Border Radius (px)</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={previewCustomizations.borderRadius}
                  onChange={(e) => updateCustomization('borderRadius', e.target.value)}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0</span>
                  <span>{previewCustomizations.borderRadius}px</span>
                  <span>20</span>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Font Family</label>
                <select
                  value={previewCustomizations.fontFamily}
                  onChange={(e) => updateCustomization('fontFamily', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="system-ui">System UI</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="Open Sans">Open Sans</option>
                  <option value="Montserrat">Montserrat</option>
                  <option value="Poppins">Poppins</option>
                </select>
              </div>
            </div>
          </div>
        </div>
        
      </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 py-4 px-6 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <ChatBubbleLeftRightIcon className="h-6 w-6 text-orange-600 mr-2" />
              <h1 className="text-xl font-semibold text-gray-900">Test Your Chatbot</h1>
            </div>
            
            <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              widgetLoaded ? 'bg-green-100 text-green-800' : 
              widgetError ? 'bg-red-100 text-red-800' : 
              'bg-yellow-100 text-yellow-800'
            }`}>
              {widgetLoaded ? '✅ Ready' : widgetError ? '❌ Error' : '🔄 Loading'}
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={reloadWidget}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Reload Widget
            </button>
            
            <button
              onClick={saveChanges}
              disabled={!hasUnsavedChanges}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors font-medium ${
                hasUnsavedChanges 
                  ? 'bg-green-600 text-white hover:bg-green-700' 
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              <CheckIcon className="w-4 h-4" />
              {hasUnsavedChanges ? 'Save Changes' : 'No Changes'}
            </button>
            
            <button
              onClick={() => setIsCodeModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
            >
              <CodeBracketIcon className="w-5 h-5" />
              Get Embed Code
            </button>
          </div>
        </div>
        
        {/* Widget Testing Area */}
        <div className="flex-1 flex items-center justify-center p-6" style={{ height: 'calc(100vh - 80px)' }}>
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg overflow-hidden" style={{ height: 'calc(100vh - 160px)', maxHeight: '700px' }}>
            {!widgetUrl || !apiKey ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="text-gray-500 mb-4">Loading widget...</div>
                {widgetError && (
                  <div className="text-red-500 text-sm mb-4">
                    Error: {widgetError}
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  Checking backend connection and fetching API key...
                </div>
              </div>
            ) : widgetError && !widgetUrl ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <div className="text-red-500 mb-4 text-lg">❌ {widgetError}</div>
                <button
                  onClick={reloadWidget}
                  className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
                >
                  Try Again
                </button>
                <div className="text-xs text-gray-400 mt-4">
                  Tip: Make sure the backend is running on http://localhost:8000
                </div>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
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
      </div>
      
      {/* Simple Embed Code Modal */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="Widget Embed Code"
        size="lg"
      >
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="text-center py-6 bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              🚀 One Line. Every Website.
            </h2>
            <p className="text-gray-600">
              Copy this code and paste it into any website
            </p>
          </div>

          {/* The Universal Code */}
          <div className="bg-gray-900 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Universal Embed Code
              </h3>
              <button
                onClick={() => copyToClipboard(embedCode)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-orange-600 hover:bg-orange-700 text-white'
                }`}
              >
                {copied ? (
                  <span className="flex items-center gap-2">
                    <CheckIcon className="w-4 h-4" />
                    Copied!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <DocumentDuplicateIcon className="w-4 h-4" />
                    Copy Code
                  </span>
                )}
              </button>
            </div>
            
            <div className="bg-black/30 rounded-lg p-4 font-mono text-sm text-green-400 overflow-x-auto">
              <code>{embedCode}</code>
            </div>
          </div>

          {/* Simple Instructions */}
          <div className="bg-blue-50 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-3">
              📋 How to Install
            </h3>
            <ol className="space-y-2 text-blue-800">
              <li className="flex items-start gap-2">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">1</span>
                <span>Copy the code above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">2</span>
                <span>Paste it before the closing <code className="bg-blue-200 px-1 rounded">&lt;/body&gt;</code> tag</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">3</span>
                <span>Save and refresh - widget appears automatically! 🎉</span>
              </li>
            </ol>
          </div>

          {/* Works Everywhere */}
          <div className="bg-green-50 rounded-lg p-6">
            <h3 className="font-semibold text-green-900 mb-4">
              ✅ Works on Every Platform
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: 'HTML', icon: '🌐' },
                { name: 'React', icon: '⚛️' },
                { name: 'Vue.js', icon: '💚' },
                { name: 'Angular', icon: '🅰️' },
                { name: 'Next.js', icon: '▲' },
                { name: 'WordPress', icon: '📝' },
                { name: 'Shopify', icon: '🛒' },
                { name: 'Any Site', icon: '🚀' }
              ].map((platform) => (
                <div key={platform.name} className="flex items-center gap-2 p-2 bg-white rounded border">
                  <span className="text-lg">{platform.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{platform.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Copy Button */}
          <div className="flex justify-center pt-4 border-t">
            <button
              onClick={() => copyToClipboard(embedCode)}
              className="flex items-center gap-2 px-8 py-3 bg-orange-600 text-white rounded-lg text-lg font-medium hover:bg-orange-700 transition-colors shadow-lg"
            >
              <DocumentDuplicateIcon className="w-5 h-5" />
              Copy Embed Code
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TestChatbotPage;