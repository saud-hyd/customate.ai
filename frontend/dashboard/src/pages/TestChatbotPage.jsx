import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { 
  CodeBracketIcon, 
  ArrowPathIcon,
  DocumentDuplicateIcon,
  ChatBubbleLeftRightIcon,
  SparklesIcon,
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
  const [selectedFramework, setSelectedFramework] = useState('html');

  // Framework configurations
  const frameworks = [
    {
      id: 'html',
      name: 'HTML/JavaScript',
      icon: '🌐',
      description: 'Pure HTML with vanilla JavaScript',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      id: 'react',
      name: 'React',
      icon: '⚛️',
      description: 'React components and hooks',
      color: 'bg-blue-100 text-blue-800 border-blue-200'
    },
    {
      id: 'nextjs',
      name: 'Next.js',
      icon: '▲',
      description: 'Next.js with SSR support',
      color: 'bg-gray-100 text-gray-800 border-gray-200'
    },
    {
      id: 'vue',
      name: 'Vue.js',
      icon: '💚',
      description: 'Vue 3 composition API',
      color: 'bg-green-100 text-green-800 border-green-200'
    },
    {
      id: 'angular',
      name: 'Angular',
      icon: '🅰️',
      description: 'Angular components',
      color: 'bg-red-100 text-red-800 border-red-200'
    },
    {
      id: 'svelte',
      name: 'Svelte',
      icon: '🧡',
      description: 'Svelte components',
      color: 'bg-orange-100 text-orange-800 border-orange-200'
    },
    {
      id: 'wordpress',
      name: 'WordPress',
      icon: '📝',
      description: 'WordPress themes/plugins',
      color: 'bg-indigo-100 text-indigo-800 border-indigo-200'
    },
    {
      id: 'shopify',
      name: 'Shopify',
      icon: '🛒',
      description: 'Shopify liquid templates',
      color: 'bg-purple-100 text-purple-800 border-purple-200'
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

  // Generate framework-specific embed codes
  const generateEmbedCode = (frameworkId) => {
    const backendUrl = getBackendUrl().replace('http://localhost:8000', 'https://customate-ai-1.onrender.com');
    
    const codes = {
      html: {
        title: 'HTML/JavaScript - Script Tag',
        code: `<script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>`,
        instructions: [
          'Copy the script tag above',
          'Paste it before the closing </body> tag in your HTML file',
          'Save and refresh your website',
          'Orange chat icon appears automatically!'
        ],
        example: `<!DOCTYPE html>
<html>
<head>
    <title>My Website</title>
</head>
<body>
    <h1>Welcome!</h1>
    
    <!-- Add widget with this one line -->
    <script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>
</body>
</html>`
      },

      react: {
        title: 'React - Choose Your Method',
        code: `// Method 1: NPM Package (Recommended)
npm install @customate/react-widget

import { CustomateWidget } from '@customate/react-widget';

<CustomateWidget apiKey="${apiKey}" />

// Method 2: Script Tag
useEffect(() => {
  const script = document.createElement('script');
  script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
  document.body.appendChild(script);
}, []);`,
        instructions: [
          'Choose Method 1 (NPM) for better React integration',
          'Or use Method 2 (Script) for quick setup',
          'NPM package provides React hooks and better TypeScript support',
          'Script method works with any React setup'
        ],
        example: `// Method 1: NPM Package
import React from 'react';
import { CustomateWidget, useCustomateWidget } from '@customate/react-widget';

function App() {
  const widget = useCustomateWidget();
  
  return (
    <div className="App">
      <h1>My React App</h1>
      <button onClick={() => widget.expand()}>Open Chat</button>
      <CustomateWidget apiKey="${apiKey}" />
    </div>
  );
}

// Method 2: Script Tag
import React, { useEffect } from 'react';

function App() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
    document.body.appendChild(script);
  }, []);

  return (
    <div className="App">
      <h1>My React App</h1>
    </div>
  );
}`
      },

      nextjs: {
        title: 'Next.js - Script Component',
        code: `import Script from 'next/script';

<Script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}" />`,
        instructions: [
          'Import Script from next/script',
          'Add the Script component to your layout or page',
          'Handles SSR automatically',
          'Optimized loading with Next.js Script component'
        ],
        example: `import Script from 'next/script';

export default function Layout({ children }) {
  return (
    <>
      {children}
      <Script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}" />
    </>
  );
}`
      },

      vue: {
        title: 'Vue.js - Choose Your Method',
        code: `// Method 1: NPM Package (Coming Soon)
npm install @customate/vue-widget

import { CustomateWidget } from '@customate/vue-widget';
// <CustomateWidget :api-key="${apiKey}" />

// Method 2: Composition API (Current)
import { onMounted } from 'vue';

onMounted(() => {
  const script = document.createElement('script');
  script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
  document.body.appendChild(script);
});`,
        instructions: [
          'Use Method 2 (Composition API) for current Vue integration',
          'Method 1 (NPM package) will be available soon',
          'Works with Vue 2 (Options API) and Vue 3 (Composition API)',
          'Compatible with Nuxt.js and other Vue frameworks'
        ],
        example: `// Vue 3 Composition API
<template>
  <div>
    <h1>My Vue App</h1>
    <button @click="openChat">Open Chat</button>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';

onMounted(() => {
  const script = document.createElement('script');
  script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
  document.body.appendChild(script);
});

const openChat = () => {
  if (window.customateWidget) {
    window.customateWidget.expand();
  }
};
</script>

// Vue 2 Options API
<script>
export default {
  mounted() {
    const script = document.createElement('script');
    script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
    document.body.appendChild(script);
  }
}
</script>`
      },

      angular: {
        title: 'Angular - ngOnInit',
        code: `ngOnInit() {
  const script = document.createElement('script');
  script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
  document.body.appendChild(script);
}`,
        instructions: [
          'Add to ngOnInit() in your AppComponent',
          'Import OnInit from @angular/core',
          'Widget loads when Angular app initializes',
          'Compatible with all Angular versions'
        ],
        example: `import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html'
})
export class AppComponent implements OnInit {
  ngOnInit() {
    const script = document.createElement('script');
    script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
    document.body.appendChild(script);
  }
}`
      },

      svelte: {
        title: 'Svelte - onMount',
        code: `import { onMount } from 'svelte';

onMount(() => {
  const script = document.createElement('script');
  script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
  document.body.appendChild(script);
});`,
        instructions: [
          'Import onMount from svelte',
          'Add to your main App.svelte component',
          'Widget loads when Svelte app mounts',
          'Works with SvelteKit and standalone Svelte'
        ],
        example: `<script>
  import { onMount } from 'svelte';
  
  onMount(() => {
    const script = document.createElement('script');
    script.src = '${backendUrl}/api/widget/embed.js?api_key=${apiKey}';
    document.body.appendChild(script);
  });
</script>

<main>
  <h1>My Svelte App</h1>
</main>`
      },

      wordpress: {
        title: 'WordPress - Theme Functions',
        code: `add_action('wp_footer', function() {
    echo '<script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>';
});`,
        instructions: [
          'Add to your theme\'s functions.php file',
          'Or use a plugin to add the script to footer',
          'Widget appears on all pages automatically',
          'Compatible with all WordPress themes'
        ],
        example: `// Add to functions.php
function add_customate_widget() {
    echo '<script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>';
}
add_action('wp_footer', 'add_customate_widget');`
      },

      shopify: {
        title: 'Shopify - Liquid Template',
        code: `<script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>`,
        instructions: [
          'Add to your theme.liquid file before </body>',
          'Or add to specific page templates',
          'Widget appears on all pages where included',
          'Works with all Shopify themes'
        ],
        example: `<!-- In theme.liquid before </body> -->
{{ content_for_layout }}

<script src="${backendUrl}/api/widget/embed.js?api_key=${apiKey}"></script>
</body>
</html>`
      }
    };

    return codes[frameworkId] || codes.html;
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

  // Copy embed code to clipboard
  const copyEmbedCode = () => {
    const codeData = generateEmbedCode(selectedFramework);
    navigator.clipboard.writeText(codeData.code);
    toast.success(`✨ ${codeData.title} copied to clipboard!`);
  };

  if (isLoading) {
    return <LoadingState message="Loading chatbot..." />;
  }

  const widgetUrl = generateWidgetUrl();
  const currentFramework = frameworks.find(f => f.id === selectedFramework);
  const codeData = generateEmbedCode(selectedFramework);

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

          {/* Current Framework Display */}
          {currentFramework && (
            <div className={`flex items-center px-3 py-1 rounded-lg text-sm border ${currentFramework.color}`}>
              <span className="mr-1">{currentFramework.icon}</span>
              {currentFramework.name}
            </div>
          )}

          {/* Show API Key preview for debugging */}
          {apiKey && (
            <div className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded">
              API: {apiKey.substring(0, 8)}...
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={reloadWidget}
            className="flex items-center px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowPathIcon className="h-4 w-4 mr-1" />
            Reload
          </button>
          
          <button
            onClick={() => setIsCodeModalOpen(true)}
            className="flex items-center px-4 py-1.5 text-sm rounded-lg text-white bg-orange-600 hover:bg-orange-700 transition-colors shadow-sm"
          >
            <CodeBracketIcon className="h-4 w-4 mr-1" />
            Get Code
          </button>
        </div>
      </div>
      
      {/* Chat interface - Full screen */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md h-full max-h-[700px] bg-white rounded-lg shadow-lg overflow-hidden">
          {!widgetUrl || !apiKey ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500">Loading...</div>
            </div>
          ) : widgetError ? (
            <div className="flex flex-col items-center justify-center h-full p-8 text-center">
              <div className="text-red-500 mb-4">❌ {widgetError}</div>
              <button
                onClick={reloadWidget}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
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
      
      {/* Universal Framework Code Modal */}
      <Modal
        isOpen={isCodeModalOpen}
        onClose={() => setIsCodeModalOpen(false)}
        title="🚀 Universal Widget Integration"
        size="2xl"
      >
        <div className="space-y-6">
          {/* Hero Section */}
          <div className="text-center bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-200">
            <SparklesIcon className="h-8 w-8 text-orange-600 mx-auto mb-3" />
            <h3 className="text-xl font-bold text-orange-800 mb-2">One Line for Every Framework!</h3>
            <p className="text-orange-700">
              Choose your framework below and get the perfect integration code
            </p>
          </div>

          {/* Framework Selector */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {frameworks.map((framework) => (
              <button
                key={framework.id}
                onClick={() => setSelectedFramework(framework.id)}
                className={`p-3 rounded-lg border-2 transition-all text-sm font-medium ${
                  selectedFramework === framework.id
                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                <div className="text-lg mb-1">{framework.icon}</div>
                <div className="font-semibold">{framework.name}</div>
              </button>
            ))}
          </div>

          {/* Selected Framework Code */}
          <div className="bg-gray-900 text-green-400 rounded-lg border border-gray-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{currentFramework?.icon}</span>
                <span className="text-white font-medium">{codeData.title}</span>
              </div>
              <button
                onClick={copyEmbedCode}
                className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 transition-colors"
              >
                <DocumentDuplicateIcon className="h-4 w-4 mr-1" />
                Copy
              </button>
            </div>
            
            {/* Code */}
            <div className="p-4">
              <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap">
                {codeData.code}
              </pre>
            </div>
          </div>

          {/* Instructions and Example */}
          <div className="grid md:grid-cols-2 gap-4">
            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center">
                📋 Installation Steps
              </h4>
              <ol className="list-decimal list-inside text-blue-700 text-sm space-y-2">
                {codeData.instructions.map((instruction, index) => (
                  <li key={index} className="flex items-start">
                    <span className="flex-1">{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
            
            {/* Features */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-semibold text-green-800 mb-3 flex items-center">
                ✨ What You Get
              </h4>
              <ul className="list-none text-green-700 text-sm space-y-2">
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                  🎯 Orange chat icon appears
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                  🖱️ Click to expand/collapse
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                  📱 Mobile responsive design
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                  🔄 Real-time settings sync
                </li>
                <li className="flex items-center">
                  <CheckIcon className="h-4 w-4 mr-2 text-green-600" />
                  ⚡ Streaming AI responses
                </li>
              </ul>
            </div>
          </div>

          {/* Example Code */}
          {codeData.example && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="font-semibold text-gray-800 mb-3">
                📄 Complete Example:
              </h4>
              <pre className="text-xs text-gray-600 overflow-x-auto bg-white p-3 rounded border font-mono">
                {codeData.example}
              </pre>
            </div>
          )}

          {/* Quick Copy All Button */}
          <div className="flex justify-center pt-4 border-t">
            <button
              onClick={copyEmbedCode}
              className="flex items-center px-6 py-3 bg-orange-600 text-white rounded-lg text-base font-medium hover:bg-orange-700 transition-colors shadow-lg"
            >
              <DocumentDuplicateIcon className="h-5 w-5 mr-2" />
              Copy {currentFramework?.name} Code
            </button>
          </div>

          {/* Footer */}
          <div className="text-center text-sm text-gray-500 border-t pt-4">
            <p>🚀 Works with all modern browsers and framework versions</p>
            <p>🛡️ Secure, fast, and automatically syncs with your dashboard</p>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TestChatbotPage;