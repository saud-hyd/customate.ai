import React, { useState } from 'react';
import { GlobeAltIcon } from '@heroicons/react/24/outline';
import knowledgeService from '../../services/knowledgeService';
import { useToast } from '../../context/ToastContext';

const QuickCrawlerForm = ({ onCrawlComplete }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { success, error } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url) {
      error('URL is required');
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await knowledgeService.createCrawlJob({
        url,
        max_pages: 100,
        max_depth: 3
      });
      success('Web crawler job started successfully');
      setUrl('');
      
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
    <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h3 className="text-md font-medium flex items-center text-gray-900 mb-2">
        <GlobeAltIcon className="h-5 w-5 mr-2 text-indigo-500" />
        Crawl Website
      </h3>
      <form onSubmit={handleSubmit} className="flex">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com"
          className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
          required
        />
        <button
          type="submit"
          disabled={isLoading || !url}
          className="rounded-r-md border border-transparent px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Starting...' : 'Start Crawler'}
        </button>
      </form>
      <p className="mt-1 text-xs text-gray-500">
        Enter a website URL to automatically extract content and add it to your knowledge base.
      </p>
    </div>
  );
};

export default QuickCrawlerForm;