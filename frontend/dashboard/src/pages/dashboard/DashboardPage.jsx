// frontend/dashboard/src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import knowledgeService from '../../services/knowledgeService';
import dashboardService from '../../services/dashboardService';
import useAuth from '../../hooks/useAuth';
import ErrorHandler from '../../components/common/ErrorHandler';

import {
  UsersIcon,
  ChatBubbleLeftRightIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { user } = useAuth();
  const [overview, setOverview] = useState(null);
  const [subscriptionStatus, setSubscriptionStatus] = useState(null);
  const [documentsStats, setDocumentsStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get all required data in parallel
      const [overviewData, subscriptionLimits, documentsData] = await Promise.all([
        analyticsService.getDashboardOverview().catch(() => null),
        analyticsService.checkSubscriptionLimits().catch(() => null),
        knowledgeService.getDocumentStats().catch(() => null)
      ]);
      
      if (overviewData) setOverview(overviewData);
      if (subscriptionLimits) setSubscriptionStatus(subscriptionLimits);
      if (documentsData) setDocumentsStats(documentsData);
      
      // If all requests failed, show error
      if (!overviewData && !subscriptionLimits && !documentsData) {
        setError('Failed to load dashboard data. Please try again later.');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  // Default values for stats when data is not available
  const defaultStats = {
    users: 0,
    messages: 0, 
    knowledge_items: 0,
    searches: 0
  };

  // Get stats with fallbacks
  const stats = [
    {
      name: 'Users Today',
      value: overview?.today?.users || defaultStats.users,
      change: overview?.changes?.users || 0,
      icon: UsersIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Messages Today',
      value: overview?.today?.messages || defaultStats.messages,
      change: overview?.changes?.messages || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Knowledge Items',
      value: documentsStats?.knowledge_items?.total || defaultStats.knowledge_items,
      change: null,
      icon: DocumentTextIcon,
      color: 'bg-purple-500'
    },
    {
      name: 'Searches Today',
      value: overview?.today?.searches || defaultStats.searches,
      change: overview?.changes?.searches || 0,
      icon: MagnifyingGlassIcon,
      color: 'bg-orange-500'
    },
  ];

  // Default subscription data
  const defaultSubscription = {
    limits: {
      messages: { used: 0, limit: 100, percentage: 0, exceeded: false },
      users: { active: 0, limit: 10, percentage: 0, exceeded: false },
      storage: { used_bytes: 0, limit_bytes: 1048576, percentage: 0, exceeded: false }
    }
  };

  // Subscription usage with fallbacks
  const subscriptionLimits = [
    {
      name: 'Messages',
      value: subscriptionStatus?.limits?.messages?.percentage || 0,
      used: subscriptionStatus?.limits?.messages?.used || 0,
      limit: subscriptionStatus?.limits?.messages?.limit || defaultSubscription.limits.messages.limit,
      color: (subscriptionStatus?.limits?.messages?.exceeded || defaultSubscription.limits.messages.exceeded) ? 'text-red-600' : 'text-green-600'
    },
    {
      name: 'Active Users',
      value: subscriptionStatus?.limits?.users?.percentage || 0,
      used: subscriptionStatus?.limits?.users?.active || 0,
      limit: subscriptionStatus?.limits?.users?.limit || defaultSubscription.limits.users.limit,
      color: (subscriptionStatus?.limits?.users?.exceeded || defaultSubscription.limits.users.exceeded) ? 'text-red-600' : 'text-green-600'
    },
    {
      name: 'Storage',
      value: subscriptionStatus?.limits?.storage?.percentage || 0,
      used: Math.round((subscriptionStatus?.limits?.storage?.used_bytes || 0) / (1024 * 1024)),
      limit: Math.round((subscriptionStatus?.limits?.storage?.limit_bytes || defaultSubscription.limits.storage.limit_bytes) / (1024 * 1024)),
      unit: 'MB',
      color: (subscriptionStatus?.limits?.storage?.exceeded || defaultSubscription.limits.storage.exceeded) ? 'text-red-600' : 'text-green-600'
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user?.name || 'User'}</h1>
        <p className="mt-1 text-sm text-gray-500">
          Here's what's happening with your chatbot today.
        </p>
      </div>

      {/* Error message */}
      {error && <ErrorHandler message={error} onRetry={fetchDashboardData} />}

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((item) => (
          <div key={item.name} className="bg-white overflow-hidden shadow-sm rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <item.icon className={`${item.color} p-1 h-8 w-8 text-white rounded-md`} aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-500 truncate">{item.name}</dt>
                  <dd className="flex items-baseline">
                    <div className="text-2xl font-semibold text-gray-900">{item.value}</div>
                    {item.change !== null && (
                      <div className={`ml-2 flex items-baseline text-sm ${item.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {item.change >= 0 ? '↑' : '↓'} {Math.abs(item.change)}%
                      </div>
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Subscription usage */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900">Subscription Usage</h2>
        <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
          {subscriptionLimits.map((item) => (
            <div key={item.name} className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-base font-medium text-gray-900">{item.name}</h3>
              <div className="mt-2">
                <div className="flex items-center justify-between text-sm text-gray-600">
                  <span>
                    {item.used} / {item.limit} {item.unit}
                  </span>
                  <span className={item.color}>{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                  <div 
                    className={`h-2.5 rounded-full ${item.color === 'text-red-600' ? 'bg-red-600' : 'bg-green-600'}`}
                    style={{ width: `${Math.min(item.value, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent documents */}
      <div className="bg-white shadow-sm rounded-lg p-4 sm:p-6">
        <h2 className="text-lg font-medium text-gray-900">Recent Documents</h2>
        {documentsStats?.recent_documents && documentsStats.recent_documents.length > 0 ? (
          <div className="mt-4 flow-root">
            <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
              <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                <table className="min-w-full divide-y divide-gray-300">
                  <thead>
                    <tr>
                      <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Filename</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Uploaded</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {documentsStats.recent_documents.map((doc) => (
                      <tr key={doc.document_id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{doc.filename}</td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm">
                          <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 
                            ${doc.status === 'processed' ? 'bg-green-100 text-green-800' : 
                              doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                            {doc.status}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {new Date(doc.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-4 text-sm text-gray-500">
            No documents uploaded yet.
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;