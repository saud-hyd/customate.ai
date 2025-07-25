import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  CodeBracketIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftRightIcon,
  CheckIcon
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
        
        // Fetch API key
        await fetchClientApiKey();
        
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

  // Fetch client API key
  const fetchClientApiKey = async () => {
    try {
      const clientInfo = await clientService.getClientInfo();
      setApiKey(clientInfo.api_key);
    } catch (err) {
      console.error('❌ Error fetching client API key:', err);
      toast.error('Failed to fetch API key.');
    }
  };

  // Generate widget URL for testing
  const generateWidgetUrl = () => {
    if (!apiKey) return null;
    
    const backendUrl = getBackendUrl();
    const url = new URL(`${backendUrl}/api/widget/app/`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('inline', 'true');
    url.searchParams.set('test', 'true');
    
    return url.toString();
  };

  // Get universal embed code
  const getUniversalEmbedCode = () => {
    const backendUrl = getBackendUrl().replace('http://localhost:8000', 'https://customate-ai-1.onrender.com');
    return `<script async src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>`;
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

  if (isLoading) {
    return <LoadingState message="Loading chatbot..." />;
  }

  const widgetUrl = generateWidgetUrl();
  const embedCode = getUniversalEmbedCode();

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-gray-50">
      {/* Simple Header */}
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
            onClick={() => setIsCodeModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
          >
            <CodeBracketIcon className="w-5 h-5" />
            Get Embed Code
          </button>
        </div>
      </div>
      
      {/* Widget Testing Area */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md h-full max-h-[700px] bg-white rounded-lg shadow-lg overflow-hidden">
          {!widgetUrl || !apiKey ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading widget...</div>
            </div>
          ) : widgetError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-red-500 mb-4 text-lg">❌ {widgetError}</div>
              <button
                onClick={reloadWidget}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
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