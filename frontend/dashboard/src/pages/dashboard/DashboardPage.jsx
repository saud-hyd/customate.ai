// frontend/dashboard/src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import analyticsService from '../../services/analyticsService';
import subscriptionService from '../../services/subscriptionService';
import clientService from '../../services/clientService';
import { formatNumber, formatPercentage, formatBytes } from '../../utils/formatters';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon, CreditCardIcon, DocumentTextIcon, BookOpenIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const [dashboardData, setDashboardData] = useState({
    today: {
      sessions: 0,
      messages: 0
    },
    monthly: {
      total_sessions: 0,
      total_messages: 0
    },
    changes: {
      sessions: 0,
      messages: 0
    }
  });
  
  const [subscriptionData, setSubscriptionData] = useState({
    plan_type: 'free',
    status: 'active',
    usage: {
      messages: { used: 0, limit: 100, percentage: 0 },
      storage: { used_bytes: 0, limit_bytes: 0.5 * 1024 * 1024, percentage: 0 }
    }
  });
  
  // Storage statistics state
  const [storageStats, setStorageStats] = useState({
    total_bytes: 0,
    document_bytes: 0,
    knowledge_bytes: 0,
    crawled_content_bytes: 0,
    percentage: 0,
    limit_bytes: 0
  });
  
  const [clientInfo, setClientInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  useEffect(() => {
    // Initial data fetch
    fetchAllData();
    
    // Set up auto-refresh every 5 minutes
    const refreshInterval = setInterval(() => {
      fetchAllData();
    }, 300000);
    
    // Cleanup interval when component unmounts
    return () => {
      clearInterval(refreshInterval);
    };
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get the fixed message counts using the correct API
      let messageCountsFixed = null;
      try {
        // Use the sync dashboard data endpoint to get the most up-to-date metrics including today's activity
        const syncResult = await analyticsService.syncDashboardData();
        console.log('Dashboard data synced:', syncResult);
        
        // Store this so we can access the real-time today metrics
        window.syncedDashboardData = syncResult;
        
        // Then get the fixed message counts
        messageCountsFixed = await analyticsService.fixMessageCounts();
        console.log('Message counts fixed:', messageCountsFixed);
      } catch (err) {
        console.warn('Automatic message count fix failed, continuing with regular data fetch:', err);
      }
      
      // Fetch all necessary data 
      const [overviewData, subscriptionInfo, clientData, storageData] = await Promise.all([
        analyticsService.getDashboardOverview(),
        subscriptionService.getCurrentSubscription(),
        clientService.getClientInfo(),
        analyticsService.getStorageStatistics()
      ]);
      
      // Make sure we have the correct message counts from the fixed API
      if (messageCountsFixed && messageCountsFixed.status === 'success') {
        const assistantCount = messageCountsFixed.data.assistant_message_count;
        
        // For today's messages, check if we received today's metrics from syncDashboardData
        let todayMessages = 0;
        
        // If we have syncDashboardData result from earlier, use it (it has the most accurate today values)
        if (window.syncedDashboardData && window.syncedDashboardData.today && window.syncedDashboardData.today.messages) {
          todayMessages = window.syncedDashboardData.today.messages;
        } 
        // Otherwise calculate based on ratio from original data
        else if (overviewData && overviewData.today && overviewData.monthly) {
          // If today is active (you've been using the chatbot today), ensure we show that activity
          const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
          const hasActivityToday = overviewData.today.messages > 0;
          
          if (hasActivityToday) {
            // Use the original today value, but ensure it's not greater than the total
            todayMessages = Math.min(overviewData.today.messages, assistantCount);
          } else {
            // Calculate proportionally if no activity today
            const originalTotal = overviewData.monthly.total_messages || 1; // Avoid division by zero
            const originalDailyRatio = (overviewData.today.messages || 0) / originalTotal;
            todayMessages = Math.round(assistantCount * originalDailyRatio);
            
            // Ensure today's count doesn't exceed the monthly total
            todayMessages = Math.min(todayMessages, assistantCount);
          }
        }
        
        // Update dashboard data with the correct message counts for both daily and monthly
        setDashboardData({
          ...overviewData,
          today: {
            ...overviewData.today,
            messages: todayMessages
          },
          monthly: {
            ...overviewData.monthly,
            total_messages: assistantCount
          }
        });
        
        // Update subscription info with the correct count
        if (subscriptionInfo) {
          // Make sure the usage object exists and has the messages property
          if (!subscriptionInfo.usage) {
            subscriptionInfo.usage = {};
          }
          
          if (!subscriptionInfo.usage.messages) {
            subscriptionInfo.usage.messages = {
              limit: 100, // Default limit
              percentage: 0
            };
          }
          
          // Override the message count and recalculate percentage
          subscriptionInfo.usage.messages.used = assistantCount;
          const limit = subscriptionInfo.usage.messages.limit || 100;
          subscriptionInfo.usage.messages.percentage = Math.min(100, (assistantCount / limit) * 100);
          
          console.log('Updated subscription info with fixed count:', assistantCount);
        }
      } else {
        // If the fix didn't work, just use the original data
        setDashboardData(overviewData);
      }
      
      setSubscriptionData(subscriptionInfo);
      setClientInfo(clientData);
      setStorageStats(storageData);
      
      // Update last refresh timestamp
      setLastRefresh(new Date());
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(`Failed to load dashboard data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const syncMessageCounts = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First sync dashboard data to get the most up-to-date metrics including today's activity
      await analyticsService.syncDashboardData();
      
      // Then call the fix-message-counts endpoint
      const fixResult = await analyticsService.fixMessageCounts();
      
      if (fixResult.status === 'success') {
        // Log the updated message count
        console.log('Updated message count:', fixResult.data.assistant_message_count);
        
        // Force refresh all data immediately after the fix
        await fetchAllData();
        
        // Show success message with the actual count
        setSuccess(`Message counts updated to ${fixResult.data.assistant_message_count} assistant messages`);
        
        // Set a timeout to clear the success message
        setTimeout(() => setSuccess(null), 3000);
      }
      
    } catch (err) {
      console.error('Error fixing message counts:', err);
      setError('Failed to update message counts');
    } finally {
      setLoading(false);
    }
  };

  const getUsageColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500';
    if (percentage >= 80) return 'bg-orange-500';
    if (percentage >= 60) return 'bg-yellow-500';
    return 'bg-green-500';
  };
  
  const renderChangeIndicator = (value) => {
    if (value > 0) {
      return (
        <span className="inline-flex items-center text-green-600">
          <ArrowUpIcon className="h-3 w-3 mr-1" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    } else if (value < 0) {
      return (
        <span className="inline-flex items-center text-red-600">
          <ArrowDownIcon className="h-3 w-3 mr-1" />
          {Math.abs(value).toFixed(1)}%
        </span>
      );
    } else {
      return <span className="text-gray-500">0%</span>;
    }
  };
  
  const handleUpgradeClick = () => {
    window.location.href = '/subscription';
  };

  if (loading && !dashboardData.monthly?.total_sessions) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-3 text-gray-700">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header with refresh button */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Overview of your chatbot performance and subscription status.
          </p>
          {lastRefresh && (
            <p className="mt-2 text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Subscription plan banner with quick upgrade CTA */}
      <div className={`rounded-lg p-4 ${
        subscriptionData.plan_type === 'free' ? 'bg-indigo-50 border border-indigo-200' :
        subscriptionData.plan_type === 'basic' ? 'bg-blue-50 border border-blue-200' :
        subscriptionData.plan_type === 'standard' ? 'bg-purple-50 border border-purple-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className={`p-2 rounded-md ${
              subscriptionData.plan_type === 'free' ? 'bg-indigo-100 text-indigo-700' :
              subscriptionData.plan_type === 'basic' ? 'bg-blue-100 text-blue-700' :
              subscriptionData.plan_type === 'standard' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              <CreditCardIcon className="h-6 w-6" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold">{subscriptionData.plan_type.charAt(0).toUpperCase() + subscriptionData.plan_type.slice(1)} Plan</p>
              <p className="text-sm text-gray-600">
                {subscriptionData.status === 'active' ? 'Your subscription is active' : 'Your subscription needs attention'}
              </p>
            </div>
          </div>
          
          {subscriptionData.plan_type !== 'professional' && (
            <button
              onClick={handleUpgradeClick}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                subscriptionData.plan_type === 'free' ? 'bg-indigo-600 hover:bg-indigo-700' :
                subscriptionData.plan_type === 'basic' ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Upgrade Plan
            </button>
          )}
        </div>
        
        {/* Show warning if usage is near limit */}
        {(subscriptionData.usage.messages.percentage >= 80) && (
          <div className="mt-3 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">You're approaching your plan limits</p>
              <p className="text-sm text-yellow-700 mt-1">
                You've used over {formatPercentage(subscriptionData.usage.messages.percentage)} of your message limit.
                Consider upgrading your plan to avoid service interruptions.
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Stats cards grid - Now only showing Messages and Conversations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">Total Conversations</h2>
            <div className="text-xs font-medium text-gray-400">vs. previous day</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.sessions || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.sessions || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(dashboardData.monthly?.total_sessions || 0)} this month
          </p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">Total Messages (Chatbot Responses)</h2>
            <div className="text-xs font-medium text-gray-400">vs. previous day</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.messages || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.messages || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(subscriptionData.usage?.messages?.used || 0)} this month
          </p>
        </div>
      </div>

      {/* Subscription usage section - Now shows Message usage and Storage */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Monthly Usage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Messages usage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">
                Assistant Messages (API Usage)
              </h3>
              <span className="text-sm text-gray-500">
                {formatNumber(subscriptionData.usage?.messages?.used || 0)} / {formatNumber(subscriptionData.usage?.messages?.limit || 100)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${getUsageColor(subscriptionData.usage?.messages?.percentage || 0)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min((subscriptionData.usage?.messages?.percentage || 0), 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500">
              {subscriptionData.usage?.messages?.percentage >= 90 ? (
                <span className="text-red-600 font-medium">Critical: Only {formatNumber((subscriptionData.usage?.messages?.limit || 100) - (subscriptionData.usage?.messages?.used || 0))} messages left!</span>
              ) : subscriptionData.usage?.messages?.percentage >= 80 ? (
                <span className="text-orange-600">Warning: {formatPercentage(subscriptionData.usage?.messages?.percentage)} of your limit used</span>
              ) : (
                `${formatPercentage(subscriptionData.usage?.messages?.percentage)} of your monthly message limit used`
              )}
            </p>
          </div>
          
          {/* Storage usage - Enhanced UI */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">Storage</h3>
              <span className="text-sm text-gray-500">
                {formatBytes(storageStats.total_bytes || 0)} / {formatBytes(storageStats.limit_bytes || 0)}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className={`${getUsageColor(storageStats.percentage || 0)} h-3 rounded-full transition-all duration-500`}
                style={{ width: `${Math.min((storageStats.percentage || 0), 100)}%` }}
              ></div>
            </div>
            
            {/* Storage breakdown - Enhanced with icons */}
            <div className="mt-3 space-y-1.5 pt-2 border-t border-gray-100">
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center">
                  <DocumentTextIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  Documents
                </span>
                <span className="font-medium text-gray-700">
                  {formatBytes(storageStats.document_bytes || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center">
                  <BookOpenIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  Knowledge Base
                </span>
                <span className="font-medium text-gray-700">
                  {formatBytes(storageStats.knowledge_bytes || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center">
                  <svg className="h-3.5 w-3.5 mr-1 text-gray-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101" />
                  </svg>
                  Crawled Content
                </span>
                <span className="font-medium text-gray-700">
                  {formatBytes(storageStats.crawled_content_bytes || 0)}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              {storageStats.percentage >= 90 ? (
                <span className="text-red-600 font-medium">Critical: Only {formatBytes(storageStats.limit_bytes - storageStats.total_bytes)} left!</span>
              ) : storageStats.percentage >= 80 ? (
                <span className="text-orange-600">Warning: {formatPercentage(storageStats.percentage)} of your storage limit used</span>
              ) : (
                `${formatPercentage(storageStats.percentage)} of your storage limit used`
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/knowledge" className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition duration-150">
            <h3 className="font-medium text-gray-900">Manage Knowledge Base</h3>
            <p className="mt-1 text-sm text-gray-500">Upload documents, add FAQs, and organize your knowledge base.</p>
          </a>
          
          <a href="/conversations" className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition duration-150">
            <h3 className="font-medium text-gray-900">View Conversations</h3>
            <p className="mt-1 text-sm text-gray-500">Browse chat history and analyze user interactions.</p>
          </a>
          
          <a href="/test" className="block p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition duration-150">
            <h3 className="font-medium text-gray-900">Test Your Chatbot</h3>
            <p className="mt-1 text-sm text-gray-500">Try out your chatbot and see how it responds to queries.</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;