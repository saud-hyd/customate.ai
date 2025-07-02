// frontend/dashboard/src/components/channels/ChannelDetailView.jsx

import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { 
  HiOutlineStatusOnline, 
  HiOutlineStatusOffline, 
  HiOutlineChat, 
  HiOutlineCog, 
  HiOutlineDocumentText,
  HiOutlineChartBar
} from 'react-icons/hi';
import channelService from '../../services/channelService';
import LoadingSpinner from '../common/LoadingSpinner';
import ErrorAlert from '../common/ErrorAlert';
import ConversationsList from './ConversationsList';
import ChannelConfigForm from './ChannelConfigForm';
import { CopyToClipboard } from 'react-copy-to-clipboard';

function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

const ChannelDetailView = ({ channel, onChannelUpdate }) => {
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
  const [statsLoading, setStatsLoading] = useState(false); // New loading state for stats

  useEffect(() => {
    const fetchChannelDetails = async () => {
      try {
        setLoading(true);
        
        // Fetch updated channel data
        const response = await channelService.getChannelById(channel.channel_id);
        setChannelData(response.data);
        
        // FIXED: Fetch REAL metrics instead of mock data
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
          
          console.log('✅ Real channel stats loaded:', realStats);
        } catch (statsError) {
          console.error('❌ Error loading channel stats:', statsError);
          // Keep metrics at 0 if stats API fails
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

  // Add this copy function if it doesn't exist
  const handleCopyToClipboard = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {/* Channel header */}
      <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {channelData.platform === 'whatsapp' && (
                <div className="rounded-full bg-green-500 p-3">
                  <svg className="h-8 w-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12.001 2C17.524 2 22 6.475 22 11.999C22 17.523 17.524 22 12.001 22C10.051 22 8.235 21.473 6.699 20.546L2 22L3.454 17.301C2.527 15.765 2 13.949 2 11.999C2 6.475 6.477 2 12.001 2Z"/>
                  </svg>
                </div>
              )}
              {/* Add other platform icons as needed */}
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

      {/* FIXED: Real metrics cards with loading states */}
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

      {/* Rest of your existing content tabs */}
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
            <Tab.Panel className={classNames('rounded-xl p-3', 'focus:outline-none')}>
              <ConversationsList channelId={channelData.channel_id} />
            </Tab.Panel>
            <Tab.Panel className={classNames('rounded-xl p-3', 'focus:outline-none')}>
              <div className="text-center py-12">
                <HiOutlineChartBar className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Analytics coming soon</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Detailed analytics for this channel will be available in a future update.
                </p>
              </div>
            </Tab.Panel>
            <Tab.Panel className={classNames('rounded-xl p-3', 'focus:outline-none')}>
              {/* Your existing settings content */}
              <div className="space-y-6">
                {/* Connection Details */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Connection Details</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Important connection information for your {channelData.platform} channel.
                    </p>
                  </div>
                  {/* Add your existing settings content here */}
                </div>
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default ChannelDetailView;