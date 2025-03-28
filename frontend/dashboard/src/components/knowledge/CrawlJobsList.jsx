// frontend/dashboard/src/components/knowledge/CrawlJobsList.jsx
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
} from '@heroicons/react/24/outline';

const CrawlJobsList = ({ refreshTrigger = 0 }) => {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshingJob, setRefreshingJob] = useState(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [pageSize] = useState(10);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState(null);
  
  const { success, error: showError } = useToast();

  // Fetch jobs when component mounts or refreshTrigger changes
  useEffect(() => {
    fetchJobs();
  }, [refreshTrigger, page]);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const offset = (page - 1) * pageSize;
      const response = await knowledgeService.getCrawlJobs();
      
      // Handle the response data
      if (Array.isArray(response)) {
        setJobs(response);
        setTotalCount(response.length);
      } else if (response && Array.isArray(response.jobs)) {
        setJobs(response.jobs);
        setTotalCount(response.total || response.jobs.length);
      } else {
        console.error('Unexpected response format:', response);
        setJobs([]);
        setTotalCount(0);
      }
    } catch (err) {
      console.error('Error fetching crawl jobs:', err);
      setError('Failed to load crawl jobs. Please try again.');
      showError('Failed to load crawl jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshJob = async (jobId) => {
    try {
      setRefreshingJob(jobId);
      const detailedStatus = await knowledgeService.getCrawlJobStatus(jobId, true);
      
      // Update the job in the list
      setJobs(prevJobs => 
        prevJobs.map(job => 
          job.job_id === jobId ? { ...job, ...detailedStatus } : job
        )
      );
      
      success('Job status refreshed');
    } catch (err) {
      console.error('Error refreshing job status:', err);
      showError('Failed to refresh job status');
    } finally {
      setRefreshingJob(null);
    }
  };

  const handleCancelJob = async (jobId) => {
    try {
      await knowledgeService.cancelCrawlJob(jobId);
      success('Job cancelled successfully');
      await fetchJobs(); // Refresh the list
    } catch (err) {
      console.error('Error cancelling job:', err);
      showError('Failed to cancel job');
    }
  };

  const handleRetryJob = async (jobId) => {
    try {
      await knowledgeService.retryCrawlJob(jobId);
      success('Job restarted successfully');
      await fetchJobs(); // Refresh the list
    } catch (err) {
      console.error('Error retrying job:', err);
      showError('Failed to retry job');
    }
  };


    const handleDeleteJob = async (jobId) => {
        try {
        // Always use the backend DELETE endpoint
        await knowledgeService.cancelCrawlJob(jobId);
        success('Crawl job deleted successfully');
        
        // Refresh the jobs list to reflect the changes
        await fetchJobs();
        } catch (err) {
        console.error('Error deleting crawl job:', err);
        showError('Failed to delete job');
        
        // Refresh to ensure UI is in sync
        await fetchJobs();
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
            {status || 'Unknown'}
          </span>
        );
    }
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
    if (!dateString) return 'N/A';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (err) {
      return dateString;
    }
  };

  const getProgressBar = (job) => {
    if (job.status !== 'in_progress' && job.status !== 'pending') return null;
    
    const progress = job.pages_crawled > 0 
      ? Math.min(100, Math.round((job.pages_crawled / job.max_pages) * 100))
      : 0;
    
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
    );
  };

  if (loading && jobs.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-gray-500">Loading crawl jobs...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XCircleIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={fetchJobs}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6 text-center py-12">
        <GlobeAltIcon className="h-12 w-12 text-gray-400 mx-auto" />
        <h3 className="mt-2 text-lg font-medium text-gray-900">No crawl jobs found</h3>
        <p className="mt-1 text-sm text-gray-500">Start a new crawl job to extract content from websites.</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">All Crawl Jobs</h3>
        <button
          onClick={fetchJobs}
          className="p-2 rounded-full text-gray-400 hover:text-gray-500"
          title="Refresh jobs"
        >
          <ArrowPathIcon className="h-5 w-5" />
        </button>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Website
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Date Created
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {jobs.map(job => (
              <tr key={job.job_id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  <a 
                    href={job.base_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    {formatDomain(job.base_url)}
                  </a>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getStatusBadge(job.status)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  <div className="text-xs">
                    {job.pages_crawled || 0} / {job.max_pages || '?'} pages
                    {job.pages_failed > 0 && (
                      <span className="ml-2 text-red-500">
                        ({job.pages_failed} failed)
                      </span>
                    )}
                  </div>
                  {getProgressBar(job)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(job.created_at)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => handleRefreshJob(job.job_id)}
                      className="text-gray-500 hover:text-gray-700"
                      disabled={refreshingJob === job.job_id}
                      title="Refresh status"
                    >
                      <ArrowPathIcon className={`h-5 w-5 ${refreshingJob === job.job_id ? 'animate-spin' : ''}`} />
                    </button>
                    
                    {job.status === 'failed' && (
                      <button
                        onClick={() => handleRetryJob(job.job_id)}
                        className="text-indigo-600 hover:text-indigo-900"
                        title="Retry job"
                      >
                        <PlayIcon className="h-5 w-5" />
                      </button>
                    )}
                    
                    <button
                      onClick={() => {
                        setJobToDelete(job);
                        setDeleteConfirmOpen(true);
                      }}
                      className="text-red-600 hover:text-red-900"
                      title={job.status === 'pending' || job.status === 'in_progress' ? 'Cancel job' : 'Delete job'}
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
          <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Showing <span className="font-medium">{(page - 1) * pageSize + 1}</span> to{' '}
                <span className="font-medium">
                  {Math.min(page * pageSize, totalCount)}
                </span>{' '}
                of <span className="font-medium">{totalCount}</span> results
              </p>
            </div>
            <div>
              <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                    page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Previous</span>
                  &larr;
                </button>
                <button
                  onClick={() => setPage(p => Math.min(Math.ceil(totalCount / pageSize), p + 1))}
                  disabled={page >= Math.ceil(totalCount / pageSize)}
                  className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                    page >= Math.ceil(totalCount / pageSize) ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50'
                  }`}
                >
                  <span className="sr-only">Next</span>
                  &rarr;
                </button>
              </nav>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && jobToDelete && (
        <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setDeleteConfirmOpen(false)}></div>
          <div className="relative bg-white rounded-lg max-w-md w-full p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <TrashIcon className="h-6 w-6 text-red-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {jobToDelete.status === 'pending' || jobToDelete.status === 'in_progress' 
                    ? 'Cancel Crawl Job' 
                    : 'Delete Crawl Job'}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {jobToDelete.status === 'pending' || jobToDelete.status === 'in_progress'
                      ? `Are you sure you want to cancel the crawl job for ${formatDomain(jobToDelete.base_url)}?`
                      : `Are you sure you want to remove this crawl job for ${formatDomain(jobToDelete.base_url)}?`}
                  </p>
                </div>
              </div>
            </div>
            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
              <button
                type="button"
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                onClick={() => {
                  handleDeleteJob(jobToDelete.job_id);
                  setDeleteConfirmOpen(false);
                  setJobToDelete(null);
                }}
              >
                {jobToDelete.status === 'pending' || jobToDelete.status === 'in_progress' 
                  ? 'Cancel Job' 
                  : 'Delete Job'}
              </button>
              <button
                type="button"
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                onClick={() => {
                  setDeleteConfirmOpen(false);
                  setJobToDelete(null);
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CrawlJobsList;