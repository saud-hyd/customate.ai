import React, { useState, useEffect, useCallback } from 'react';
import analyticsService from '../../services/analyticsService';
import DateRangePicker from '../../components/analytics/DateRangePicker';
import AnalyticsOverview from '../../components/analytics/AnalyticsOverview';
import EngagementAnalytics from '../../components/analytics/EngagementAnalytics';
import KnowledgeAnalytics from '../../components/analytics/KnowledgeAnalytics';
import SubscriptionAnalytics from '../../components/analytics/SubscriptionAnalytics';
import ApiUsageAnalytics from '../../components/analytics/ApiUsageAnalytics';
import LoadingState from '../../components/common/LoadingState';
import ErrorAlert from '../../components/common/ErrorAlert';

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
    api: null
  });
  const [loading, setLoading] = useState(false);
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

  // Function to fetch data for the active tab only
  const fetchTabData = useCallback(async () => {
    if (loading) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const days = Math.round((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24)) + 1;
      
      switch (activeTab) {
        case 'overview':
          // Fetch all data needed for overview page
          const [dashboardData, overviewSubscriptionLimits, storageData] = await Promise.all([
            analyticsService.getDashboardOverview(),
            analyticsService.getSubscriptionLimits(), 
            analyticsService.getStorageStatistics()
          ]);
          
          setAnalyticsData(prev => ({
            ...prev,
            overview: {
              ...dashboardData,
              limits: overviewSubscriptionLimits.limits,
              storage: storageData
            }
          }));
          break;
          
        case 'engagement':
          const chatData2 = await analyticsService.getChatPerformance(days);
          setAnalyticsData(prev => ({
            ...prev,
            chat: chatData2
          }));
          break;
          
        case 'knowledge':
          const knowledgeData2 = await analyticsService.getKnowledgeUsage(days);
          setAnalyticsData(prev => ({
            ...prev,
            knowledge: knowledgeData2
          }));
          break;
          
        case 'subscription':
          const [subscriptionUsage, subscriptionTabLimits, storageStats] = await Promise.all([
            analyticsService.getSubscriptionUsage(6),
            analyticsService.getSubscriptionLimits(),
            analyticsService.getStorageStatistics()
          ]);
          
          setAnalyticsData(prev => ({
            ...prev,
            subscription: {
              ...subscriptionUsage,
              limits: subscriptionTabLimits,
              storage: storageStats
            }
          }));
          break;

        case 'api':
          const apiData = await analyticsService.getApiUsage(days);
          setAnalyticsData(prev => ({
            ...prev,
            api: apiData
          }));
          break;
      }
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error(`Error fetching ${activeTab} data:`, err);
      setError(`Backend error: ${err.message || 'Unknown error'}`);
      // NO FALLBACK DATA - just show the error
    } finally {
      setLoading(false);
    }
  }, [activeTab, dateRange]);

  // Add this useEffect after the fetchTabData function:
  useEffect(() => {
    if (dateRange.start && dateRange.end) {
      fetchTabData();
    }
  }, [fetchTabData]);

  // Manually refresh all data
  const refreshAllData = async () => {
    try {
      setLoading(true);
      await analyticsService.refreshAllData();
      
      // Clear existing data to force refresh
      setAnalyticsData({
        overview: null,
        chat: null,
        knowledge: null,
        subscription: null,
        api: null
      });
      
      // Fetch fresh data for the current tab
      await fetchTabData();
      
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh analytics data.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle date range selection
  const handleDateRangeChange = (newRange) => {
    setDateRange(newRange);
    setIsDatePickerOpen(false);
    
    // Clear data for the active tab to force refresh with new date range
    setAnalyticsData(prev => ({
      ...prev,
      [activeTab === 'overview' ? 'overview' : activeTab]: null
    }));
  };

  // Render appropriate content based on active tab
  const renderContent = () => {
    const tabData = activeTab === 'overview' 
      ? analyticsData.overview
      : activeTab === 'engagement'
        ? analyticsData.chat
        : activeTab === 'knowledge'
          ? analyticsData.knowledge
          : activeTab === 'subscription'
            ? analyticsData.subscription
            : analyticsData.api;
            
    if (loading && !tabData) {
      return <LoadingState message={`Loading ${activeTab} data...`} />;
    }

    if (error) {
      return (
        <div>
          <ErrorAlert message={error} />
          <div className="mt-4">
            <button
              onClick={refreshAllData}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              Retry Loading Data
            </button>
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