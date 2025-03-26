import React, { useState, useEffect } from 'react';
import knowledgeService from '../../services/knowledgeService';
import { useToast } from '../../context/ToastContext';
import WebCrawlerComponent from '../../components/knowledge/WebCrawlerComponent';
import CrawlJobsList from '../../components/knowledge/CrawlJobsList';

// Import icons from Heroicons v2
import { GlobeAltIcon, LinkIcon } from '@heroicons/react/24/outline';

const WebCrawlerPage = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { error: showError } = useToast();

  // Fetch collections on mount
  useEffect(() => {
    fetchCollections();
  }, []);

  const fetchCollections = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await knowledgeService.getCollections();
      setCollections(data);
    } catch (err) {
      console.error('Error fetching collections:', err);
      setError('Failed to load collections. Please try again later.');
      showError('Failed to load collections');
    } finally {
      setLoading(false);
    }
  };

  const handleJobCreated = () => {
    // Trigger refresh of jobs list
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex items-center">
          <div className="flex-shrink-0 p-3 bg-indigo-100 rounded-md">
            <GlobeAltIcon className="h-6 w-6 text-indigo-600" />
          </div>
          <div className="ml-4">
            <h1 className="text-2xl font-bold text-gray-900">Website Crawler</h1>
            <p className="mt-1 text-sm text-gray-500">
              Automatically extract content from websites and add it to your knowledge base.
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* How it works section */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center text-indigo-600 font-bold">1</div>
              <h3 className="font-medium ml-2">Enter Website URL</h3>
            </div>
            <p className="text-sm text-gray-600">
              Provide the URL of the website you want to crawl. The crawler will start from this page.
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center text-indigo-600 font-bold">2</div>
              <h3 className="font-medium ml-2">Crawl Process</h3>
            </div>
            <p className="text-sm text-gray-600">
              Our system automatically follows links, extracts content, and organizes it into knowledge items.
            </p>
          </div>
          
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center mb-2">
              <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center text-indigo-600 font-bold">3</div>
              <h3 className="font-medium ml-2">Use in Chatbot</h3>
            </div>
            <p className="text-sm text-gray-600">
              Once crawling is complete, the content is available for your chatbot to use in responses.
            </p>
          </div>
        </div>
      </div>

      {/* Web Crawler Form */}
      <WebCrawlerComponent 
        collections={collections} 
        onJobCreated={handleJobCreated} 
      />

      {/* Crawl Jobs List */}
      <CrawlJobsList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default WebCrawlerPage;