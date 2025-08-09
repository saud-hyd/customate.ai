// frontend/dashboard/src/pages/knowledge/WebCrawlerPage.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  SparklesIcon, 
  GlobeAltIcon, 
  ChartBarIcon, 
  CogIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import WebCrawlerComponent from '../../components/knowledge/WebCrawlerComponent';
import QuickCrawlerForm from '../../components/knowledge/QuickCrawlerForm';
import CrawlJobsList from '../../components/knowledge/CrawlJobsList';
import knowledgeService from '../../services/knowledgeService';

const WebCrawlerPage = () => {
  const { t } = useTranslation(['knowledge', 'common']);
  const [collections, setCollections] = useState([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [storageStats, setStorageStats] = useState(null);

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

  const handleJobCreated = () => {
    setRefreshTrigger(prev => prev + 1);
    fetchStorageStats(); // Refresh storage stats when new job created
  };

  const getStorageWarning = () => {
    if (!storageStats) return null;
    
    const percentage = storageStats.percentage || 0;
    
    if (percentage >= 85) {
      return {
        type: 'error',
        message: `Storage usage high (${percentage.toFixed(1)}%). Consider deleting old content or upgrading your plan.`
      };
    } else if (percentage >= 70) {
      return {
        type: 'warning',
        message: `Storage usage at ${percentage.toFixed(1)}%. Monitor usage to avoid hitting limits.`
      };
    }
    
    return null;
  };

  const storageWarning = getStorageWarning();

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <SparklesIcon className="h-8 w-8 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-900">{t('knowledge:webCrawlerPage.intelligentWebCrawler')}</h1>
            </div>
            <p className="text-gray-600 max-w-2xl">
              Automatically discover and crawl the most important pages from any website. 
              Our intelligent system analyzes site structure, prioritizes content, and optimizes 
              crawling based on your storage limits.
            </p>
          </div>
          
          {storageStats && (
            <div className="text-right">
              <div className="text-sm text-gray-500 mb-1">{t('knowledge:webCrawlerPage.storageUsage')}</div>
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
      </div>

      {/* Storage Warning */}
      {storageWarning && (
        <div className={`rounded-md p-4 ${
          storageWarning.type === 'error' 
            ? 'bg-red-50 border border-red-200' 
            : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <div className="flex">
            <div className="flex-shrink-0">
              <InformationCircleIcon className={`h-5 w-5 ${
                storageWarning.type === 'error' ? 'text-red-400' : 'text-yellow-400'
              }`} />
            </div>
            <div className="ml-3">
              <p className={`text-sm ${
                storageWarning.type === 'error' ? 'text-red-800' : 'text-yellow-800'
              }`}>
                {storageWarning.message}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Crawler */}
      <QuickCrawlerForm onCrawlComplete={handleJobCreated} />

      {/* How It Works Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <ChartBarIcon className="h-5 w-5 mr-2 text-orange-500" />
          How Intelligent Crawling Works
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center mb-2">
              <div className="bg-blue-100 rounded-full w-8 h-8 flex items-center justify-center text-blue-600 font-bold">1</div>
              <h3 className="font-medium ml-2">{t('knowledge:webCrawlerPage.siteAnalysis')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              We analyze your website's structure, sitemap, and robots.txt to understand the site layout and discover important pages.
            </p>
          </div>
          
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center mb-2">
              <div className="bg-green-100 rounded-full w-8 h-8 flex items-center justify-center text-green-600 font-bold">2</div>
              <h3 className="font-medium ml-2">{t('knowledge:webCrawlerPage.smartPrioritization')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              Pages are prioritized based on importance: homepage, main content sections, and valuable resources are crawled first.
            </p>
          </div>
          
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center mb-2">
              <div className="bg-purple-100 rounded-full w-8 h-8 flex items-center justify-center text-purple-600 font-bold">3</div>
              <h3 className="font-medium ml-2">{t('knowledge:webCrawlerPage.storageOptimization')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              Crawling automatically adjusts to your available storage, ensuring you get the most valuable content within your limits.
            </p>
          </div>
          
          <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
            <div className="flex items-center mb-2">
              <div className="bg-orange-100 rounded-full w-8 h-8 flex items-center justify-center text-orange-600 font-bold">4</div>
              <h3 className="font-medium ml-2">{t('knowledge:webCrawlerPage.realTimeProgress')}</h3>
            </div>
            <p className="text-sm text-gray-600">
              Track crawling progress in real-time with detailed insights into discovered pages and extraction status.
            </p>
          </div>
        </div>
      </div>

      {/* Key Features */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <SparklesIcon className="h-5 w-5 mr-2 text-orange-500" />
          Intelligent Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">🎯 Smart Page Discovery</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic sitemap parsing and analysis</li>
              <li>• Robots.txt compliance and optimization</li>
              <li>• Content-based page type classification</li>
              <li>• Link context analysis for prioritization</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">📊 Storage-Aware Crawling</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Automatic page limit calculation</li>
              <li>• Real-time storage monitoring</li>
              <li>• Prioritized content extraction</li>
              <li>• Efficient resource utilization</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">🚀 Enhanced User Experience</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• No manual configuration required</li>
              <li>• Real-time progress tracking</li>
              <li>• Detailed crawl insights</li>
              <li>• Add specific pages anytime</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-medium text-gray-900 mb-2">⚡ Advanced Content Processing</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Intelligent content extraction</li>
              <li>• Metadata and structured data parsing</li>
              <li>• Automatic knowledge item creation</li>
              <li>• Embedding generation for AI responses</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Advanced Web Crawler */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <CogIcon className="h-5 w-5 mr-2 text-orange-500" />
            Advanced Crawler Settings
          </h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Need more control? Use the advanced crawler to specify custom settings, 
          add specific pages, or use manual configuration for specialized crawling needs.
        </p>
        
        <WebCrawlerComponent 
          collections={collections} 
          onJobCreated={handleJobCreated} 
        />
      </div>

      {/* Crawl Jobs List */}
      <CrawlJobsList refreshTrigger={refreshTrigger} />
    </div>
  );
};

export default WebCrawlerPage;