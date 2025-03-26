// frontend/dashboard/src/components/knowledge/WebsiteCrawler.jsx
import React, { useState, useEffect } from 'react';
import knowledgeService from '../../services/knowledgeService';
import { useToast } from '../../context/ToastContext';
import {
  GlobeAltIcon,
  TrashIcon,
  PlayIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon
} from '@heroicons/react/24/outline';

const WebsiteCrawler = ({ collections, onCrawlComplete }) => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState('');
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [crawlJobs, setCrawlJobs] = useState([]);
  const [refreshingJobs, setRefreshingJobs] = useState(false);
  const [advancedOptions, setAdvancedOptions] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  // Array of hidden job IDs stored in state
  const [hiddenJobIds, setHiddenJobIds] = useState(() => {
    // Initialize from localStorage if available
    const saved = localStorage.getItem('hiddenCrawlJobs');
    return saved ? JSON.parse(saved) : [];
  });
  
  const { success, error: showError } = useToast();
  
  // Effect to load hidden jobs from localStorage when component mounts
  useEffect(() => {
    const savedHiddenJobs = localStorage.getItem('hiddenCrawlJobs');
    if (savedHiddenJobs) {
      setHiddenJobIds(JSON.parse(savedHiddenJobs));
    }
    fetchCrawlJobs();
  }, []);
  
  const fetchCrawlJobs = async () => {
    try {
      setRefreshingJobs(true);
      const response = await knowledgeService.getCrawlJobs();
      // Filter out jobs that have been marked as hidden
      const allJobs = response.jobs || response;
      const filteredJobs = allJobs.filter(job => !hiddenJobIds.includes(job.job_id));
      setCrawlJobs(filteredJobs);
    } catch (err) {
      console.error('Error fetching crawl jobs:', err);
      if (showError) showError('Failed to load crawl jobs');
    } finally {
      setRefreshingJobs(false);
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!url) {
      if (showError) showError('Please enter a website URL');
      return;
    }
    
    try {
      setLoading(true);
      
      const crawlData = {
        url,
        collection_id: selectedCollection || undefined,
        max_pages: maxPages,
        max_depth: maxDepth
      };
      
      await knowledgeService.createCrawlJob(crawlData);
      success('Website crawl job started');
      setUrl('');
      
      // Refresh jobs list
      await fetchCrawlJobs();
      
      // Notify parent component
      if (onCrawlComplete) onCrawlComplete();
      
    } catch (err) {
      console.error('Error starting crawl job:', err);
      if (showError) showError('Failed to start crawl job');
    } finally {
      setLoading(false);
    }
  };
  
  const handleDeleteJob = async (jobId) => {
    try {
      const jobToDelete = crawlJobs.find(job => job.job_id === jobId);
      const isActive = jobToDelete?.status === 'pending' || jobToDelete?.status === 'in_progress';
      
      // Remove from UI first
      setCrawlJobs(prevJobs => prevJobs.filter(job => job.job_id !== jobId));
      
      if (isActive) {
        // For active jobs, cancel via API
        await knowledgeService.cancelCrawlJob(jobId);
        success('Crawl job cancelled successfully');
        
        // Refresh job list after cancellation
        await fetchCrawlJobs();
      } else {
        // For completed jobs, add to hidden list in localStorage
        const updatedHiddenJobs = [...hiddenJobIds, jobId];
        setHiddenJobIds(updatedHiddenJobs);
        
        // Store in localStorage for persistence
        localStorage.setItem('hiddenCrawlJobs', JSON.stringify(updatedHiddenJobs));
        
        success('Crawl job removed from list');
      }
    } catch (err) {
      console.error('Error deleting/cancelling crawl job:', err);
      
      // Restore the job in the UI if there was an error
      await fetchCrawlJobs();
      
      if (showError) {
        if (err.response && err.response.status === 400) {
          showError('This job cannot be deleted. Only active jobs can be cancelled.');
        } else {
          showError('Failed to delete job');
        }
      }
    }
  };
  
  const handleRetryJob = async (jobId) => {
    try {
      await knowledgeService.retryCrawlJob(jobId);
      success('Crawl job restarted');
      await fetchCrawlJobs();
    } catch (err) {
      console.error('Error retrying crawl job:', err);
      if (showError) showError('Failed to retry crawl job');
    }
  };
  
  const getStatusBadge = (status) => {
    switch(status) {
      case 'completed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            Completed
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <ArrowPathIcon className="mr-1 h-4 w-4 animate-spin" />
            In Progress
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="mr-1 h-4 w-4" />
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircleIcon className="mr-1 h-4 w-4" />
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <XCircleIcon className="mr-1 h-4 w-4" />
            Cancelled
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
  
  const getProgressBar = (job) => {
    if (job.status !== 'in_progress' && job.status !== 'pending') return null;
    
    const progress = job.pages_crawled > 0 
      ? Math.min(100, Math.round((job.pages_crawled / job.max_pages) * 100))
      : 0;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };
  
  // Format domain from URL
  const formatDomain = (url) => {
    try {
      const domain = new URL(url).hostname;
      return domain;
    } catch (e) {
      return url;
    }
  };
  
  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  return (
    <div className="space-y-6">
      {/* URL Input Form */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Crawl Website</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
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
                className="focus:ring-indigo-500 focus:border-indigo-500 flex-1 block w-full rounded-none rounded-r-md sm:text-sm border-gray-300"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                required
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Enter the website URL you want to crawl and add to your knowledge base.
            </p>
          </div>
          
          <div>
            <label htmlFor="collection" className="block text-sm font-medium text-gray-700 mb-1">
              Knowledge Collection (Optional)
            </label>
            <select
              id="collection"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              value={selectedCollection}
              onChange={(e) => setSelectedCollection(e.target.value)}
            >
              <option value="">Create new collection</option>
              {collections.map((collection) => (
                <option key={collection.collection_id} value={collection.collection_id}>
                  {collection.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <button
              type="button"
              className="text-sm text-indigo-600 hover:text-indigo-500 flex items-center"
              onClick={() => setAdvancedOptions(!advancedOptions)}
            >
              {advancedOptions ? 'Hide' : 'Show'} Advanced Options
            </button>
          </div>
          
          {advancedOptions && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="max-pages" className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum Pages
                </label>
                <input
                  type="number"
                  id="max-pages"
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
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
                  className="mt-1 focus:ring-indigo-500 focus:border-indigo-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                  min="1"
                  max="5"
                  value={maxDepth}
                  onChange={(e) => setMaxDepth(parseInt(e.target.value))}
                />
              </div>
            </div>
          )}
          
          <div className="pt-3">
            <button
              type="submit"
              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
              disabled={loading}
            >
              {loading ? (
                <>
                  <ArrowPathIcon className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                  Starting Crawl...
                </>
              ) : (
                <>Start Crawling</>
              )}
            </button>
          </div>
        </form>
      </div>
      
      {/* Crawl Jobs List */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">Crawl Jobs</h3>
          <button
            onClick={fetchCrawlJobs}
            className="p-2 rounded-full text-gray-400 hover:text-gray-500"
            disabled={refreshingJobs}
          >
            <ArrowPathIcon className={`h-5 w-5 ${refreshingJobs ? 'animate-spin' : ''}`} />
          </button>
        </div>
        
        {refreshingJobs && crawlJobs.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mx-auto"></div>
            <p className="mt-2 text-sm">Loading crawl jobs...</p>
          </div>
        ) : crawlJobs.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <GlobeAltIcon className="h-12 w-12 mx-auto text-gray-400" />
            <p className="mt-2 text-sm">No website crawl jobs yet</p>
            <p className="text-sm">Enter a website URL above to start crawling</p>
          </div>
        ) : (
          <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Website</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Progress</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {crawlJobs.map((job) => (
                  <tr key={job.job_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {formatDomain(job.base_url)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {getStatusBadge(job.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="text-xs">
                        {job.pages_crawled || 0} / {job.max_pages} pages
                      </div>
                      {getProgressBar(job)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(job.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {job.status === 'failed' && (
                          <button
                            onClick={() => handleRetryJob(job.job_id)}
                            className="text-indigo-600 hover:text-indigo-900"
                            title="Retry job"
                          >
                            <PlayIcon className="h-5 w-5" aria-hidden="true" />
                          </button>
                        )}
                        {/* Show delete button for all jobs */}
                        <button
                          onClick={() => {
                            setJobToDelete(job);
                            setDeleteConfirmOpen(true);
                          }}
                          className="text-red-600 hover:text-red-900"
                          title={job.status === 'completed' ? 'Delete job' : 'Cancel job'}
                        >
                          <TrashIcon className="h-5 w-5" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteConfirmOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {jobToDelete?.status === 'pending' || jobToDelete?.status === 'in_progress' 
                    ? 'Cancel Crawl Job' 
                    : 'Remove Crawl Job'}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {jobToDelete?.status === 'pending' || jobToDelete?.status === 'in_progress'
                      ? `Are you sure you want to cancel the crawl job for ${formatDomain(jobToDelete?.base_url || '')}?`
                      : `Are you sure you want to remove this job from your list? The job for ${formatDomain(jobToDelete?.base_url || '')} is already ${jobToDelete?.status}.`}
                    {' '}
                    {jobToDelete?.status === 'pending' || jobToDelete?.status === 'in_progress'
                      ? 'This will stop the crawling process.'
                      : 'This will only remove it from your view.'}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  if (jobToDelete) {
                    handleDeleteJob(jobToDelete.job_id);
                  }
                  setDeleteConfirmOpen(false);
                  setJobToDelete(null);
                }}
              >
                {jobToDelete?.status === 'pending' || jobToDelete?.status === 'in_progress' ? 'Cancel Job' : 'Remove Job'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setJobToDelete(null);
                }}
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebsiteCrawler;