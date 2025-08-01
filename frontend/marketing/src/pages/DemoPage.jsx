// frontend/marketing/src/pages/DemoPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const DemoPage = () => {
  const { demoId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUrl = searchParams.get('url');
  const apiKey = searchParams.get('key');
  
  const [demoStatus, setDemoStatus] = useState('loading');
  const [iframeError, setIframeError] = useState(false);
  
  // Hide regular marketing chatbot on demo page
  useEffect(() => {
    // Hide any existing marketing chatbots
    const hideMarketingChatbot = () => {
      const marketingChatbot = document.getElementById('customate-widget');
      if (marketingChatbot) {
        marketingChatbot.style.display = 'none';
      }
      
      // Also prevent marketing chatbot scripts from running
      document.body.classList.add('demo-page-no-marketing-chatbot');
    };
    
    hideMarketingChatbot();
    
    // Check periodically in case marketing chatbot loads later
    const interval = setInterval(hideMarketingChatbot, 1000);
    
    return () => {
      clearInterval(interval);
      document.body.classList.remove('demo-page-no-marketing-chatbot');
      // Restore marketing chatbot when leaving demo page
      const marketingChatbot = document.getElementById('customate-widget');
      if (marketingChatbot) {
        marketingChatbot.style.display = '';
      }
    };
  }, []);
  
  // Poll demo status
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
        const response = await fetch(`${API_URL}/api/demo/status/${demoId}`);
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

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
  const widgetUrl = `${API_URL}/api/widget/app/?api_key=${apiKey}&demo=true`;

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

  if (demoStatus === 'expired' || demoStatus === 'error' || demoStatus === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="mb-4">
            {demoStatus === 'expired' ? '⏰' : '❌'}
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            {demoStatus === 'expired' ? 'Demo Expired' : 
             demoStatus === 'failed' ? 'Demo Setup Failed' : 'Demo Error'}
          </h2>
          <p className="text-gray-600 mb-4">
            {demoStatus === 'expired' 
              ? 'This demo session has expired (30 minute limit). Please create a new one.'
              : demoStatus === 'failed'
              ? 'We couldn\'t crawl your website. Please try with a different URL or check if the website is accessible.'
              : 'There was an error setting up your demo. Please try again.'
            }
          </p>
          <div className="space-y-3">
            <a 
              href="/" 
              className="block bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
            >
              Try Another Demo
            </a>
            <a 
              href="/pricing" 
              className="block text-orange-500 hover:text-orange-600 transition-colors"
            >
              Or view our pricing →
            </a>
          </div>
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
       
        </div>
      </header>
      
      {/* Full screen website with floating demo chatbot */}
      <div style={{ height: 'calc(100vh - 80px)', position: 'relative' }}>
        {!iframeError ? (
          <iframe
            src={targetUrl}
            title="Target Website"
            style={{ width: '100%', height: '100%', border: 'none' }}
            onError={() => setIframeError(true)}
          />
        ) : (
          <div className="p-8 text-center h-full flex items-center justify-center">
            <div>
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
          </div>
        )}
        
{/* Demo chatbot floating widget (the one from sidebar) */}
<iframe
  ref={(iframe) => {
    if (iframe) {
      // Set initial collapsed size
      iframe.style.position = 'fixed';
      iframe.style.bottom = '20px';
      iframe.style.right = '20px';
      iframe.style.width = '80px';
      iframe.style.height = '80px';
      iframe.style.border = 'none';
      iframe.style.borderRadius = '50%';
      iframe.style.zIndex = '1000';
      iframe.style.boxShadow = '0 4px 12px rgba(234, 88, 12, 0.3)';
      iframe.style.transition = 'all 0.3s ease';
      
      // Listen for resize messages from widget
      const handleMessage = (event) => {
        // Accept messages from localhost (development)
        if (event.origin.startsWith('http://localhost:') || 
            event.origin.startsWith('http://127.0.0.1:')) {
          
          const { type, data } = event.data || {};
          
          if (type === 'WIDGET_STATUS' || type === 'WIDGET_RESIZE') {
            const expanded = data?.expanded === true;
            
            if (expanded) {
              // Expand to full chat size
              iframe.style.width = '400px';
              iframe.style.height = '620px';
              iframe.style.borderRadius = '12px';
            } else {
              // Collapse to button size
              iframe.style.width = '80px';
              iframe.style.height = '80px';
              iframe.style.borderRadius = '50%';
            }
            
            console.log('Widget resized:', expanded ? 'EXPANDED' : 'COLLAPSED');
          }
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Cleanup listener when component unmounts
      iframe.onunload = () => {
        window.removeEventListener('message', handleMessage);
      };
    }
  }}
  src={widgetUrl}
  title="Demo Chatbot Widget"
/>
      </div>
      
      {/* CSS to hide marketing chatbot */}
      <style jsx>{`
        .demo-page-no-marketing-chatbot #customate-widget {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

export default DemoPage;