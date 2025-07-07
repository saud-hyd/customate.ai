// frontend/dashboard/src/components/knowledge/CrawlProgressModal.jsx
import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ArrowPathIcon,
  GlobeAltIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import knowledgeService from '../../services/knowledgeService';

const CrawlProgressModal = ({ jobId, onClose }) => {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);

  useEffect(() => {
    fetchProgress();
    
    // Set up auto-refresh for active jobs
    const interval = setInterval(() => {
      fetchProgress();
    }, 3000); // Refresh every 3 seconds
    
    setRefreshInterval(interval);
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId]);

  const fetchProgress = async () => {
    try {
      const response = await knowledgeService.getCrawlProgress(jobId);
      setProgress(response);
      setError(null);
      
      // Stop auto-refresh if job is complete
      if (response.status === 'completed' || response.status === 'failed' || response.status === 'cancelled') {
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      }
    } catch (err) {
      console.error('Error fetching progress:', err);
      setError(err.response?.data?.detail || 'Failed to fetch progress');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'failed':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'in_progress':
        return <ArrowPathIcon className="h-6 w-6 text-blue-500 animate-spin" />;
      case 'pending':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      default:
        return <GlobeAltIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-50';
      case 'failed':
        return 'text-red-600 bg-red-50';
      case 'in_progress':
        return 'text-blue-600 bg-blue-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return 'Not available';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getDuration = () => {
    if (!progress?.timing) return null;
    
    const start = progress.timing.started_at;
    const end = progress.timing.completed_at;
    
    if (!start) return null;
    
    const startTime = new Date(start);
    const endTime = end ? new Date(end) : new Date();
    const duration = Math.floor((endTime - startTime) / 1000);
    
    if (duration < 60) return `${duration}s`;
    if (duration < 3600) return `${Math.floor(duration / 60)}m ${duration % 60}s`;
    return `${Math.floor(duration / 3600)}h ${Math.floor((duration % 3600) / 60)}m`;
  };

  const addSpecificPages = async (pages) => {
    try {
      await knowledgeService.addSpecificPages(jobId, pages);
      fetchProgress(); // Refresh to show updated progress
    } catch (err) {
      console.error('Error adding pages:', err);
      setError('Failed to add specific pages');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-center py-12">
            <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-600">Loading progress...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Crawl Progress</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
          
          <div className="flex items-center justify-center py-12">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-400 mr-3" />
            <span className="text-red-600">{error}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-5 border w-11/12 md:w-4/5 lg:w-3/4 xl:w-2/3 shadow-lg rounded-md bg-white max-h-screen overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900">Crawl Progress</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {progress && (
          <div className="space-y-6">
            {/* Status Overview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  {getStatusIcon(progress.status)}
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">
                      {progress.status === 'completed' ? 'Crawl Completed' :
                       progress.status === 'failed' ? 'Crawl Failed' :
                       progress.status === 'in_progress' ? 'Crawling in Progress' :
                       'Crawl Pending'}
                    </h4>
                    <p className="text-sm text-gray-600">
                      Job ID: {progress.job_id}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">Duration</div>
                  <div className="text-lg font-medium text-gray-900">
                    {getDuration() || 'Not started'}
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progress</span>
                  <span className="text-sm text-gray-500">
                    {progress.progress.completion_percentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className={`h-3 rounded-full transition-all duration-500 ${
                      progress.status === 'completed' ? 'bg-green-500' :
                      progress.status === 'failed' ? 'bg-red-500' :
                      'bg-blue-500'
                    }`}
                    style={{ width: `${progress.progress.completion_percentage}%` }}
                  />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {progress.progress.pages_crawled}
                  </div>
                  <div className="text-sm text-gray-500">Pages Crawled</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {progress.progress.pages_processed}
                  </div>
                  <div className="text-sm text-gray-500">Pages Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">
                    {progress.progress.pages_failed}
                  </div>
                  <div className="text-sm text-gray-500">Pages Failed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">
                    {progress.progress.max_pages}
                  </div>
                  <div className="text-sm text-gray-500">Max Pages</div>
                </div>
              </div>
            </div>

            {/* Recent Pages */}
            {progress.recent_pages && progress.recent_pages.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Recently Crawled Pages</h4>
                <div className="bg-white border border-gray-200 rounded-md divide-y divide-gray-200">
                  {progress.recent_pages.map((page, index) => (
                    <div key={index} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              page.status === 'completed' ? 'bg-green-100 text-green-800' :
                              page.status === 'failed' ? 'bg-red-100 text-red-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {page.status}
                            </span>
                            <span className="text-xs text-gray-500">
                              Depth {page.depth}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            {page.title || 'Untitled Page'}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {page.url}
                          </p>
                        </div>
                        <div className="text-xs text-gray-500">
                          {page.crawled_at && formatTime(page.crawled_at)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Failed Pages */}
            {progress.failed_pages && progress.failed_pages.length > 0 && (
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Failed Pages</h4>
                <div className="bg-red-50 border border-red-200 rounded-md divide-y divide-red-200">
                  {progress.failed_pages.map((page, index) => (
                    <div key={index} className="px-4 py-3">
                      <p className="text-sm font-medium text-red-900">
                        {page.url}
                      </p>
                      {page.error && (
                        <p className="text-xs text-red-600 mt-1">
                          Error: {page.error}
                        </p>
                      )}
                      <p className="text-xs text-red-500">
                        Depth {page.depth}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timing Information */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-md font-medium text-gray-900 mb-3">Timing Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-500">Created</div>
                  <div className="text-sm text-gray-900">
                    {formatTime(progress.timing.created_at)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Started</div>
                  <div className="text-sm text-gray-900">
                    {formatTime(progress.timing.started_at)}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500">Completed</div>
                  <div className="text-sm text-gray-900">
                    {formatTime(progress.timing.completed_at)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CrawlProgressModal;