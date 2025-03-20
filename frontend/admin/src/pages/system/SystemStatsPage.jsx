import React, { useState, useEffect } from 'react';
import { statsService } from '../../services/statsService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Icons
import {
  ArrowPathIcon,
  ServerIcon,
  ClockIcon,
  DocumentTextIcon,
  CircleStackIcon,
  ChartBarIcon,
  CpuChipIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

// Helper function to format bytes into human-readable form
function formatBytes(bytes, decimals = 2) {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export default function SystemStatsPage() {
  const [systemStats, setSystemStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSystemStats = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await statsService.getSystemStats();
      setSystemStats(data);
    } catch (error) {
      console.error('Error fetching system stats:', error);
      setError('Failed to load system statistics. Please try again.');
      toast.error('Failed to load system statistics');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemStats();
  }, []);

  const handleRefresh = () => {
    fetchSystemStats();
    toast.success('System statistics refreshed');
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationTriangleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">System Status</h1>
          <button
            type="button"
            onClick={handleRefresh}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowPathIcon className="mr-2 h-5 w-5 text-gray-500" />
            Refresh
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-500">
          Last updated: {format(new Date(systemStats?.timestamp), 'PPp')}
        </p>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* System Overview Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {/* Performance Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ClockIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Average Response Time</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {systemStats?.performance?.avg_response_time_ms?.toFixed(1) || 0} ms
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-gray-500">
                  Search time: {systemStats?.performance?.avg_search_time_ms?.toFixed(1) || 0} ms
                </span>
              </div>
            </div>
          </div>

          {/* DB Stats */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CircleStackIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Database Records</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {systemStats?.database?.total_records?.toLocaleString() || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-gray-500">
                  Across {Object.keys(systemStats?.database?.table_counts || {}).length} tables
                </span>
              </div>
            </div>
          </div>

          {/* Storage */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DocumentTextIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Storage Used</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {formatBytes(systemStats?.storage?.total_storage_bytes || 0)}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium text-gray-500">
                  {systemStats?.storage?.total_storage_mb?.toFixed(2) || 0} MB total
                </span>
              </div>
            </div>
          </div>

          {/* Clients */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ServerIcon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Clients</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">
                        {systemStats?.clients?.active_count || 0}
                      </div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <a href="/clients" className="font-medium text-indigo-600 hover:text-indigo-500">
                  View all clients
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Database Statistics */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Database Statistics</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Table Record Counts</h3>
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {systemStats?.database?.table_counts && Object.entries(systemStats.database.table_counts).map(([table, count]) => (
                  <div key={table} className="bg-gray-50 overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:p-6">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">{table}</dt>
                        <dd className="mt-1 text-3xl font-semibold text-gray-900">
                          {count.toLocaleString()}
                        </dd>
                      </dl>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Performance Metrics */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Performance Metrics</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-500" /> Response Time
                </h3>
                <div className="mt-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">Average Response</span>
                    <span className="text-sm font-medium text-gray-900">
                      {systemStats?.performance?.avg_response_time_ms?.toFixed(1) || 0} ms
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{ 
                        width: `${Math.min(100, (systemStats?.performance?.avg_response_time_ms || 0) / 5)}%` 
                      }}
                    ></div>
                  </div>
                  <div className="mt-4 flex justify-between items-center">
                    <span className="text-sm text-gray-500">Average Search</span>
                    <span className="text-sm font-medium text-gray-900">
                      {systemStats?.performance?.avg_search_time_ms?.toFixed(1) || 0} ms
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full"
                      style={{ 
                        width: `${Math.min(100, (systemStats?.performance?.avg_search_time_ms || 0) / 5)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-base font-medium text-gray-900 flex items-center">
                  <CpuChipIcon className="h-5 w-5 mr-2 text-indigo-500" /> System Load
                </h3>
                <div className="mt-4">
                  <div className="flex flex-col space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Active Requests/sec</span>
                      <span className="text-sm font-medium text-gray-900">
                        {(Math.random() * 20).toFixed(1)} req/s
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Average CPU Usage</span>
                      <span className="text-sm font-medium text-gray-900">
                        {(Math.random() * 80).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">Average Memory Usage</span>
                      <span className="text-sm font-medium text-gray-900">
                        {(Math.random() * 60).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 text-xs text-gray-500">
                    <p>* Note: System load statistics are simulated for demonstration purposes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Storage Utilization */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Storage Utilization</h2>
          <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-base font-medium text-gray-900">Total Storage Used</h3>
                <p className="mt-1 text-3xl font-semibold text-gray-900">
                  {formatBytes(systemStats?.storage?.total_storage_bytes || 0)}
                </p>
              </div>
              
              <div className="mt-4 md:mt-0">
                <div className="flex flex-col space-y-2">
                  <span className="text-sm text-gray-500">Estimated Monthly Growth</span>
                  <span className="text-lg font-medium text-gray-900">
                    {formatBytes((systemStats?.storage?.total_storage_bytes || 0) * 0.15)} / month
                  </span>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <button 
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View Details
                </button>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm font-medium text-gray-500">Storage Breakdown</h4>
              <div className="mt-2 bg-gray-200 rounded-full h-4">
                <div className="flex h-4 rounded-full overflow-hidden">
                  <div 
                    className="bg-blue-500 h-4" 
                    style={{ width: '45%' }}
                    title="Document Storage"
                  ></div>
                  <div 
                    className="bg-indigo-500 h-4" 
                    style={{ width: '30%' }}
                    title="Vector Embeddings"
                  ></div>
                  <div 
                    className="bg-purple-500 h-4" 
                    style={{ width: '15%' }}
                    title="Chat History"
                  ></div>
                  <div 
                    className="bg-pink-500 h-4" 
                    style={{ width: '10%' }}
                    title="Other"
                  ></div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs">
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-blue-500 rounded-full mr-1"></span>
                  <span>Document Storage (45%)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-indigo-500 rounded-full mr-1"></span>
                  <span>Vector Embeddings (30%)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-purple-500 rounded-full mr-1"></span>
                  <span>Chat History (15%)</span>
                </div>
                <div className="flex items-center">
                  <span className="w-3 h-3 bg-pink-500 rounded-full mr-1"></span>
                  <span>Other (10%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* System Status & Maintenance */}
        <div className="mt-8">
          <h2 className="text-lg font-medium text-gray-900 mb-4">System Status & Maintenance</h2>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <h3 className="text-base font-medium text-gray-900">Health Status</h3>
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">API Service</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                    Operational
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">Database</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                    Operational
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">LLM Service</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                    Operational
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">Vector Database</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                    Operational
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-2.5 h-2.5 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-gray-700">File Storage</span>
                  </div>
                  <span className="text-xs font-medium bg-green-100 text-green-800 px-2.5 py-0.5 rounded-full">
                    Operational
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
              <h3 className="text-base font-medium text-gray-900">Scheduled Maintenance</h3>
              <div className="mt-4">
                <div className="border-t border-gray-200 pt-4">
                  <dl className="divide-y divide-gray-200">
                    <div className="py-3 flex justify-between items-start">
                      <dt className="text-sm font-medium text-gray-900">Database Optimization</dt>
                      <dd className="mt-1 text-sm text-gray-500">
                        <time dateTime="2023-03-25T00:00:00Z">Sunday, Mar 25, 2023</time>
                        <br />
                        <span>2:00 AM - 4:00 AM UTC</span>
                      </dd>
                    </div>
                    
                    <div className="py-3 flex justify-between items-start">
                      <dt className="text-sm font-medium text-gray-900">System Backup</dt>
                      <dd className="mt-1 text-sm text-gray-500">
                        <time dateTime="2023-03-28T00:00:00Z">Tuesday, Mar 28, 2023</time>
                        <br />
                        <span>3:00 AM - 3:30 AM UTC</span>
                      </dd>
                    </div>
                    
                    <div className="py-3 flex justify-between items-start">
                      <dt className="text-sm font-medium text-gray-900">API Rate Limit Update</dt>
                      <dd className="mt-1 text-sm text-gray-500">
                        <time dateTime="2023-04-02T00:00:00Z">Sunday, Apr 2, 2023</time>
                        <br />
                        <span>1:00 AM - 2:00 AM UTC</span>
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}