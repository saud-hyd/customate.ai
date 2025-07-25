// frontend/dashboard/src/components/channels/ChannelDetailView.jsx

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  HiOutlineStatusOnline, 
  HiOutlineStatusOffline, 
  HiOutlineChat, 
  HiOutlineCog, 
  HiOutlineDocumentText,
  HiOutlineChartBar,
  HiClipboard,
  HiCheck
} from 'react-icons/hi';
import channelService from '../../services/channelService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import ConversationsList from './ConversationsList';
import ChannelConfigForm from './ChannelConfigForm';
import WhatsAppChannelSettings from './WhatsAppChannelSettings';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const ChannelDetailView = ({ channel, onBack, onChannelUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(0);
  const [copied, setCopied] = useState(false);
  const [channelData, setChannelData] = useState(channel);
  const [metrics, setMetrics] = useState({
    totalConversations: 0,
    totalMessages: 0,
    activeToday: 0,
    responseRate: 0
  });
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    const fetchChannelDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch updated channel data
        const response = await channelService.getChannelById(channel.channel_id);
        setChannelData(response.data);
        
        // Fetch channel statistics (optional - gracefully handle if endpoint doesn't exist)
        setStatsLoading(true);
        try {
          const statsResponse = await channelService.getChannelStats(channel.channel_id);
          const realStats = statsResponse.data;
          
          setMetrics({
            totalConversations: realStats.total_conversations || 0,
            totalMessages: realStats.total_messages || 0,
            activeToday: realStats.active_today || 0,
            responseRate: realStats.response_rate || 0
          });
          
          console.log('✅ Channel stats loaded:', realStats);
        } catch (statsError) {
          console.warn('📊 Channel stats not available (endpoint may not be implemented yet):', statsError.response?.status);
          // Keep metrics at 0 if stats API fails or doesn't exist
          setMetrics({
            totalConversations: 0,
            totalMessages: 0,
            activeToday: 0,
            responseRate: 0
          });
        } finally {
          setStatsLoading(false);
        }
        
        setError(null);
      } catch (err) {
        setError('Failed to load channel details. Please try again.');
        console.error('Error fetching channel details:', err);
      } finally {
        setLoading(false);
      }
    };

    if (channel?.channel_id) {
      fetchChannelDetails();
    }
  }, [channel.channel_id]);

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleChannelUpdate = (updatedChannel) => {
    setChannelData(updatedChannel);
    if (onChannelUpdate) {
      onChannelUpdate(updatedChannel);
    }
  };

  // Platform icon helper
  const getPlatformIcon = (platform) => {
    switch (platform) {
      case 'whatsapp':
        return (
          <div className="rounded-full bg-green-500 p-3">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.001 2C17.524 2 22 6.475 22 11.999C22 17.523 17.524 22 12.001 22C10.051 22 8.235 21.473 6.699 20.546L2 22L3.454 17.301C2.527 15.765 2 13.949 2 11.999C2 6.475 6.477 2 12.001 2Z"/>
            </svg>
          </div>
        );
      case 'facebook':
        return (
          <div className="rounded-full bg-blue-600 p-3">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
          </div>
        );
      case 'instagram':
        return (
          <div className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-3">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12.017 0C8.396 0 7.977.01 6.768.067 2.85.272.273 2.849.068 6.768.01 7.977 0 8.396 0 12.017c0 3.621.01 4.04.068 5.249.205 3.919 2.782 6.496 6.7 6.701 1.209.057 1.628.067 5.249.067 3.621 0 4.04-.01 5.249-.067 3.919-.205 6.496-2.782 6.701-6.7.057-1.209.067-1.628.067-5.249 0-3.621-.01-4.04-.067-5.249C23.495 2.849 20.918.272 16.999.068 15.79.01 15.371 0 12.017 0zM12.017 2.162c3.555 0 3.968.01 5.164.067 3.107.143 4.65 1.686 4.793 4.793.057 1.196.067 1.609.067 5.164 0 3.555-.01 3.968-.067 5.164-.143 3.107-1.686 4.65-4.793 4.793-1.196.057-1.609.067-5.164.067-3.555 0-3.968-.01-5.164-.067-3.107-.143-4.65-1.686-4.793-4.793-.057-1.196-.067-1.609-.067-5.164 0-3.555.01-3.968.067-5.164.143-3.107 1.686-4.65 4.793-4.793 1.196-.057 1.609-.067 5.164-.067zm0 3.495c-3.623 0-6.56 2.937-6.56 6.56s2.937 6.56 6.56 6.56 6.56-2.937 6.56-6.56-2.937-6.56-6.56-6.56zm0 10.807c-2.344 0-4.247-1.903-4.247-4.247S9.673 7.77 12.017 7.77s4.247 1.903 4.247 4.247-1.903 4.247-4.247 4.247zm6.818-11.084c-.85 0-1.538.688-1.538 1.538s.688 1.538 1.538 1.538 1.538-.688 1.538-1.538-.688-1.538-1.538-1.538z"/>
            </svg>
          </div>
        );
      case 'twitter':
        return (
          <div className="rounded-full bg-blue-400 p-3">
            <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M22.162 5.65593C21.3986 5.99362 20.589 6.2154 19.76 6.31393C20.6337 5.79136 21.2877 4.96894 21.6 3.99993C20.78 4.48793 19.881 4.82993 18.944 5.01493C18.3146 4.34151 17.4804 3.89489 16.5709 3.74451C15.6615 3.59413 14.7279 3.74842 13.9153 4.18338C13.1026 4.61834 12.4564 5.30961 12.0771 6.14972C11.6978 6.98983 11.6067 7.93171 11.818 8.82893C10.1551 8.74558 8.52832 8.31345 7.04328 7.56059C5.55823 6.80773 4.24812 5.75098 3.19799 4.45893C2.82628 5.09738 2.63095 5.82315 2.63199 6.56193C2.63199 8.01193 3.36999 9.29293 4.49199 10.0429C3.828 10.022 3.17862 9.84271 2.59799 9.51993V9.57193C2.59819 10.5376 2.93236 11.4735 3.54384 12.221C4.15532 12.9684 5.00647 13.4814 5.95299 13.6729C5.33661 13.84 4.6903 13.8646 4.06299 13.7449C4.32986 14.5762 4.85 15.3031 5.55058 15.824C6.25117 16.345 7.09712 16.6337 7.96999 16.6499C7.10247 17.3313 6.10917 17.8349 5.04687 18.1321C3.98458 18.4293 2.87412 18.5142 1.77899 18.3819C3.69069 19.6114 5.91609 20.2641 8.18899 20.2619C15.882 20.2619 20.089 13.8889 20.089 8.36193C20.089 8.18193 20.084 7.99993 20.076 7.82193C20.8949 7.23009 21.6016 6.49695 22.163 5.65693L22.162 5.65593Z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-500 p-3">
            <span className="text-white font-bold text-xl">{platform.charAt(0).toUpperCase()}</span>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <ErrorAlert message={error} />;
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Back button and channel header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
          >
            ← Back to Channels
          </button>
        )}
        
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {getPlatformIcon(channelData.platform)}
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-medium leading-6 text-gray-900">{channelData.name}</h3>
              <p className="text-sm text-gray-500 capitalize">{channelData.platform}</p>
              {channelData.active ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  <HiOutlineStatusOnline className="mr-1 h-4 w-4" />
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  <HiOutlineStatusOffline className="mr-1 h-4 w-4" />
                  Inactive
                </span>
              )}
            </div>
          </div>
          <div className="md:ml-auto mt-4 md:mt-0 flex space-x-2">
            <button
              onClick={() => setActiveTab(2)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              <HiOutlineCog className="mr-2 h-4 w-4" />
              Settings
            </button>
          </div>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Conversations */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <HiOutlineChat className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Conversations</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-12 rounded"></div>
                    ) : (
                      metrics.totalConversations.toLocaleString()
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Total Messages */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <HiOutlineDocumentText className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Messages</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-16 rounded"></div>
                    ) : (
                      metrics.totalMessages.toLocaleString()
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Active Today */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <HiOutlineStatusOnline className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Today</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-8 rounded"></div>
                    ) : (
                      metrics.activeToday
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>

          {/* Response Rate */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <HiOutlineChartBar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Response Rate</dt>
                  <dd className="text-xl font-semibold text-gray-900">
                    {statsLoading ? (
                      <div className="animate-pulse bg-gray-200 h-6 w-10 rounded"></div>
                    ) : (
                      `${metrics.responseRate}%`
                    )}
                  </dd>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Show info message when no data */}
        {!statsLoading && metrics.totalConversations === 0 && metrics.totalMessages === 0 && (
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">No activity yet</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>This channel hasn't received any messages yet. Once customers start messaging, you'll see statistics here.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Tab navigation and content */}
      <div className="px-4 py-4 sm:px-6">
        <Tab.Group selectedIndex={activeTab} onChange={setActiveTab}>
          <Tab.List className="flex space-x-1 rounded-xl bg-orange-50 p-1">
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full py-2.5 text-sm font-medium leading-5 rounded-lg',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-orange-400 ring-opacity-60',
                  selected
                    ? 'bg-white text-orange-700 shadow'
                    : 'text-gray-600 hover:bg-white/[0.12] hover:text-orange-600'
                )
              }
            >
              <div className="flex justify-center items-center">
                <HiOutlineChat className="mr-2 h-5 w-5" />
                Conversations
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full py-2.5 text-sm font-medium leading-5 rounded-lg',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-orange-400 ring-opacity-60',
                  selected
                    ? 'bg-white text-orange-700 shadow'
                    : 'text-gray-600 hover:bg-white/[0.12] hover:text-orange-600'
                )
              }
            >
              <div className="flex justify-center items-center">
                <HiOutlineChartBar className="mr-2 h-5 w-5" />
                Analytics
              </div>
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  'w-full py-2.5 text-sm font-medium leading-5 rounded-lg',
                  'focus:outline-none focus:ring-2 ring-offset-2 ring-orange-400 ring-opacity-60',
                  selected
                    ? 'bg-white text-orange-700 shadow'
                    : 'text-gray-600 hover:bg-white/[0.12] hover:text-orange-600'
                )
              }
            >
              <div className="flex justify-center items-center">
                <HiOutlineCog className="mr-2 h-5 w-5" />
                Settings
              </div>
            </Tab>
          </Tab.List>

          <Tab.Panels className="mt-4">
            {/* Conversations Tab */}
            <Tab.Panel className={classNames('rounded-xl p-3', 'focus:outline-none')}>
              <ConversationsList channelId={channelData.channel_id} />
            </Tab.Panel>

            {/* Analytics Tab */}
            <Tab.Panel className={classNames('rounded-xl p-3', 'focus:outline-none')}>
              <div className="text-center py-12">
                <HiOutlineChartBar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics coming soon</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Detailed analytics for this channel will be available in a future update.
                </p>
              </div>
            </Tab.Panel>

            {/* Settings Tab - WITH WHATSAPP INTEGRATION */}
            <Tab.Panel className={classNames('rounded-xl p-3', 'focus:outline-none')}>
              {channelData.platform === 'whatsapp' ? (
                <WhatsAppChannelSettings 
                  channel={channelData} 
                  webhookUrl={channelData.webhook_url} 
                />
              ) : (
                // Generic settings for other platforms
                <div className="space-y-6">
                  {/* Basic Channel Config */}
                  <ChannelConfigForm 
                    channel={channelData} 
                    onSuccess={handleChannelUpdate} 
                  />
                  
                  {/* Generic Webhook Info */}
                  <div className="bg-white overflow-hidden shadow rounded-lg">
                    <div className="px-4 py-5 sm:px-6">
                      <h3 className="text-lg font-medium leading-6 text-gray-900">Webhook Configuration</h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        Use this webhook URL to configure your {channelData.platform} integration.
                      </p>
                    </div>
                    <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Webhook URL
                          </label>
                          <div className="flex">
                            <input
                              type="text"
                              value={channelData.webhook_url || ''}
                              readOnly
                              className="flex-1 bg-gray-50 border border-gray-300 rounded-l-md px-3 py-2 text-sm font-mono"
                            />
                            <button
                              onClick={() => handleCopyToClipboard(channelData.webhook_url)}
                              className="px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
                            >
                              {copied ? (
                                <span className="flex items-center">
                                  <HiCheck className="h-4 w-4 text-green-500 mr-1" />
                                  Copied
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <HiClipboard className="h-4 w-4 mr-1" />
                                  Copy
                                </span>
                              )}
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            Configure this URL in your {channelData.platform} platform settings.
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Platform Identifier
                          </label>
                          <input
                            type="text"
                            value={channelData.platform_identifier || ''}
                            readOnly
                            className="w-full bg-gray-50 border border-gray-300 rounded-md px-3 py-2 text-sm"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Status
                          </label>
                          <div className="flex items-center">
                            <div
                              className={`w-3 h-3 rounded-full mr-2 ${
                                channelData.status === 'connected' ? 'bg-green-500' : 'bg-red-500'
                              }`}
                            />
                            <span className="text-sm capitalize">{channelData.status}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default ChannelDetailView;