// frontend/marketing/src/components/sections/DemoSection.jsx
import React, { useState } from 'react';

const DemoSection = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dynamic backend URL detection
  const getBackendUrl = () => {
    if (process.env.REACT_APP_BACKEND_URL) {
      return process.env.REACT_APP_BACKEND_URL;
    }
    
    // Auto-detect based on current environment
    const currentHost = window.location.hostname;
    if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
      return 'http://localhost:8000';
    } else {
      // Production: assume backend is on same domain
      return window.location.origin.replace(':3000', ':8000');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const backendUrl = getBackendUrl();
      
      const response = await fetch(`${backendUrl}/api/demo/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url })
      });

      if (!response.ok) {
        throw new Error('Failed to create demo');
      }

      const data = await response.json();
      
      // Redirect directly to backend demo viewer (this handles everything)
      window.location.href = `${backendUrl}/api/demo/view?url=${encodeURIComponent(data.target_url)}&session=${data.demo_id}`;
      
    } catch (err) {
      setError('Failed to create demo. Please check the URL and try again.');
      console.error('Demo creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="py-20 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Try Our AI Chatbot on Your Website
        </h2>
        <p className="text-xl text-gray-600 mb-8">
          See how our chatbot works with your actual website content in under 30 seconds
        </p>
        
        <form onSubmit={handleSubmit} className="max-w-md mx-auto">
          <div className="flex flex-col sm:flex-row gap-4">
            <input
              type="url"
              placeholder="Enter your website URL (e.g., https://example.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !url}
              className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Creating Demo...' : 'Try Demo'}
            </button>
          </div>
          
          {error && (
            <p className="text-red-600 text-sm mt-2">{error}</p>
          )}
        </form>
        
        <p className="text-sm text-gray-500 mt-4">
          No signup required • 15 messages limit • Real website analysis
        </p>
      </div>
    </section>
  );
};

export default DemoSection;