// frontend/marketing/src/pages/DemoPage.jsx
import React, { useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';

// Real Widget Component - Same as Business Customers
const DemoWidget = ({ widgetUrl }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    // Closed state - chat button (same style as real widget)
    return (
      <div 
        onClick={() => setIsOpen(true)}
        style={{
          width: '60px',
          height: '60px',
          backgroundColor: '#ea580c',
          borderRadius: '50%',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          color: 'white',
          fontSize: '24px',
          transition: 'all 0.3s ease',
          zIndex: 9999
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = 'scale(1.1)';
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = 'scale(1)';
        }}
      >
        💬
      </div>
    );
  }

  // Open state - real widget iframe (same as business customers)
  return (
    <div style={{
      width: '380px',
      height: '600px',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
      backgroundColor: 'white',
      position: 'relative',
      animation: 'slideIn 0.3s ease-out'
    }}>
      {/* Close button overlay */}
      <button
        onClick={() => setIsOpen(false)}
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '32px',
          height: '32px',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          border: 'none',
          borderRadius: '50%',
          cursor: 'pointer',
          zIndex: 10,
          color: '#666',
          fontSize: '20px',
          fontWeight: 'bold',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.target.style.backgroundColor = 'rgba(234, 88, 12, 0.1)';
          e.target.style.color = '#ea580c';
        }}
        onMouseLeave={(e) => {
          e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
          e.target.style.color = '#666';
        }}
      >
        ×
      </button>
      
      {/* Real Widget Iframe - Same as Business Customers */}
      <iframe
        src={widgetUrl}
        title="AI Chatbot Widget"
        style={{ 
          width: '100%', 
          height: '100%', 
          border: 'none',
          borderRadius: '12px'
        }}
        allow="microphone; camera"
      />
    </div>
  );
};

const DemoPage = () => {
  const { demoId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUrl = searchParams.get('url');
  const apiKey = searchParams.get('key');
  
  const [demoStatus, setDemoStatus] = useState('loading');
  const [iframeError, setIframeError] = useState(false);
  
  // Poll demo status with fallback
  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch(`http://localhost:8000/api/demo/status/${demoId}`);
        if (response.ok) {
          const data = await response.json();
          setDemoStatus(data.status);
          
          if (data.status === 'ready') {
            clearInterval(statusInterval);
          }
        } else {
          // If status endpoint fails, assume demo is ready
          // (chatbot will handle API key validation)
          console.log('Status endpoint not found, assuming demo is ready');
          setDemoStatus('ready');
          clearInterval(statusInterval);
        }
      } catch (error) {
        console.log('Status check failed, assuming demo is ready:', error);
        setDemoStatus('ready');
        clearInterval(statusInterval);
      }
    };
    
    const statusInterval = setInterval(checkStatus, 2000);
    checkStatus();
    
    // Auto-fallback after 5 seconds
    setTimeout(() => {
      if (demoStatus === 'loading') {
        setDemoStatus('ready');
        clearInterval(statusInterval);
      }
    }, 5000);
    
    return () => clearInterval(statusInterval);
  }, [demoId, demoStatus]);

  const widgetUrl = `http://localhost:8000/api/widget/app/?api_key=${apiKey}`;

  if (demoStatus === 'loading' || demoStatus === 'crawling') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f9fafb',
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #ea580c',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <h2 style={{ color: '#111827', marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
            Setting up your demo...
          </h2>
          <p style={{ color: '#6b7280', fontSize: '16px' }}>
            We're crawling your website to train the chatbot. This usually takes 15-30 seconds.
          </p>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (demoStatus === 'expired' || demoStatus === 'error') {
    return (
      <div style={{ 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        width: '100vw', 
        height: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        backgroundColor: '#f9fafb',
        zIndex: 9999
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: '#111827', marginBottom: '8px', fontSize: '24px', fontWeight: '600' }}>
            {demoStatus === 'expired' ? 'Demo Expired' : 'Demo Error'}
          </h2>
          <p style={{ color: '#6b7280', marginBottom: '16px', fontSize: '16px' }}>
            {demoStatus === 'expired' 
              ? 'This demo session has expired. Please create a new one.'
              : 'There was an error setting up your demo. Please try again.'
            }
          </p>
          <a 
            href="/" 
            style={{
              backgroundColor: '#ea580c',
              color: 'white',
              padding: '12px 24px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontWeight: '600',
              fontSize: '16px'
            }}
          >
            Try Again
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Hide all other chatbots and feedback buttons */}
      <style>{`
        /* Hide Customate's own chatbot/feedback */
        .feedback-button,
        [class*="feedback"],
        [class*="chat"]:not(.demo-widget),
        [class*="widget"]:not(.demo-widget),
        [id*="chat"]:not(.demo-widget),
        [id*="widget"]:not(.demo-widget),
        div[style*="position: fixed"][style*="bottom"]:not(.demo-widget) {
          display: none !important;
        }
        
        /* Show only our demo widget */
        .demo-widget {
          display: block !important;
        }
        
        /* Slide in animation for widget */
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.9);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        
        /* Ensure no scrollbars on demo */
        body {
          overflow: hidden;
        }
      `}</style>

      {/* Demo Info Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '50px',
        backgroundColor: '#ea580c',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 9998,
        fontSize: '14px',
        fontWeight: '500',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🤖</span>
          <span>Chatbot Demo - Ask questions about {new URL(targetUrl).hostname}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>⏰</span>
          <span>Demo expires in 30 minutes</span>
        </div>
      </div>

      {/* Target Website (Fullscreen) */}
      <div style={{ 
        position: 'fixed',
        top: '50px',  // Account for demo bar
        left: 0,
        width: '100vw',
        height: 'calc(100vh - 50px)',
        overflow: 'hidden'
      }}>
        {!iframeError ? (
          <iframe
            src={targetUrl}
            title="Target Website"
            style={{ 
              width: '100%', 
              height: '100%', 
              border: 'none',
              display: 'block'
            }}
            onError={() => setIframeError(true)}
          />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: '#f9fafb',
            padding: '20px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔒</div>
            <h2 style={{ color: '#111827', marginBottom: '12px', fontSize: '24px', fontWeight: '600' }}>
              Website Cannot Be Displayed
            </h2>
            <p style={{ color: '#6b7280', marginBottom: '20px', fontSize: '16px', maxWidth: '400px' }}>
              This website cannot be displayed in a frame for security reasons. 
              You can still test the chatbot by opening the website in a new tab.
            </p>
            <a 
              href={targetUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{
                backgroundColor: '#ea580c',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                textDecoration: 'none',
                fontWeight: '600',
                fontSize: '16px'
              }}
            >
              Open {new URL(targetUrl).hostname} in new tab →
            </a>
          </div>
        )}
      </div>

      {/* Real Widget - Same as Business Customers */}
      <div 
        className="demo-widget"
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 9999
        }}
      >
        <DemoWidget widgetUrl={widgetUrl} />
      </div>
    </>
  );
};

export default DemoPage;