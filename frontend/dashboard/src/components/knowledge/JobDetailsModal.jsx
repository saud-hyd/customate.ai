// Path: frontend/dashboard/src/components/knowledge/JobDetailsModal.jsx
// Purpose: This component displays detailed information about a crawl job,
// including crawled pages, their status, and other metadata.

import React, { useState } from 'react';
import { XMarkIcon, LinkIcon, CheckCircleIcon, ExclamationTriangleIcon, ClockIcon } from '@heroicons/react/24/outline';
import { format } from 'date-fns';

const JobDetailsModal = ({ job, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy h:mm a');
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'success':
      case 'completed':
        return {
          className: 'bg-green-100 text-green-800',
          icon: <CheckCircleIcon className="h-4 w-4 mr-1" />,
          label: status === 'success' ? 'Success' : 'Completed'
        };
      case 'in_progress':
      case 'pending':
        return {
          className: 'bg-yellow-100 text-yellow-800',
          icon: <ClockIcon className="h-4 w-4 mr-1" />,
          label: status === 'pending' ? 'Pending' : 'In Progress'
        };
      case 'failed':
        return {
          className: 'bg-red-100 text-red-800',
          icon: <ExclamationTriangleIcon className="h-4 w-4 mr-1" />,
          label: 'Failed'
        };
      case 'cancelled':
      case 'skipped':
        return {
          className: 'bg-gray-100 text-gray-800',
          icon: <XMarkIcon className="h-4 w-4 mr-1" />,
          label: status === 'skipped' ? 'Skipped' : 'Cancelled'
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800',
          icon: null,
          label: status
        };
    }
  };

  // Format detailed page stats
  const formatPageStats = () => {
    if (!job.detailed_stats || !job.detailed_stats.pages) {
      return {
        success: 0,
        failed: 0,
        pending: 0,
        skipped: 0,
      };
    }
    
    return job.detailed_stats.pages;
  };

  const pageStats = formatPageStats();
  
  // If we have page_stats from the API, use that
  const statusCounts = job.page_stats || {
    success: pageStats.success || 0,
    failed: pageStats.failed || 0,
    pending: pageStats.pending || 0, 
    skipped: pageStats.skipped || 0
  };

  // Calculate completion percentage
  const completionPercentage = job.max_pages > 0 
    ? Math.min(Math.round((job.pages_crawled / job.max_pages) * 100), 100)
    : 0;

  return (
    <div className="fixed inset-0 overflow-y-auto z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      <div className="relative bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl m-4">
        <div className="flex justify-between items-start p-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Crawl Job Details</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'overview' 
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('pages')}
              className={`px-4 py-2 text-sm font-medium ${
                activeTab === 'pages' 
                  ? 'border-b-2 border-orange-500 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Crawled Pages
            </button>
            {job.error_message && (
              <button
                onClick={() => setActiveTab('errors')}
                className={`px-4 py-2 text-sm font-medium ${
                  activeTab === 'errors' 
                    ? 'border-b-2 border-red-500 text-red-600'
                    : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Errors
              </button>
            )}
          </nav>
        </div>
        
        <div className="overflow-y-auto max-h-[calc(90vh-10rem)] p-4">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Basic Job Info */}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Website URL</h4>
                <div className="mt-1 flex items-center">
                  <a 
                    href={job.base_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-orange-600 hover:text-orange-900 hover:underline flex items-center"
                  >
                    <LinkIcon className="h-4 w-4 mr-1 flex-shrink-0" />
                    {job.base_url}
                  </a>
                </div>
              </div>
              
              {/* Status */}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Status</h4>
                <div className="mt-1">
                  {(() => {
                    const statusBadge = getStatusBadge(job.status);
                    return (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>
              
              {/* Progress */}
              <div>
                <div className="flex justify-between">
                  <h4 className="text-sm font-medium text-gray-500">Progress</h4>
                  <span className="text-sm text-gray-500">{completionPercentage}%</span>
                </div>
                <div className="mt-1">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        job.status === 'failed' ? 'bg-red-500' : 
                        job.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                  <div className="mt-1 text-sm text-gray-500">
                    {job.pages_crawled} of {job.max_pages} pages crawled
                  </div>
                </div>
              </div>
              
              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Created</h4>
                  <p className="mt-1 text-sm text-gray-900">{formatTime(job.created_at)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Started</h4>
                  <p className="mt-1 text-sm text-gray-900">{job.started_at ? formatTime(job.started_at) : 'Not started'}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Completed</h4>
                  <p className="mt-1 text-sm text-gray-900">{job.completed_at ? formatTime(job.completed_at) : 'Not completed'}</p>
                </div>
              </div>
              
              {/* Crawl Configuration */}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Crawl Configuration</h4>
                <div className="mt-1 bg-gray-50 rounded-md p-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-gray-500">Max Pages:</span>
                    <p className="text-sm font-medium">{job.max_pages}</p>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Max Depth:</span>
                    <p className="text-sm font-medium">{job.max_depth}</p>
                  </div>
                  {job.include_patterns && job.include_patterns.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-gray-500">Include Patterns:</span>
                      <p className="text-sm font-mono overflow-x-auto">
                        {Array.isArray(job.include_patterns) 
                          ? job.include_patterns.join(', ') 
                          : job.include_patterns}
                      </p>
                    </div>
                  )}
                  {job.exclude_patterns && job.exclude_patterns.length > 0 && (
                    <div className="md:col-span-2">
                      <span className="text-xs text-gray-500">Exclude Patterns:</span>
                      <p className="text-sm font-mono overflow-x-auto">
                        {Array.isArray(job.exclude_patterns) 
                          ? job.exclude_patterns.join(', ') 
                          : job.exclude_patterns}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Pages Stats */}
              <div>
                <h4 className="text-sm font-medium text-gray-500">Page Statistics</h4>
                <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-md">
                    <span className="text-sm font-medium text-green-800">Successful</span>
                    <p className="mt-1 text-2xl font-semibold text-green-900">{statusCounts.success || 0}</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-md">
                    <span className="text-sm font-medium text-yellow-800">Pending</span>
                    <p className="mt-1 text-2xl font-semibold text-yellow-900">{statusCounts.pending || 0}</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-md">
                    <span className="text-sm font-medium text-red-800">Failed</span>
                    <p className="mt-1 text-2xl font-semibold text-red-900">{statusCounts.failed || 0}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <span className="text-sm font-medium text-gray-800">Skipped</span>
                    <p className="mt-1 text-2xl font-semibold text-gray-900">{statusCounts.skipped || 0}</p>
                  </div>
                </div>
              </div>
              
              {/* Collection Info */}
              {job.collection && (
                <div>
                  <h4 className="text-sm font-medium text-gray-500">Knowledge Collection</h4>
                  <div className="mt-1">
                    <p className="text-sm font-medium">{job.collection.name}</p>
                    <p className="text-xs text-gray-500">{job.collection.description}</p>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Pages Tab */}
          {activeTab === 'pages' && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Crawled Pages</h4>
              
              {job.detailed_stats && job.detailed_stats.recent_pages ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">URL</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Depth</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {job.detailed_stats.recent_pages.map((page, index) => {
                        const statusBadge = getStatusBadge(page.status);
                        return (
                          <tr key={page.page_id || index} className="hover:bg-gray-50">
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <a 
                                href={page.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-orange-600 hover:text-orange-900 hover:underline"
                                title={page.url}
                              >
                                {page.url.length > 40 ? page.url.substring(0, 40) + '...' : page.url}
                              </a>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {page.title || 'No title'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadge.className}`}>
                                {statusBadge.icon}
                                {statusBadge.label}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {page.depth ?? '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {job.detailed_stats.recent_pages.length < (job.pages_crawled || 0) && (
                    <div className="px-6 py-3 bg-gray-50 text-xs text-gray-500">
                      Showing recent {job.detailed_stats.recent_pages.length} of {job.pages_crawled} pages
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-gray-50 rounded-md p-4 text-center">
                  <p className="text-gray-500">Detailed page information not available</p>
                </div>
              )}
            </div>
          )}
          
          {/* Errors Tab */}
          {activeTab === 'errors' && job.error_message && (
            <div>
              <h4 className="text-sm font-medium text-gray-500 mb-4">Error Details</h4>
              <div className="bg-red-50 border-l-4 border-red-500 p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
                  <div>
                    <p className="text-sm text-red-700 font-medium">Error Message:</p>
                    <pre className="mt-1 text-sm text-red-700 font-mono whitespace-pre-wrap bg-white p-2 rounded border border-red-200">
                      {job.error_message}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="px-4 py-3 bg-gray-50 text-right sm:px-6">
          <button
            type="button"
            className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobDetailsModal;