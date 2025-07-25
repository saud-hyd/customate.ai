// frontend/dashboard/src/pages/knowledge/WebCrawlerPage.jsx
import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  GlobeAltIcon, 
  PlusIcon,
  TrashIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import CrawlJobsList from '../../components/knowledge/CrawlJobsList';
import knowledgeService from '../../services/knowledgeService';
import { useToast } from '../../context/ToastContext';

const WebCrawler = () => {
  const [url, setUrl] = useState('https://');
  const [specificPages, setSpecificPages] = useState(['']);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [storageStats, setStorageStats] = useState(null);
  
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchCollections();
    fetchStorageStats();
  }, []);

  const fetchCollections = async () => {
    try {
      const response = await knowledgeService.getCollections();
      setCollections(response.collections || []);
    } catch (error) {
      console.error('Error fetching collections:', error);
    }
  };

  const fetchStorageStats = async () => {
    try {
      const response = await knowledgeService.getStorageStats();
      setStorageStats(response);
    } catch (error) {
      console.error('Error fetching storage stats:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url || url === 'https://') {
      showError('Please enter a website URL');
      return;
    }
    
    try {
      setLoading(true);
      
      const crawlData = {
        url,
        collection_id: selectedCollection || undefined,
        intelligent_mode: true, // Always use intelligent mode
        specific_pages: specificPages.filter(page => page.trim() !== '')
      };
      
      const response = await knowledgeService.createCrawlJob(crawlData);
      
      success(`Intelligent crawl started! Discovering ${response.estimated_pages || 'multiple'} pages automatically.`);
      
      // Reset form
      setUrl('https://');
      setSpecificPages(['']);
      
      // Refresh jobs list
      setRefreshTrigger(prev => prev + 1);
      fetchStorageStats();
      
    } catch (err) {
      console.error('Error starting crawl job:', err);
      showError(err.response?.data?.detail || 'Failed to start crawl job');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpecificPage = () => {
    setSpecificPages([...specificPages, 'https://']);
  };

  const handleRemoveSpecificPage = (index) => {
    if (specificPages.length > 1) {
      setSpecificPages(specificPages.filter((_, i) => i !== index));
    } else {
      setSpecificPages(['']);
    }
  };

  const handleSpecificPageChange = (index, value) => {
    const newPages = [...specificPages];
    newPages[index] = value;
    setSpecificPages(newPages);
  };

  const getStorageWarning = () => {
    if (!storageStats) return null;
    
    const percentage = storageStats.percentage || 0;
    
    if (percentage >= 85) {
      return {
        type: 'error',
        message: `Storage usage high (${percentage.toFixed(1)}%). Consider deleting old content or upgrading your plan.`
      };
    }
    
    return null;
  };

  const storageWarning = getStorageWarning();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <SparklesIcon className="h-7 w-7 text-orange-500 mr-2" />
            Intelligent Web Crawler
          </h1>
          <p className="text-gray-600 mt-1">
            Enter a website URL to automatically discover and crawl important pages
          </p>
        </div>
        
        {storageStats && (
          <div className="text-right">
            <div className="text-sm text-gray-500 mb-1">Storage Usage</div>
            <div className="flex items-center space-x-2">
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    storageStats.percentage >= 85 ? 'bg-red-500' :
                    storageStats.percentage >= 70 ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(100, storageStats.percentage)}%` }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900">
                {storageStats.percentage?.toFixed(1)}%
              </span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {storageStats.used_mb?.toFixed(1)}MB / {storageStats.limit_mb}MB
            </div>
          </div>
        )}
      </div>

      {/* Storage Warning */}
      {storageWarning && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-800">{storageWarning.message}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Crawl Form */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Main Website URL */}
          <div>
            <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-2">
              Website URL <span className="text-red-500">*</span>
            </label>
            <div className="flex rounded-md shadow-sm">
              <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500">
                <GlobeAltIcon className="h-5 w-5" />
              </span>
              <input
                type="url"
                id="website-url"
                className="focus:ring-orange-500 focus:border-orange-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              We'll automatically discover and prioritize the most important pages
            </p>
          </div>

          {/* Collection Selection */}
          <div>
            <label htmlFor="collection-select" className="block text-sm font-medium text-gray-700 mb-2">
              Knowledge Collection (Optional)
            </label>
            <select
              id="collection-select"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">Create new collection</option>
              {collections?.map((collection) => (
                <option key={collection.collection_id} value={collection.collection_id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>

          {/* Specific Pages (Optional) */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Specific Pages (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddSpecificPage}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Add Page
              </button>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Add specific pages you want to ensure are crawled first
            </p>
            
            {specificPages.map((page, index) => (
              <div key={index} className="flex mb-2">
                <input
                  type="url"
                  placeholder="https://example.com/specific-page"
                  value={page}
                  onChange={(e) => handleSpecificPageChange(index, e.target.value)}
                  className="flex-1 rounded-l-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSpecificPage(index)}
                  className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md text-gray-400 hover:text-red-500 focus:outline-none focus:ring-orange-500 focus:border-orange-500"
                  disabled={specificPages.length === 1 && page === ''}
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={loading || !url || url === 'https://'}
              className="w-full inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Starting Intelligent Crawl...
                </>
              ) : (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Start Intelligent Crawl
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* How It Works - Simplified */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
          <InformationCircleIcon className="h-4 w-4 mr-1 text-gray-500" />
          How it works
        </h3>
        <p className="text-sm text-gray-600">
          Our intelligent system analyzes your website structure, discovers important pages through sitemaps and navigation, 
          then prioritizes crawling based on content value and your storage limits. No manual configuration needed.
        </p>
      </div>

      {/* Crawl Jobs List */}
      <CrawlJobsList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default WebCrawler;