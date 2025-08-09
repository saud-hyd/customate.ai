// frontend/dashboard/src/components/channels/GmailChannelSettings.jsx

import React, { useState, useEffect } from 'react';
import { Switch } from '@headlessui/react';
import { 
  HiCheck, 
  HiExclamation, 
  HiMail, 
  HiRefresh,
  HiTrash,
  HiExternalLink,
  HiSearch 
} from 'react-icons/hi';
import LoadingSpinner from '../common/LoadingSpinner';
import Button from '../common/Button';
import Modal from '../common/Modal';

const GmailChannelSettings = ({ channel, onSuccess }) => {
  const [formData, setFormData] = useState({
    name: channel?.name || '',
    active: channel?.active || true,
    config: {
      auto_reply: true,
      signature: '',
      label_ids: ['INBOX'],
      watch_labels: ['UNREAD'],
      ...channel?.config
    }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showOAuthModal, setShowOAuthModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [oauthConfig, setOauthConfig] = useState({
    client_id: '',
    client_secret: '',
    redirect_uri: window.location.origin + '/gmail/callback'
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('config.')) {
      const configKey = name.replace('config.', '');
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          [configKey]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleSwitchChange = (name, checked) => {
    if (name.startsWith('config.')) {
      const configKey = name.replace('config.', '');
      setFormData({
        ...formData,
        config: {
          ...formData.config,
          [configKey]: checked
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: checked
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch(`/api/channel/${channel.channel_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update channel');
      }

      const result = await response.json();
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess(result);
      }
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to update channel. Please try again.');
      console.error('Error updating Gmail channel:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSetup = async () => {
    if (!oauthConfig.client_id || !oauthConfig.client_secret) {
      setError('Please provide Google OAuth Client ID and Client Secret');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/channel/gmail/oauth/authorize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(oauthConfig)
      });

      if (!response.ok) {
        throw new Error('Failed to initiate OAuth');
      }

      const result = await response.json();
      
      // Redirect to Google OAuth
      window.location.href = result.authorization_url;
      
    } catch (err) {
      setError(err.message || 'Failed to start Gmail authorization');
      console.error('Error starting OAuth:', err);
    } finally {
      setLoading(false);
      setShowOAuthModal(false);
    }
  };

  const handleRefreshTokens = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/channel/gmail/${channel.channel_id}/refresh-tokens`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to refresh tokens');
      }

      const result = await response.json();
      setSuccess(true);
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      setError(err.message || 'Failed to refresh Gmail tokens');
      console.error('Error refreshing tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeAccess = async () => {
    if (!window.confirm('Are you sure you want to revoke Gmail access and delete this channel? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/channel/gmail/${channel.channel_id}/revoke`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to revoke access');
      }

      if (onSuccess) {
        onSuccess({ deleted: true });
      }
      
    } catch (err) {
      setError(err.message || 'Failed to revoke Gmail access');
      console.error('Error revoking access:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex justify-center">
            <LoadingSpinner />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white overflow-hidden shadow rounded-lg">
      <div className="px-4 py-5 sm:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium leading-6 text-gray-900 flex items-center">
              <HiMail className="mr-2 h-5 w-5 text-red-500" />
              Gmail Channel Settings
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Configure your Gmail integration settings and OAuth authentication.
            </p>
          </div>
          {channel && (
            <div className="flex space-x-2">
              <Button
                onClick={() => setShowSearchModal(true)}
                variant="outline"
                size="sm"
              >
                <HiSearch className="mr-2 h-4 w-4" />
                Search Emails
              </Button>
              <Button
                onClick={handleRefreshTokens}
                variant="outline"
                size="sm"
              >
                <HiRefresh className="mr-2 h-4 w-4" />
                Refresh Tokens
              </Button>
              <Button
                onClick={handleRevokeAccess}
                variant="danger"
                size="sm"
              >
                <HiTrash className="mr-2 h-4 w-4" />
                Revoke Access
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {error && (
        <div className="mx-6 mb-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiExclamation className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="mx-6 mb-4 rounded-md bg-green-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiCheck className="h-5 w-5 text-green-400" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">Success</h3>
              <div className="mt-2 text-sm text-green-700">
                <p>Gmail channel settings updated successfully!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="px-6 pb-6">
        <div className="space-y-6">
          {/* Basic Settings */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Settings</h4>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Channel Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter channel name"
                />
              </div>
              
              <div className="flex items-center">
                <Switch
                  checked={formData.active}
                  onChange={(checked) => handleSwitchChange('active', checked)}
                  className={`${
                    formData.active ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  <span className="sr-only">Enable channel</span>
                  <span
                    className={`${
                      formData.active ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                  >
                    <span
                      className={`${
                        formData.active ? 'opacity-0 ease-out duration-100' : 'opacity-100 ease-in duration-200'
                      } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                    >
                      <svg className="bg-white h-3 w-3 text-gray-400" fill="none" viewBox="0 0 12 12">
                        <path
                          d="M4 8l2-2m0 0l2-2M6 6L4 4m2 2l2 2"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span
                      className={`${
                        formData.active ? 'opacity-100 ease-in duration-200' : 'opacity-0 ease-out duration-100'
                      } absolute inset-0 h-full w-full flex items-center justify-center transition-opacity`}
                    >
                      <svg className="bg-white h-3 w-3 text-indigo-600" fill="currentColor" viewBox="0 0 12 12">
                        <path d="M3.707 5.293a1 1 0 00-1.414 1.414l1.414-1.414zM5 8l-.707.707a1 1 0 001.414 0L5 8zm4.707-3.293a1 1 0 00-1.414-1.414l1.414 1.414zm-7.414 2l2 2 1.414-1.414-2-2-1.414 1.414zm3.414 2l4-4-1.414-1.414-4 4 1.414 1.414z" />
                      </svg>
                    </span>
                  </span>
                </Switch>
                <span className="ml-3 text-sm text-gray-700">Channel Active</span>
              </div>
            </div>
          </div>

          {/* Gmail Configuration */}
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Gmail Configuration</h4>
            <div className="space-y-4">
              <div className="flex items-center">
                <Switch
                  checked={formData.config.auto_reply}
                  onChange={(checked) => handleSwitchChange('config.auto_reply', checked)}
                  className={`${
                    formData.config.auto_reply ? 'bg-indigo-600' : 'bg-gray-200'
                  } relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                >
                  <span className="sr-only">Enable auto-reply</span>
                  <span
                    className={`${
                      formData.config.auto_reply ? 'translate-x-5' : 'translate-x-0'
                    } pointer-events-none relative inline-block h-5 w-5 rounded-full bg-white shadow transform ring-0 transition ease-in-out duration-200`}
                  />
                </Switch>
                <span className="ml-3 text-sm text-gray-700">Automatic AI Replies</span>
              </div>

              <div>
                <label htmlFor="config.signature" className="block text-sm font-medium text-gray-700">
                  Email Signature
                </label>
                <textarea
                  name="config.signature"
                  id="config.signature"
                  rows={3}
                  value={formData.config.signature}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Enter your email signature (optional)"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="config.label_ids" className="block text-sm font-medium text-gray-700">
                    Monitor Labels (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="config.label_ids"
                    id="config.label_ids"
                    value={Array.isArray(formData.config.label_ids) ? formData.config.label_ids.join(', ') : formData.config.label_ids}
                    onChange={(e) => handleInputChange({
                      target: {
                        name: 'config.label_ids',
                        value: e.target.value.split(',').map(l => l.trim()).filter(l => l)
                      }
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="INBOX, IMPORTANT"
                  />
                </div>

                <div>
                  <label htmlFor="config.watch_labels" className="block text-sm font-medium text-gray-700">
                    Watch Labels (comma-separated)
                  </label>
                  <input
                    type="text"
                    name="config.watch_labels"
                    id="config.watch_labels"
                    value={Array.isArray(formData.config.watch_labels) ? formData.config.watch_labels.join(', ') : formData.config.watch_labels}
                    onChange={(e) => handleInputChange({
                      target: {
                        name: 'config.watch_labels',
                        value: e.target.value.split(',').map(l => l.trim()).filter(l => l)
                      }
                    })}
                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    placeholder="UNREAD, IMPORTANT"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* OAuth Setup */}
          {!channel && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-4">Google OAuth Setup</h4>
              <p className="text-sm text-gray-600 mb-4">
                To connect Gmail, you'll need to set up Google OAuth credentials. 
                <a 
                  href="https://console.developers.google.com/apis/credentials" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="ml-1 text-indigo-600 hover:text-indigo-500"
                >
                  Get credentials here <HiExternalLink className="inline h-4 w-4" />
                </a>
              </p>
              <Button
                type="button"
                onClick={() => setShowOAuthModal(true)}
                variant="outline"
                className="w-full"
              >
                Setup Gmail OAuth
              </Button>
            </div>
          )}
        </div>

        {channel && (
          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Settings'}
            </Button>
          </div>
        )}
      </form>

      {/* OAuth Setup Modal */}
      <Modal
        isOpen={showOAuthModal}
        onClose={() => setShowOAuthModal(false)}
        title="Setup Gmail OAuth"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter your Google OAuth credentials to connect Gmail. You can get these from the 
            <a 
              href="https://console.developers.google.com/apis/credentials" 
              target="_blank" 
              rel="noopener noreferrer"
              className="ml-1 text-indigo-600 hover:text-indigo-500"
            >
              Google Developers Console <HiExternalLink className="inline h-4 w-4" />
            </a>
          </p>
          
          <div>
            <label htmlFor="oauth_client_id" className="block text-sm font-medium text-gray-700">
              Google Client ID
            </label>
            <input
              type="text"
              id="oauth_client_id"
              value={oauthConfig.client_id}
              onChange={(e) => setOauthConfig({ ...oauthConfig, client_id: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter Google OAuth Client ID"
            />
          </div>
          
          <div>
            <label htmlFor="oauth_client_secret" className="block text-sm font-medium text-gray-700">
              Google Client Secret
            </label>
            <input
              type="password"
              id="oauth_client_secret"
              value={oauthConfig.client_secret}
              onChange={(e) => setOauthConfig({ ...oauthConfig, client_secret: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Enter Google OAuth Client Secret"
            />
          </div>
          
          <div>
            <label htmlFor="oauth_redirect_uri" className="block text-sm font-medium text-gray-700">
              Redirect URI
            </label>
            <input
              type="text"
              id="oauth_redirect_uri"
              value={oauthConfig.redirect_uri}
              onChange={(e) => setOauthConfig({ ...oauthConfig, redirect_uri: e.target.value })}
              className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Add this URI to your Google OAuth app's authorized redirect URIs
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <Button
              variant="outline"
              onClick={() => setShowOAuthModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOAuthSetup}
              disabled={loading}
            >
              {loading ? 'Connecting...' : 'Connect Gmail'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Gmail Search Modal - placeholder */}
      <Modal
        isOpen={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        title="Search Gmail"
        size="lg"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Search functionality will be implemented here.
          </p>
          <Button
            variant="outline"
            onClick={() => setShowSearchModal(false)}
          >
            Close
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default GmailChannelSettings;