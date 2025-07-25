// frontend/dashboard/src/components/knowledge/QuickCrawlerForm.jsx
import React, { useState } from 'react';
import { GlobeAltIcon, SparklesIcon } from '@heroicons/react/24/outline';
import knowledgeService from '../../services/knowledgeService';
import { useToast } from '../../context/ToastContext';

const QuickCrawlerForm = ({ onCrawlComplete }) => {
  const [url, setUrl] = useState('https://');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url || url === 'https://') {
      error('Please enter a website URL');
      return;
    }
    
    try {
      setIsLoading(true);
      
      const response = await knowledgeService.createCrawlJob({
        url,
        intelligent_mode: true, // Always use intelligent mode for quick crawling
        specific_pages: []
      });
      
      success(`Smart crawl started! Automatically discovering ${response.estimated_pages || 'multiple'} pages.`);
      
      setUrl('https://');
      
      if (onCrawlComplete) {
        onCrawlComplete(response);
      }
    } catch (err) {
      console.error('Error starting crawler:', err);
      error(err.response?.data?.detail || 'Failed to start web crawler');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-red-50 rounded-lg border border-orange-200">
      <h3 className="text-md font-medium flex items-center text-gray-900 mb-2">
        <GlobeAltIcon className="h-5 w-5 mr-2 text-orange-500" />
        Quick Smart Crawl
        <SparklesIcon className="h-4 w-4 ml-2 text-orange-400" />
      </h3>
      
      <p className="text-sm text-gray-600 mb-3">
        Enter a website URL and we'll automatically discover and crawl the most important pages.
      </p>
      
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !url || url === 'https://'}
          className="rounded-r-md border border-transparent px-4 py-2 bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Starting...' : 'Start Crawl'}
        </button>
      </form>
    </div>
  );
};

export default QuickCrawlerForm;