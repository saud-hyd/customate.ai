// frontend/dashboard/src/pages/GmailCallbackPage.jsx

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HiCheck, HiExclamation, HiMail } from 'react-icons/hi';
import LoadingSpinner from '../components/common/LoadingSpinner';
import Button from '../components/common/Button';
import channelService from '../services/channelService';

const GmailCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const [channelData, setChannelData] = useState(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');
      const error = searchParams.get('error');

      // Check for OAuth errors
      if (error) {
        setError(`OAuth error: ${error}`);
        setLoading(false);
        return;
      }

      if (!code || !state) {
        setError('Missing authorization code or state parameter');
        setLoading(false);
        return;
      }

      try {
        // Exchange code for tokens
        const result = await channelService.exchangeGmailToken(code, state);
        
        setUserInfo(result.data.user_info);
        
        // Create Gmail channel
        const channelResult = await channelService.createGmailChannel({
          name: `Gmail - ${result.data.user_info.email}`,
          email_address: result.data.user_info.email,
          access_token: result.data.tokens.access_token,
          refresh_token: result.data.tokens.refresh_token,
          client_id: result.data.tokens.client_id,
          client_secret: result.data.tokens.client_secret,
          config: {
            auto_reply: true,
            signature: '',
            label_ids: ['INBOX'],
            watch_labels: ['UNREAD']
          }
        });

        setChannelData(channelResult.data.channel);
        setSuccess(true);

      } catch (err) {
        console.error('Gmail OAuth callback error:', err);
        setError(err.message || 'Failed to complete Gmail authorization');
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams]);

  const handleContinue = () => {
    navigate('/dashboard/channels');
  };

  const handleRetry = () => {
    navigate('/dashboard/channels');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <HiMail className="mx-auto h-12 w-12 text-red-500" />
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Setting up Gmail Integration
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Please wait while we complete your Gmail authorization...
              </p>
              <div className="mt-6">
                <LoadingSpinner />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <HiCheck className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Gmail Connected Successfully!
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                Your Gmail account has been connected and is ready to receive AI-powered responses.
              </p>
              
              {userInfo && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <div className="text-sm">
                    <div className="font-medium text-gray-900">Connected Account</div>
                    <div className="text-gray-600">{userInfo.email}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {userInfo.messages_total} messages • {userInfo.threads_total} threads
                    </div>
                  </div>
                </div>
              )}

              {channelData && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <div className="text-sm">
                    <div className="font-medium text-blue-900">Channel Details</div>
                    <div className="text-blue-700">{channelData.name}</div>
                    <div className="text-blue-600 text-xs mt-1">
                      Status: {channelData.active ? 'Active' : 'Inactive'}
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-6">
                <Button onClick={handleContinue} className="w-full">
                  Go to Channels Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                <HiExclamation className="h-6 w-6 text-red-600" />
              </div>
              <h2 className="mt-4 text-lg font-medium text-gray-900">
                Gmail Connection Failed
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                There was an error connecting your Gmail account.
              </p>
              
              <div className="mt-4 p-3 bg-red-50 rounded-md">
                <div className="text-sm text-red-700">
                  {error}
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <Button onClick={handleRetry} className="w-full">
                  Try Again
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => navigate('/dashboard')}
                  className="w-full"
                >
                  Go to Dashboard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GmailCallbackPage;