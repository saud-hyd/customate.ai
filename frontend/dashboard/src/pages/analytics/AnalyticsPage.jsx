// Path: frontend/dashboard/src/pages/analytics/AnalyticsPage.jsx
import React, { useState, useEffect } from 'react';
import { CalendarIcon } from '@heroicons/react/24/outline';
import { XIcon } from '@heroicons/react/24/outline';
import analyticsService from '../../services/analyticsService';
import DateRangePicker from '../../components/analytics/DateRangePicker';
import AnalyticsOverview from '../../components/analytics/AnalyticsOverview';
import EngagementAnalytics from '../../components/analytics/EngagementAnalytics';
import KnowledgeAnalytics from '../../components/analytics/KnowledgeAnalytics';
import SubscriptionAnalytics from '../../components/analytics/SubscriptionAnalytics';
import ApiUsageAnalytics from '../../components/analytics/ApiUsageAnalytics';
import LoadingState from '../../components/common/LoadingState';
import ErrorAlert from '../../components/common/ErrorAlert';

/**
 * Enhanced Analytics Page
 * Provides visualizations and metrics for chatbot performance
 */
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    start.setDate(start.getDate() - 30);
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

  // Fetch analytics data based on active tab and date range
  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Calculate days between start and end dates
      const days = Math.round((dateRange.end - dateRange.start) / (1000 * 60 * 60 * 24));
      
      switch (activeTab) {
        case 'overview':
          // Fetch data for all sections for overview
          const [chatData, knowledgeData, subscriptionData] = await Promise.all([
            analyticsService.getChatPerformance(days),
            analyticsService.getKnowledgeUsage(days),
            analyticsService.getSubscriptionUsage(Math.ceil(days / 30))
          ]);
          
          setAnalyticsData(prev => ({
            ...prev,
            overview: { chat: chatData, knowledge: knowledgeData, subscription: subscriptionData },
            chat: chatData,
            knowledge: knowledgeData,
            subscription: subscriptionData
          }));
          break;
          
        case 'engagement':
          if (!analyticsData.chat) {
            const chatData = await analyticsService.getChatPerformance(days);
            setAnalyticsData(prev => ({ ...prev, chat: chatData }));
          }
          break;
          
        case 'knowledge':
          if (!analyticsData.knowledge) {
            const knowledgeData = await analyticsService.getKnowledgeUsage(days);
            setAnalyticsData(prev => ({ ...prev, knowledge: knowledgeData }));
          }
          break;
          
        case 'subscription':
          if (!analyticsData.subscription) {
            const subscriptionData = await analyticsService.getSubscriptionUsage(Math.ceil(days / 30));
            setAnalyticsData(prev => ({ ...prev, subscription: subscriptionData }));
          }
          break;
          
        case 'api':
          if (!analyticsData.api) {
            const apiData = await analyticsService.getApiUsage(days);
            setAnalyticsData(prev => ({ ...prev, api: apiData }));
          }
          break;
      }
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
      return <LoadingState message="Loading analytics data..." />;
    }

    if (error) {
      return <ErrorAlert message={error} />;
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
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor your chatbot performance and usage metrics
            </p>
          </div>
          
          {/* Date range picker button */}
          <div className="mt-4 md:mt-0 relative">
            <button
              type="button"
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            >
              <CalendarIcon className="-ml-1 mr-2 h-5 w-5 text-gray-500" />
              {dateRange.label || `${dateRange.start?.toLocaleDateString()} - ${dateRange.end?.toLocaleDateString()}`}
            </button>
            
            {/* Date range picker dropdown */}
            {isDatePickerOpen && (
              <div className="absolute right-0 mt-2 w-72 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <DateRangePicker 
                  currentRange={dateRange}
                  onRangeSelect={handleDateRangeChange}
                  onClose={() => setIsDatePickerOpen(false)}
                />
              </div>
            )}
          </div>
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