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

  useEffect(() => {
    const fetchChannelDetails = async () => {
      try {
        setLoading(true);
        // Fetch updated channel data
        const response = await channelService.getChannelById(channel.channel_id);
        setChannelData(response.data);
        
        // Fetch metrics (this would be a real API call in production)
        // This is just mock data for demonstration
        setMetrics({
          totalConversations: Math.floor(Math.random() * 100) + 1,
          totalMessages: Math.floor(Math.random() * 1000) + 1,
          activeToday: Math.floor(Math.random() * 20),
          responseRate: Math.floor(Math.random() * 100)
        });
        
        setError(null);
      } catch (err) {
        setError('Failed to load channel details. Please try again.');
        console.error('Error fetching channel details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelDetails();
  }, [channel.channel_id]);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPlatformIcon = () => {
    switch (channelData.platform.toLowerCase()) {
      case 'whatsapp':
        return (
          <div className="rounded-full bg-green-500 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.001 2C17.524 2 22 6.475 22 11.999C22 17.523 17.524 22 12.001 22C10.051 22 8.235 21.473 6.699 20.546L2 22L3.454 17.301C2.527 15.765 2 13.949 2 11.999C2 6.475 6.477 2 12.001 2ZM8.907 7.698C8.759 7.703 8.615 7.736 8.483 7.794C8.346 7.854 8.195 7.958 8.034 8.105C7.919 8.211 7.752 8.377 7.602 8.581C7.278 9.015 7.105 9.498 7.105 9.982C7.106 10.373 7.207 10.754 7.368 11.115C7.693 11.838 8.289 12.587 9.111 13.307C9.284 13.467 9.457 13.62 9.638 13.763C10.651 14.534 11.832 15.047 13.096 15.256L13.595 15.319C13.737 15.328 13.879 15.319 14.021 15.316C14.292 15.31 14.557 15.263 14.805 15.177C14.937 15.129 15.067 15.075 15.195 15.015C15.195 15.015 15.237 14.99 15.318 14.941C15.437 14.868 15.504 14.821 15.599 14.734C15.671 14.67 15.735 14.597 15.788 14.516C15.866 14.395 15.943 14.173 15.98 13.915C16.008 13.72 16.029 13.611 16.03 13.502C16.031 13.447 16.026 13.392 16.015 13.338C16 13.258 15.935 13.174 15.837 13.085C15.792 13.044 15.742 13.003 15.688 12.964C15.579 12.882 15.461 12.815 15.383 12.769C15.361 12.757 15.3 12.731 15.23 12.703C15.086 12.647 14.939 12.603 14.795 12.559C14.712 12.534 14.633 12.509 14.568 12.484C14.441 12.437 14.373 12.403 14.293 12.389C14.272 12.385 14.251 12.386 14.23 12.39C14.156 12.404 14.068 12.471 14.012 12.551C13.98 12.598 13.929 12.769 13.929 12.769C13.929 12.769 13.808 13.086 13.624 13.225C13.504 13.315 13.357 13.322 13.251 13.297C13.183 13.281 13.115 13.259 13.047 13.233C12.967 13.203 12.887 13.171 12.814 13.141C12.653 13.073 12.503 13.003 12.379 12.935C11.574 12.504 10.89 11.861 10.399 11.05C10.319 10.931 10.253 10.816 10.201 10.704C10.034 10.374 9.965 10.06 9.996 9.781C10.012 9.637 10.083 9.508 10.188 9.401C10.229 9.36 10.272 9.327 10.315 9.295C10.391 9.239 10.451 9.175 10.504 9.105C10.587 8.99 10.611 8.875 10.616 8.797C10.621 8.73 10.613 8.667 10.595 8.608C10.553 8.469 10.35 8.192 10.105 7.937C9.971 7.798 9.84 7.652 9.741 7.552C9.661 7.472 9.59 7.398 9.513 7.334C9.407 7.247 9.298 7.192 9.179 7.167C9.12 7.155 9.061 7.149 9.001 7.149C8.915 7.149 8.827 7.16 8.739 7.181L8.907 7.698Z" />
            </svg>
          </div>
        );
      case 'facebook':
        return (
          <div className="rounded-full bg-blue-600 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C15.9164 21.5878 18.0622 20.3855 19.6099 18.57C21.1576 16.7546 22.0054 14.4456 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
            </svg>
          </div>
        );
      case 'instagram':
        return (
          <div className="rounded-full bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
            </svg>
          </div>
        );
      case 'twitter':
        return (
          <div className="rounded-full bg-blue-400 p-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.162 5.65593C21.3986 5.99362 20.589 6.2154 19.76 6.31393C20.6337 5.79136 21.2877 4.96894 21.6 3.99993C20.78 4.48793 19.881 4.82993 18.944 5.01493C18.3146 4.34151 17.4804 3.89489 16.5709 3.74451C15.6615 3.59413 14.7279 3.74842 13.9153 4.18338C13.1026 4.61834 12.4564 5.30961 12.0771 6.14972C11.6978 6.98983 11.6067 7.93171 11.818 8.82893C10.1551 8.74558 8.52832 8.31345 7.04328 7.56059C5.55823 6.80773 4.24812 5.75098 3.19799 4.45893C2.82628 5.09738 2.63095 5.82315 2.63199 6.56193C2.63199 8.01193 3.36999 9.29293 4.49199 10.0429C3.828 10.022 3.17862 9.84271 2.59799 9.51993V9.57193C2.59819 10.5376 2.93236 11.4735 3.54384 12.221C4.15532 12.9684 5.00647 13.4814 5.95299 13.6729C5.33661 13.84 4.6903 13.8646 4.06299 13.7449C4.32986 14.5762 4.85 15.3031 5.55058 15.824C6.25117 16.345 7.09712 16.6337 7.96999 16.6499C7.10247 17.3313 6.10917 17.8349 5.04687 18.1321C3.98458 18.4293 2.87412 18.5142 1.77899 18.3819C3.69069 19.6114 5.91609 20.2641 8.18899 20.2619C15.882 20.2619 20.089 13.8889 20.089 8.36193C20.089 8.18193 20.084 7.99993 20.076 7.82193C20.8949 7.23009 21.6016 6.49695 22.163 5.65693L22.162 5.65593Z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="rounded-full bg-gray-400 p-4">
            <span className="text-white text-2xl font-bold">
              {channelData.platform.charAt(0).toUpperCase()}
            </span>
          </div>
        );
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorAlert message={error} />;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      {/* Channel header */}
      <div className="px-4 py-5 sm:px-6 flex flex-col md:flex-row md:items-center">
        <div className="flex items-center">
          {getPlatformIcon()}
          <div className="ml-5">
            <h3 className="text-2xl font-bold text-gray-900">{channelData.name}</h3>
            <div className="mt-1 flex items-center">
              <span className="capitalize text-sm text-gray-500 mr-2">{channelData.platform}</span>
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

      {/* Overview metrics cards */}
      <div className="px-4 sm:px-6 py-4 bg-gray-50">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-orange-500 rounded-md p-3">
                  <HiOutlineChat className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Conversations</dt>
                  <dd className="text-xl font-semibold text-gray-900">{metrics.totalConversations}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                  <HiOutlineDocumentText className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Messages</dt>
                  <dd className="text-xl font-semibold text-gray-900">{metrics.totalMessages}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                  <HiOutlineStatusOnline className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Today</dt>
                  <dd className="text-xl font-semibold text-gray-900">{metrics.activeToday}</dd>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                  <HiOutlineChartBar className="h-6 w-6 text-white" />
                </div>
                <div className="ml-5">
                  <dt className="text-sm font-medium text-gray-500 truncate">Response Rate</dt>
                  <dd className="text-xl font-semibold text-gray-900">{metrics.responseRate}%</dd>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content tabs */}
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
              <div className="space-y-6">
                {/* Connection Details */}
                <div className="bg-white overflow-hidden shadow rounded-lg">
                  <div className="px-4 py-5 sm:px-6">
                    <h3 className="text-lg font-medium leading-6 text-gray-900">Connection Details</h3>
                    <p className="mt-1 max-w-2xl text-sm text-gray-500">
                      Important connection information for your {channelData.platform} channel.
                    </p>
                  </div>
                  <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
                    <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Channel ID</dt>
                        <dd className="mt-1 text-sm text-gray-900">{channelData.channel_id}</dd>
                      </div>
                      <div className="sm:col-span-1">
                        <dt className="text-sm font-medium text-gray-500">Platform Identifier</dt>
                        <dd className="mt-1 text-sm text-gray-900">{channelData.platform_identifier}</dd>
                      </div>
                      <div className="sm:col-span-2">
                        <dt className="text-sm font-medium text-gray-500">Webhook URL</dt>
                        <dd className="mt-1 text-sm text-gray-900">
                          <div className="flex items-center bg-gray-50 rounded-md p-2">
                            <code className="flex-1 font-mono text-sm break-all">{channelData.webhook_url}</code>
                            <CopyToClipboard text={channelData.webhook_url} onCopy={handleCopy}>
                              <button className="ml-2 p-1 text-gray-500 hover:text-gray-700">
                                {copied ? "Copied!" : <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                </svg>}
                              </button>
                            </CopyToClipboard>
                          </div>
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
                
                {/* Channel Config Form */}
                <ChannelConfigForm 
                  channel={channelData} 
                  onSuccess={(updatedChannel) => {
                    setChannelData(updatedChannel);
                    if (onChannelUpdate) {
                      onChannelUpdate(updatedChannel);
                    }
                  }}
                />
              </div>
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      </div>
    </div>
  );
};

export default ChannelDetailView;