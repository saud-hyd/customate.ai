import React, { useState, useEffect } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import analyticsService from '../../services/analyticsService';
import DateRangePicker from '../../components/analytics/DateRangePicker';
import AnalyticsOverview from '../../components/analytics/AnalyticsOverview';
import EngagementAnalytics from '../../components/analytics/EngagementAnalytics';
import KnowledgeAnalytics from '../../components/analytics/KnowledgeAnalytics';
import SubscriptionAnalytics from '../../components/analytics/SubscriptionAnalytics';
import ApiUsageAnalytics from '../../components/analytics/ApiUsageAnalytics';
import LoadingState from '../../components/common/LoadingState';
import ErrorAlert from '../../components/common/ErrorAlert';
import api from '../../services/api';

const AnalyticsPage = () => {
  // State management
  const [activeTab, setActiveTab] = useState('overview');
  const [dateRange, setDateRange] = useState({ start: null, end: null, days: 30 });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [analyticsData, setAnalyticsData] = useState({
    overview: null,
    chat: null,
    knowledge: null,
    subscription: null,
    subscriptionLimits: null,
    api: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Tabs configuration
  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'engagement', label: 'Engagement' },
    { id: 'knowledge', label: 'Knowledge Base' },
    { id: 'subscription', label: 'Subscription' },
    { id: 'api', label: 'API Usage' }
  ];

  // Initialize with the current date and date 30 days ago
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 29); // 30 days including today
    setDateRange({ 
      start, 
      end, 
      days: 30,
      label: 'Last 30 Days'
    });
  }, []);

  // Fetch data when tab or date range changes
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchAnalyticsData();
    }
  }, [activeTab, dateRange]);

  // Sync data and fix message counts before fetching analytics
  const syncDataBeforeFetch = async () => {
    try {
      // Sync dashboard data first to get up-to-date metrics
      await analyticsService.syncDashboardData();
      
      // Fix message counts to ensure accurate metrics
      await analyticsService.fixMessageCounts();
      
      return true;
    } catch (err) {
      console.warn('Data sync failed - continuing with data fetch:', err);
      return false;
    }
  };

  // Fetch analytics data based on active tab and date range
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);
  
      // Calculate days between start and end dates
      const days = Math.round((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)) + 1;
      
      // Always sync data first
      await syncDataBeforeFetch();
      
      switch (activeTab) {
        case 'overview':
          // Skip reset if it's not working
          try {
            await analyticsService.resetAnalytics();
          } catch (err) {
            console.warn('Reset analytics failed - continuing with data fetch');
          }
          
          // Use try/catch for each API call separately to avoid one failure blocking all data
          let overviewData, chatData, knowledgeData, subscriptionData, subscriptionLimitsData;
          
          try {
            overviewData = await analyticsService.getDashboardOverview();
          } catch (err) {
            console.warn('Failed to fetch dashboard overview:', err);
          }
          
          try {
            chatData = await analyticsService.getChatPerformance(days);
          } catch (err) {
            console.warn('Failed to fetch chat performance:', err);
          }
          
          try {
            knowledgeData = await analyticsService.getKnowledgeUsage(days);
          } catch (err) {
            console.warn('Failed to fetch knowledge usage:', err);
          }
          
          try {
            subscriptionData = await analyticsService.getSubscriptionUsage(Math.ceil(days / 30));
          } catch (err) {
            console.warn('Failed to fetch subscription usage:', err);
          }
          
          // Add this block to fetch the subscription limits
          try {
            subscriptionLimitsData = await analyticsService.getSubscriptionLimits();
            
            // Transform the returned data structure to match what the UI expects
            if (subscriptionLimitsData && subscriptionLimitsData.limits) {
              // Create the current object with the correct structure
              const current = {
                messages: {
                  used: subscriptionLimitsData.limits.messages.used,
                  limit: subscriptionLimitsData.limits.messages.limit,
                  percentage: subscriptionLimitsData.limits.messages.percentage * 100
                },
                users: {
                  used: subscriptionLimitsData.limits.users.active,
                  limit: subscriptionLimitsData.limits.users.limit,
                  percentage: subscriptionLimitsData.limits.users.percentage * 100
                },
                storage: {
                  used_bytes: subscriptionLimitsData.limits.storage.used_bytes,
                  limit_bytes: subscriptionLimitsData.limits.storage.limit_bytes,
                  percentage: subscriptionLimitsData.limits.storage.percentage * 100,
                  
                  // Convert bytes to MB for UI display
                  used_mb: subscriptionLimitsData.limits.storage.used_bytes / (1024 * 1024),
                  limit_mb: subscriptionLimitsData.limits.storage.limit_bytes / (1024 * 1024)
                }
              };
              
              // Update subscriptionData if it exists
              if (subscriptionData) {
                subscriptionData.current = current;
              } else {
                // Create a minimal subscriptionData object
                subscriptionData = { 
                  current: current,
                  historical: [],
                  subscription: { plan_type: 'basic', status: 'active' }
                };
              }
            }
          } catch (err) {
            console.warn('Failed to fetch subscription limits:', err);
          }
          
          // Even if some data is missing, update what we have
          setAnalyticsData({
            ...analyticsData,
            overview: { 
              dashboardData: overviewData,
              chat: chatData, 
              knowledge: knowledgeData, 
              subscription: subscriptionData 
            },
            chat: chatData,
            knowledge: knowledgeData,
            subscription: subscriptionData,
            subscriptionLimits: subscriptionLimitsData
          });
          
          // If all requests failed, show error
          if (!overviewData && !chatData && !knowledgeData && !subscriptionData && !subscriptionLimitsData) {
            setError('Failed to load any analytics data. The backend API endpoints may not be fully implemented yet.');
          }
          
          break;
          
        case 'engagement':
          try {
            // First sync data to get accurate metrics
            await analyticsService.fixMessageCounts();
            
            const chatData = await analyticsService.getChatPerformance(days);
            setAnalyticsData({
              ...analyticsData,
              chat: chatData
            });
          } catch (err) {
            console.error('Failed to fetch chat performance:', err);
            setError('Failed to load chat engagement data. Please try again later.');
          }
          break;
          
        case 'knowledge':
          try {
            const knowledgeData = await analyticsService.getKnowledgeUsage(days);
            setAnalyticsData({
              ...analyticsData,
              knowledge: knowledgeData
            });
          } catch (err) {
            console.error('Failed to fetch knowledge usage:', err);
            setError('Failed to load knowledge base data. Please try again later.');
          }
          break;
          
        case 'subscription':
          try {
            // First sync data to get accurate metrics
            await analyticsService.fixMessageCounts();
            
            const subscriptionData = await analyticsService.getSubscriptionUsage(
              Math.ceil(days / 30) // Convert days to months
            );
            
            // Also get current subscription limits for the subscription tab
            const subscriptionLimitsData = await analyticsService.getSubscriptionLimits();
            
            // Process the data to match expected format
            if (subscriptionLimitsData && subscriptionLimitsData.limits) {
              // Similar transformation as in the overview case
              const current = {
                messages: {
                  used: subscriptionLimitsData.limits.messages.used,
                  limit: subscriptionLimitsData.limits.messages.limit,
                  percentage: subscriptionLimitsData.limits.messages.percentage * 100
                },
                users: {
                  used: subscriptionLimitsData.limits.users.active,
                  limit: subscriptionLimitsData.limits.users.limit,
                  percentage: subscriptionLimitsData.limits.users.percentage * 100
                },
                storage: {
                  used_bytes: subscriptionLimitsData.limits.storage.used_bytes,
                  limit_bytes: subscriptionLimitsData.limits.storage.limit_bytes,
                  percentage: subscriptionLimitsData.limits.storage.percentage * 100,
                  used_mb: subscriptionLimitsData.limits.storage.used_bytes / (1024 * 1024),
                  limit_mb: subscriptionLimitsData.limits.storage.limit_bytes / (1024 * 1024)
                }
              };
              
              // Merge with subscription data
              subscriptionData.current = current;
            }
            
            setAnalyticsData({
              ...analyticsData,
              subscription: subscriptionData,
              subscriptionLimits: subscriptionLimitsData
            });
          } catch (err) {
            console.error('Failed to fetch subscription usage:', err);
            setError('Failed to load subscription data. Please try again later.');
          }
          break;
          
        case 'api':
          try {
            const apiData = await analyticsService.getApiUsage(days);
            setAnalyticsData({
              ...analyticsData,
              api: apiData
            });
          } catch (err) {
            console.error('Failed to fetch API usage:', err);
            setError('Failed to load API usage data. Please try again later.');
          }
          break;
          
        default:
          console.warn(`Unknown tab: ${activeTab}`);
      }
      
      // Update last refresh timestamp
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error fetching analytics data:', err);
      setError('Failed to load analytics data. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle date range selection
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setIsDatePickerOpen(false);
  };

  // Render appropriate content based on active tab
  const renderContent = () => {
    if (loading && !analyticsData[activeTab === 'overview' ? 'overview' : activeTab]) {
      return <LoadingState message={`Loading ${activeTab} data...`} />;
    }

    if (error) {
      return (
        <div>
          <ErrorAlert message={error} />
          <div className="mt-8 p-6 bg-white rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Debug Information</h3>
            <p className="text-sm text-gray-700 mb-2">
              It appears the analytics functionality is not connecting to the backend properly. Here are some steps to troubleshoot:
            </p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-700">
              <li>Ensure the backend server is running and accessible at {api?.defaults?.baseURL || 'the configured URL'}</li>
              <li>Check that the API endpoints in the backend match what the frontend is calling</li>
              <li>Verify that authentication is working correctly (API key in headers)</li>
              <li>Look for any CORS issues in the browser console</li>
              <li>Check the backend logs for any errors when these endpoints are called</li>
            </ol>
            <div className="mt-4">
              <button
                onClick={fetchAnalyticsData}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Retry Loading Data
              </button>
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return (
          <AnalyticsOverview 
            data={analyticsData.overview}
            dateRange={dateRange}
          />
        );
        
      case 'engagement':
        return (
          <EngagementAnalytics 
            data={analyticsData.chat}
            dateRange={dateRange}
          />
        );
        
      case 'knowledge':
        return (
          <KnowledgeAnalytics 
            data={analyticsData.knowledge}
            dateRange={dateRange}
          />
        );
        
      case 'subscription':
        return (
          <SubscriptionAnalytics 
            data={analyticsData.subscription}
            dateRange={dateRange}
          />
        );
        
      case 'api':
        return (
          <ApiUsageAnalytics 
            data={analyticsData.api}
            dateRange={dateRange}
          />
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor your chatbot performance and usage metrics
          </p>
          {lastRefresh && (
            <p className="mt-2 text-xs text-gray-500">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Tabs navigation */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto py-2 px-4" aria-label="Tabs">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } whitespace-nowrap py-2 px-3 border-b-2 font-medium text-sm mx-2 first:ml-0 last:mr-0`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
        
        {/* Content area */}
        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;