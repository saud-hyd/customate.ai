// frontend/dashboard/src/pages/channels/ChannelsPage.jsx

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { HiPlus, HiOutlineRefresh } from 'react-icons/hi';
import ChannelList from '../../components/channels/ChannelList';
import ChannelDetailView from '../../components/channels/ChannelDetailView';
import ChannelConnectorPanel from '../../components/channels/ChannelConnectorPanel';
import channelService from '../../services/channelService';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorAlert from '../../components/common/ErrorAlert';

const ChannelsPage = () => {
  const { t } = useTranslation(['channels', 'common']);
  const [channels, setChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [view, setView] = useState('list'); // 'list', 'detail', 'connect'
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        setIsLoading(true);
        const response = await channelService.getChannels();
        setChannels(response.data || []);
        setError(null);
      } catch (err) {
        setError('Failed to load channels. Please try again.');
        console.error('Error fetching channels:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchChannels();
  }, [refreshTrigger]);

  const handleChannelSelect = (channel) => {
    setSelectedChannel(channel);
    setView('detail');
  };

  const handleConnectClick = () => {
    setView('connect');
    setSelectedChannel(null);
  };

  const handleBackToList = () => {
    setView('list');
    setSelectedChannel(null);
  };

  const handleChannelCreated = (newChannel) => {
    setChannels([...channels, newChannel]);
    setSelectedChannel(newChannel);
    setView('detail');
  };

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('channels:pages.messagingChannels')}</h1>
            <p className="mt-1 text-sm text-gray-500">
              Connect with customers across multiple messaging platforms
            </p>
          </div>
          <div className="flex space-x-3">
            {view === 'list' && (
              <>
                <button
                  onClick={handleRefresh}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <HiOutlineRefresh className="h-4 w-4 mr-2" />
                  {t('common:actions.refresh')}
                </button>
                <button
                  onClick={handleConnectClick}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  <HiPlus className="h-4 w-4 mr-2" />
                  {t('channels:connect')} {t('channels:title')}
                </button>
              </>
            )}
            {(view === 'detail' || view === 'connect') && (
              <button
                onClick={handleBackToList}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                ← {t('common:actions.back')} to {t('channels:title')}
              </button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <ErrorAlert message={error} />
        ) : (
          <div>
            {view === 'list' && (
              <ChannelList 
                channels={channels} 
                onChannelSelect={handleChannelSelect} 
                onConnectClick={handleConnectClick} 
              />
            )}
            {view === 'detail' && selectedChannel && (
              <ChannelDetailView 
                channel={selectedChannel} 
                onBack={handleBackToList} 
                onChannelUpdate={(updatedChannel) => {
                  setChannels(channels.map(ch => 
                    ch.channel_id === updatedChannel.channel_id ? updatedChannel : ch
                  ));
                  setSelectedChannel(updatedChannel);
                }}
              />
            )}
            {view === 'connect' && (
              <ChannelConnectorPanel 
                onChannelCreated={handleChannelCreated} 
                onCancel={handleBackToList} 
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChannelsPage;