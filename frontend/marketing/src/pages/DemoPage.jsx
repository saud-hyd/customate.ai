// frontend/marketing/src/pages/DemoPage.jsx
import React, { useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

const DemoPage = () => {
  const { demoId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUrl = searchParams.get('url');
  const apiKey = searchParams.get('key');
  
  const [demoStatus, setDemoStatus] = useState('loading');
  const [iframeError, setIframeError] = useState(false);
  
  // Poll demo status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/demo/status/${demoId}`);
        const data = await response.json();
        setDemoStatus(data.status);
        
        if (data.status === 'ready') {
          clearInterval(statusInterval);
        }
      } catch (error) {
        console.error('Status check failed:', error);
        setDemoStatus('error');
      }
    };
    
    const statusInterval = setInterval(checkStatus, 2000);
    checkStatus(); // Initial check
    
    return () => clearInterval(statusInterval);
  }, [demoId]);

  const widgetUrl = `http://localhost:8000/api/widget/app/?api_key=${apiKey}`;

  if (demoStatus === 'loading' || demoStatus === 'crawling') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Setting up your demo...
          </h2>
          <p className="text-gray-600">
            We're crawling your website to train the chatbot. This usually takes 15-30 seconds.
          </p>
        </div>
      </div>
    );
  }

  if (demoStatus === 'expired' || demoStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {demoStatus === 'expired' ? 'Demo Expired' : 'Demo Error'}
          </h2>
          <p className="text-gray-600 mb-4">
            {demoStatus === 'expired' 
              ? 'This demo session has expired. Please create a new one.'
              : 'There was an error setting up your demo. Please try again.'
            }
          </p>
          <a 
            href="/" 
            className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="demo-container">
      <header className="demo-header bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Chatbot Demo</h1>
            <p className="text-sm text-gray-600">
              Ask questions about the content on {new URL(targetUrl).hostname}
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Demo expires in 30 minutes
          </div>
        </div>
      </header>
      
      <div className="demo-layout" style={{ height: 'calc(100vh - 80px)', display: 'grid', gridTemplateColumns: '1fr 400px' }}>
        <div className="website-panel bg-white">
          <div className="panel-header bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-gray-700">
            Your Website
          </div>
          {!iframeError ? (
            <iframe
              src={targetUrl}
              title="Target Website"
              style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none' }}
              onError={() => setIframeError(true)}
            />
          ) : (
            <div className="p-8 text-center">
              <p className="text-gray-600 mb-4">
                This website cannot be displayed in a frame for security reasons.
              </p>
              <a 
                href={targetUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-orange-500 hover:text-orange-600 underline"
              >
                Open {targetUrl} in new tab →
              </a>
            </div>
          )}
        </div>
        
        <div className="widget-panel bg-white border-l border-gray-200">
          <div className="panel-header bg-gray-50 px-4 py-2 border-b border-gray-200 font-medium text-gray-700">
            AI Chatbot
          </div>
          <iframe
            src={widgetUrl}
            title="Chatbot Widget"
            style={{ width: '100%', height: 'calc(100% - 40px)', border: 'none' }}
          />
        </div>
      </div>
    </div>
  );
};

export default DemoPage;