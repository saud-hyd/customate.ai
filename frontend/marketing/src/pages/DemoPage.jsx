// frontend/marketing/src/pages/DemoPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const DemoPage = () => {
  const { demoId } = useParams();
  const [searchParams] = useSearchParams();
  const targetUrl = searchParams.get('url');
  const apiKey = searchParams.get('key');
  
  const [demoStatus, setDemoStatus] = useState('loading');

  useEffect(() => {
    console.log('🚀 Demo Page Loading...');
    console.log('Demo ID:', demoId);
    console.log('Target URL:', targetUrl);
    console.log('API Key:', apiKey);

    if (apiKey) {
      // Inject REAL widget script
      const script = document.createElement('script');
      script.src = `http://localhost:8000/api/widget/embed.js?api_key=${apiKey}`;
      script.async = true;
      script.id = 'demo-widget-script';
      
      script.onload = () => {
        console.log('✅ Real widget loaded');
        setDemoStatus('ready');
      };
      
      document.head.appendChild(script);
    }
  }, [demoId, targetUrl, apiKey]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Demo notification bar */}
      <div style={{
        height: '50px',
        background: 'linear-gradient(135deg, #ea580c 0%, #dc2626 100%)',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 999999
      }}>
        🤖 DEMO MODE - AI trained on {targetUrl ? new URL(targetUrl).hostname : 'target website'}
      </div>
      
      {/* Target website */}
      <iframe
        src={targetUrl}
        style={{ 
          flex: 1,
          width: '100%',
          border: 'none'
        }}
        title="Demo Website"
      />
      
      {/* Real widget will inject itself here automatically */}
    </div>
  );
};

export default DemoPage;