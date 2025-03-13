// frontend/dashboard/src/pages/chat/ChatPage.jsx
import React, { useState } from 'react';
import ChatInterface from '../../components/chat/ChatInterface';
import { Tabs, TabList, Tab, TabPanel } from 'react-tabs';
import { CodeBracketIcon, ChatBubbleLeftRightIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import 'react-tabs/style/react-tabs.css';

const ChatPage = () => {
  const [activeTab, setActiveTab] = useState(0);
  
  // Generate embed code based on API key
  const generateEmbedCode = () => {
    const apiKey = localStorage.getItem('apiKey') || 'YOUR_API_KEY';
    
    return `
<!-- Customate.ai Chatbot Widget -->
<script>
  window.customateConfig = {
    apiKey: '${apiKey}',
    position: 'bottom-right', // 'bottom-right', 'bottom-left', 'top-right', 'top-left'
    primaryColor: '#4f46e5'
  };
</script>
<script src="https://cdn.customate.ai/widget.js" async></script>
    `.trim();
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Test Chatbot</h1>
        <p className="mt-1 text-sm text-gray-500">
          Test your chatbot and customize its appearance before deploying to your website.
        </p>
      </div>

      {/* Main content */}
      <div className="bg-white shadow-sm sm:rounded-lg p-4 sm:p-6">
        <Tabs
          selectedIndex={activeTab}
          onSelect={index => setActiveTab(index)}
          className="border-b border-gray-200"
        >
          <TabList className="flex space-x-4 mb-4">
            <Tab 
              className="font-medium text-sm py-2 px-1 cursor-pointer border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              selectedClassName="text-primary-600 border-primary-500"
            >
              <div className="flex items-center">
                <ChatBubbleLeftRightIcon className="h-5 w-5 mr-2" />
                Chat Preview
              </div>
            </Tab>
            <Tab 
              className="font-medium text-sm py-2 px-1 cursor-pointer border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              selectedClassName="text-primary-600 border-primary-500"
            >
              <div className="flex items-center">
                <DevicePhoneMobileIcon className="h-5 w-5 mr-2" />
                Mobile Preview
              </div>
            </Tab>
            <Tab 
              className="font-medium text-sm py-2 px-1 cursor-pointer border-b-2 border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              selectedClassName="text-primary-600 border-primary-500"
            >
              <div className="flex items-center">
                <CodeBracketIcon className="h-5 w-5 mr-2" />
                Installation
              </div>
            </Tab>
          </TabList>

          <TabPanel>
            <div className="h-[600px] bg-gray-50 p-4 rounded-lg">
              <ChatInterface />
            </div>
          </TabPanel>
          
          <TabPanel>
            <div className="flex justify-center p-4 bg-gray-50 rounded-lg">
              <div className="w-[375px] h-[600px] border-8 border-gray-900 rounded-3xl overflow-hidden relative">
                <div className="absolute top-0 w-full h-6 bg-gray-900 flex justify-center">
                  <div className="w-20 h-4 bg-gray-800 rounded-b-xl"></div>
                </div>
                <div className="h-full pt-6">
                  <ChatInterface />
                </div>
              </div>
            </div>
          </TabPanel>
          
          <TabPanel>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Install on your website</h3>
              
              <p className="text-sm text-gray-600 mb-4">
                Copy and paste this code snippet into your website's HTML, just before the closing <code className="bg-gray-100 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag:
              </p>
              
              <div className="relative">
                <pre className="bg-gray-800 text-white p-4 rounded-lg overflow-x-auto text-sm">
                  {generateEmbedCode()}
                </pre>
                
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generateEmbedCode());
                    alert('Code copied to clipboard!');
                  }}
                  className="absolute top-2 right-2 bg-gray-700 hover:bg-gray-600 text-white px-2 py-1 rounded text-xs"
                >
                  Copy
                </button>
              </div>
              
              <div className="mt-6 bg-yellow-50 border-l-4 border-yellow-400 p-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700">
                      <strong>Note:</strong> The chatbot widget is currently connected to your test API key. Make sure to update the API key when moving to production.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </TabPanel>
        </Tabs>
      </div>
    </div>
  );
};

export default ChatPage;