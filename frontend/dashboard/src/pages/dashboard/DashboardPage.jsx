// frontend/dashboard/src/pages/dashboard/DashboardPage.jsx
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import analyticsService from '../../services/analyticsService';
import subscriptionService from '../../services/subscriptionService';
import clientService from '../../services/clientService';
import { formatNumber, formatPercentage, formatBytes } from '../../utils/formatters';
import { ArrowUpIcon, ArrowDownIcon, ArrowPathIcon } from '@heroicons/react/24/solid';
import { ExclamationTriangleIcon, CreditCardIcon, DocumentTextIcon, BookOpenIcon } from '@heroicons/react/24/outline';

const DashboardPage = () => {
  const { t } = useTranslation(['dashboard', 'common']);
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
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(analyticsService.lastSyncTime || null);

  useEffect(() => {
    // Initial data fetch without heavy operations
    fetchAllData(false);
  }, []);

  const fetchAllData = async (forceSync = false) => {
    try {
      setLoading(true);
      setError(null);
      
      // Only perform heavy sync operations if forceSync is true
      if (forceSync) {
        setRefreshing(true);
        try {
          await analyticsService.refreshAllData();
          setSuccess(t('common:messages.dataRefreshed', 'Data refreshed successfully'));
          setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
          console.error('Error refreshing data:', err);
          setError(t('common:errors.refreshFailed', 'Failed to refresh data. Using cached data instead.'));
        } finally {
          setRefreshing(false);
        }
      }
      
      // Fetch all necessary data using cached approach when possible
      const [overviewData, subscriptionInfo, clientData, storageData] = await Promise.all([
        analyticsService.getDashboardOverview(),
        subscriptionService.getCurrentSubscription(),
        clientService.getClientInfo(),
        analyticsService.getStorageStatistics()
      ]);
      
      setDashboardData(overviewData);
      setSubscriptionData(subscriptionInfo);
      setClientInfo(clientData);
      setStorageStats(storageData);
      
      // Update last refresh timestamp to match the service's timestamp
      setLastRefresh(analyticsService.lastSyncTime || new Date());
      
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(t('common:errors.loadFailed', 'Failed to load dashboard data: {{error}}', { error: err.message }));
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshData = async () => {
    // Trigger a full data refresh with sync operations
    await fetchAllData(true);
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
          <p className="mt-3 text-gray-700">{t('common:messages.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header with refresh button */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('dashboard:title')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {t('dashboard:overview')}
            </p>
            {lastRefresh && (
              <p className="mt-2 text-xs text-gray-500">
{t('dashboard:status.lastUpdated')}: {lastRefresh.toLocaleTimeString()}
              </p>
            )}
          </div>
          <button
            onClick={handleRefreshData}
            disabled={refreshing}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-300 flex items-center"
          >
            {refreshing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
{t('dashboard:status.refreshing')}
              </>
            ) : (
              <>
                <ArrowPathIcon className="h-4 w-4 mr-2" />
{t('dashboard:status.refreshData')}
              </>
            )}
          </button>
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
        subscriptionData.plan_type === 'free' ? 'bg-orange-50 border border-orange-200' :
        subscriptionData.plan_type === 'basic' ? 'bg-blue-50 border border-blue-200' :
        subscriptionData.plan_type === 'standard' ? 'bg-purple-50 border border-purple-200' :
        'bg-green-50 border border-green-200'
      }`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div className={`p-2 rounded-md ${
              subscriptionData.plan_type === 'free' ? 'bg-orange-100 text-orange-700' :
              subscriptionData.plan_type === 'basic' ? 'bg-blue-100 text-blue-700' :
              subscriptionData.plan_type === 'standard' ? 'bg-purple-100 text-purple-700' :
              'bg-green-100 text-green-700'
            }`}>
              <CreditCardIcon className="h-6 w-6" />
            </div>
            <div className="ml-3">
              <p className="text-lg font-semibold">{subscriptionData.plan_type.charAt(0).toUpperCase() + subscriptionData.plan_type.slice(1)} {t('common:plan', 'Plan')}</p>
              <p className="text-sm text-gray-600">
                {subscriptionData.status === 'active' ? t('dashboard:status.subscriptionActive') : t('dashboard:status.subscriptionNeedsAttention')}
              </p>
            </div>
          </div>
          
          {subscriptionData.plan_type !== 'professional' && (
            <button
              onClick={handleUpgradeClick}
              className={`px-4 py-2 rounded-md text-white font-medium ${
                subscriptionData.plan_type === 'free' ? 'bg-orange-600 hover:bg-orange-700' :
                subscriptionData.plan_type === 'basic' ? 'bg-blue-600 hover:bg-blue-700' :
                'bg-purple-600 hover:bg-purple-700'
              }`}
            >
{t('dashboard:quickActions.upgradeplan', 'Upgrade Plan')}
            </button>
          )}
        </div>
        
        {/* Show warning if usage is near limit */}
        {(subscriptionData.usage.messages.percentage >= 80) && (
          <div className="mt-3 flex items-start p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-yellow-800">{t('dashboard:warnings.approachingLimits')}</p>
              <p className="text-sm text-yellow-700 mt-1">
                {t('dashboard:warnings.messagesWarning', {
                  percentage: formatPercentage(subscriptionData.usage.messages.percentage),
                  current: subscriptionData.usage.messages.used,
                  limit: subscriptionData.usage.messages.limit
                })}. {t('dashboard:warnings.upgradePrompt')}
              </p>
            </div>
          </div>
        )}
      </div>
      
      {/* Stats cards grid - Now only showing Messages and Conversations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">{t('dashboard:usage.totalConversations')}</h2>
            <div className="text-xs font-medium text-gray-400">{t('dashboard:usage.vsPreviousDay')}</div>
          </div>
          <div className="mt-2 flex items-baseline">
            <p className="text-3xl font-bold text-gray-900">{formatNumber(dashboardData.today?.sessions || 0)}</p>
            <p className="ml-2 text-sm font-medium">
              {renderChangeIndicator(dashboardData.changes?.sessions || 0)}
            </p>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            {formatNumber(subscriptionData.usage?.messages?.used || dashboardData.monthly?.total_messages || 0)} this month
          </p>
        </div>
        
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-500">{t('dashboard:metrics.totalMessages')}</h2>
            <div className="text-xs font-medium text-gray-400">{t('dashboard:usage.vsPreviousDay')}</div>
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
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard:usage.monthlyUsage', 'Monthly Usage')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Messages usage */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">
                {t('dashboard:usage.assistantMessages')}
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
                <span className="text-red-600 font-medium">
                  {t('common:warnings.criticalUsage', 'Critical: Only {{remaining}} messages left!', {
                    remaining: formatNumber((subscriptionData.usage?.messages?.limit || 100) - (subscriptionData.usage?.messages?.used || 0))
                  })}
                </span>
              ) : subscriptionData.usage?.messages?.percentage >= 80 ? (
                <span className="text-orange-600">
                  {t('common:warnings.highUsage', 'Warning: {{percentage}} of your limit used', {
                    percentage: formatPercentage(subscriptionData.usage?.messages?.percentage)
                  })}
                </span>
              ) : (
                t('common:usage.monthlyUsage', '{{percentage}} of your monthly message limit used', {
                  percentage: formatPercentage(subscriptionData.usage?.messages?.percentage)
                })
              )}
            </p>
          </div>
          
          {/* Storage usage - Enhanced UI */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <h3 className="text-sm font-medium text-gray-500">{t('dashboard:usage.storage')}</h3>
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
                  {t('dashboard:usage.documents')}
                </span>
                <span className="font-medium text-gray-700">
                  {formatBytes(storageStats.document_bytes || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-gray-500 flex items-center">
                  <BookOpenIcon className="h-3.5 w-3.5 mr-1 text-gray-400" />
                  {t('dashboard:usage.knowledgeBase')}
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
                  {t('dashboard:usage.crawledContent')}
                </span>
                <span className="font-medium text-gray-700">
                  {formatBytes(storageStats.crawled_content_bytes || 0)}
                </span>
              </div>
            </div>
            
            <p className="text-xs text-gray-500 mt-2">
              {storageStats.percentage >= 90 ? (
                <span className="text-red-600 font-medium">
                  {t('common:warnings.criticalStorage', 'Critical: Only {{remaining}} left!', {
                    remaining: formatBytes(storageStats.limit_bytes - storageStats.total_bytes)
                  })}
                </span>
              ) : storageStats.percentage >= 80 ? (
                <span className="text-orange-600">
                  {t('common:warnings.highStorage', 'Warning: {{percentage}} of your storage limit used', {
                    percentage: formatPercentage(storageStats.percentage)
                  })}
                </span>
              ) : (
                t('common:usage.storageUsage', '{{percentage}} of your storage limit used', {
                  percentage: formatPercentage(storageStats.percentage)
                })
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">{t('dashboard:quickActions.title')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="/knowledge" className="block p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition duration-150">
            <h3 className="font-medium text-gray-900">{t('common:actions.manageKnowledge', 'Manage Knowledge Base')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('common:descriptions.knowledgeManagement', 'Upload documents, add FAQs, and organize your knowledge base.')}</p>
          </a>
          
          <a href="/conversations" className="block p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition duration-150">
            <h3 className="font-medium text-gray-900">{t('common:actions.viewConversations', 'View Conversations')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('common:descriptions.conversationManagement', 'Browse chat history and analyze user interactions.')}</p>
          </a>
          
          <a href="/test" className="block p-4 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition duration-150">
            <h3 className="font-medium text-gray-900">{t('common:actions.testChatbot', 'Test Your Chatbot')}</h3>
            <p className="mt-1 text-sm text-gray-500">{t('common:descriptions.chatbotTesting', 'Try out your chatbot and see how it responds to queries.')}</p>
          </a>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;