// frontend/dashboard/src/components/knowledge/WebCrawlerComponent.jsx
import React, { useState, useEffect } from 'react';
import { 
  GlobeAltIcon, 
  ArrowPathIcon, 
  CogIcon, 
  CheckCircleIcon, 
  XCircleIcon,
  ClockIcon,
  PlusIcon,
  EyeIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import knowledgeService from '../../services/knowledgeService';
import { useToast } from '../../context/ToastContext';
import CrawlProgressModal from './CrawlProgressModal';

const WebCrawlerComponent = ({ collections, onJobCreated }) => {
  const [url, setUrl] = useState('https://');
  const [selectedCollection, setSelectedCollection] = useState('');
  const [loading, setLoading] = useState(false);
  const [crawlJobs, setCrawlJobs] = useState([]);
  const [refreshingJobs, setRefreshingJobs] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [intelligentMode, setIntelligentMode] = useState(true);
  const [specificPages, setSpecificPages] = useState(['https://']);
  const [showProgress, setShowProgress] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  
  // Manual mode settings (only shown when intelligent mode is off)
  const [maxPages, setMaxPages] = useState(100);
  const [maxDepth, setMaxDepth] = useState(3);
  
  const { success, error: showError } = useToast();

  useEffect(() => {
    fetchCrawlJobs();
  }, []);

  const fetchCrawlJobs = async () => {
    try {
      setRefreshingJobs(true);
      const response = await knowledgeService.getCrawlJobs();
      setCrawlJobs(response.jobs || []);
    } catch (err) {
      console.error('Error fetching crawl jobs:', err);
      showError('Failed to fetch crawl jobs');
    } finally {
      setRefreshingJobs(false);
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
        intelligent_mode: intelligentMode,
        specific_pages: specificPages.filter(page => page.trim() !== '' && page !== 'https://'),
        // Only include manual settings if not in intelligent mode
        ...(intelligentMode ? {} : {
          max_pages: maxPages,
          max_depth: maxDepth
        })
      };
      
      const response = await knowledgeService.createCrawlJob(crawlData);
      
      if (intelligentMode) {
        success(`Intelligent crawl started! Discovering ${response.estimated_pages || 'multiple'} pages automatically.`);
      } else {
        success('Manual crawl job started successfully');
      }
      
      setUrl('https://');
      setSpecificPages(['https://']);
      
      // Refresh jobs list
      await fetchCrawlJobs();
      
      // Notify parent component
      if (onJobCreated) onJobCreated();
      
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
      setSpecificPages(['https://']);
    }
  };

  const handleSpecificPageChange = (index, value) => {
    const newPages = [...specificPages];
    newPages[index] = value;
    setSpecificPages(newPages);
  };

  const handleDeleteJob = async (jobId) => {
    try {
      await knowledgeService.cancelCrawlJob(jobId);
      success('Crawl job deleted successfully');
      await fetchCrawlJobs();
    } catch (err) {
      console.error('Error deleting crawl job:', err);
      showError('Failed to delete job');
      await fetchCrawlJobs();
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            Completed
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="w-4 h-4 mr-1" />
            Failed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ArrowPathIcon className="w-4 h-4 mr-1 animate-spin" />
            In Progress
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="w-4 h-4 mr-1" />
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  const getProgress = (job) => {
    if (!job.max_pages || job.max_pages === 0) return 0;
    return Math.min(100, Math.round((job.pages_crawled / job.max_pages) * 100));
  };

  const formatDomain = (url) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch (e) {
      return url;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6">
      {/* Advanced Crawler Form */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Advanced Web Crawler</h3>
          <div className="flex items-center space-x-4">
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={intelligentMode}
                onChange={(e) => setIntelligentMode(e.target.checked)}
                className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
              />
              <span className="ml-2 text-sm text-gray-700">
                Intelligent Mode
              </span>
            </label>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Website URL */}
          <div>
            <label htmlFor="website-url" className="block text-sm font-medium text-gray-700 mb-1">
              Website URL
            </label>
            <div className="mt-1 flex rounded-md shadow-sm">
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
          </div>

          {/* Collection Selection */}
          <div>
            <label htmlFor="collection-select" className="block text-sm font-medium text-gray-700 mb-1">
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

          {/* Specific Pages Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Specific Pages (Optional)
              </label>
              <button
                type="button"
                onClick={handleAddSpecificPage}
                className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-orange-700 bg-orange-100 hover:bg-orange-200"
              >
                <PlusIcon className="h-3 w-3 mr-1" />
                Add Page
              </button>
            </div>
            
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
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Manual Settings - Only for Manual Mode */}
          {!intelligentMode && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Manual Settings
                </label>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="inline-flex items-center px-2 py-1 border border-transparent text-xs font-medium rounded text-gray-700 bg-gray-100 hover:bg-gray-200"
                >
                  <CogIcon className="h-3 w-3 mr-1" />
                  {showAdvanced ? 'Hide' : 'Show'} Settings
                </button>
              </div>
              
              {showAdvanced && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="max-pages" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Pages
                    </label>
                    <input
                      type="number"
                      id="max-pages"
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      min="1"
                      max="1000"
                      value={maxPages}
                      onChange={(e) => setMaxPages(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <label htmlFor="max-depth" className="block text-sm font-medium text-gray-700 mb-1">
                      Maximum Depth
                    </label>
                    <input
                      type="number"
                      id="max-depth"
                      className="mt-1 focus:ring-orange-500 focus:border-orange-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                      min="1"
                      max="5"
                      value={maxDepth}
                      onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Submit Button */}
          <div className="pt-3">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:w-auto sm:text-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  {intelligentMode ? 'Starting Smart Crawl...' : 'Starting Manual Crawl...'}
                </>
              ) : (
                <>
                  {intelligentMode ? 'Start Smart Crawl' : 'Start Manual Crawl'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Recent Crawl Jobs */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Recent Crawl Jobs</h3>
          <button
            onClick={fetchCrawlJobs}
            className="p-2 rounded-full text-gray-400 hover:text-gray-500"
            disabled={refreshingJobs}
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshingJobs ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {refreshingJobs && crawlJobs.length === 0 ? (
          <div className="text-center py-8">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">Loading crawl jobs...</p>
          </div>
        ) : crawlJobs.length === 0 ? (
          <div className="text-center py-8">
            <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No crawl jobs yet. Start by adding a website URL above.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {crawlJobs.slice(0, 5).map((job) => (
              <div key={job.job_id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="text-sm font-medium text-gray-900">
                          {formatDomain(job.base_url)}
                        </h4>
                        {getStatusBadge(job.status)}
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => {
                            setSelectedJobId(job.job_id);
                            setShowProgress(true);
                          }}
                          className="p-1 rounded-full text-gray-400 hover:text-blue-500"
                          title="View Progress"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteJob(job.job_id)}
                          className="p-1 rounded-full text-gray-400 hover:text-red-500"
                          title="Delete Job"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                      <span>
                        {job.pages_crawled} / {job.max_pages} pages
                        {job.pages_failed > 0 && (
                          <span className="text-red-500 ml-2">
                            ({job.pages_failed} failed)
                          </span>
                        )}
                      </span>
                      <span>
                        {job.completed_at ? formatDate(job.completed_at) : formatDate(job.created_at)}
                      </span>
                    </div>
                    
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          job.status === 'completed' ? 'bg-green-500' : 
                          job.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${getProgress(job)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Crawl Progress Modal */}
      {showProgress && selectedJobId && (
        <CrawlProgressModal
          jobId={selectedJobId}
          onClose={() => {
            setShowProgress(false);
            setSelectedJobId(null);
          }}
        />
      )}
    </div>
  );
};

export default WebCrawlerComponent;