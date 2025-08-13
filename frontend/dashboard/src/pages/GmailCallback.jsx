// Gmail OAuth Callback Page - Industry standard B2B OAuth flow
import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { HiCheck, HiExclamation, HiRefresh } from 'react-icons/hi';
import LoadingSpinner from '../components/common/LoadingSpinner';

const GmailCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Processing Gmail authorization...');
  const [userEmail, setUserEmail] = useState('');
  const hasProcessed = useRef(false);

  useEffect(() => {
    // Prevent multiple executions (React StrictMode in development)
    if (hasProcessed.current) {
      console.log('OAuth callback already processed, skipping');
      return;
    }
    hasProcessed.current = true;
    const processOAuthCallback = async () => {
      try {
        // Check if user is authenticated
        const token = localStorage.getItem('token');
        if (!token) {
          setStatus('error');
          setMessage('Authentication required. Please log in and try connecting Gmail again.');
          return;
        }

        // Extract OAuth parameters from URL
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // Handle OAuth errors from Google
        if (error) {
          console.error('OAuth error:', error, errorDescription);
          setStatus('error');
          setMessage(`Authorization failed: ${errorDescription || error}`);
          return;
        }

        // Validate required parameters
        if (!code || !state) {
          setStatus('error');
          setMessage('Missing authorization code or state. Please try connecting again.');
          return;
        }

        console.log('Processing OAuth callback with code:', code.substring(0, 10) + '...');

        // Exchange authorization code for tokens
        const backendUrl = process.env.NODE_ENV === 'development' ? 'http://localhost:8000' : '';
        const apiUrl = `${backendUrl}/api/gmail/oauth/callback`;
        console.log('Making token exchange request to:', apiUrl);
        
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            code: code,
            state: state
          })
        });

        console.log('Token exchange response status:', response.status);
        console.log('Token exchange response headers:', response.headers);

        if (!response.ok) {
          // Try to get the response text first to see what we're actually receiving
          const responseText = await response.text();
          console.error('Token exchange failed. Response text:', responseText);
          
          try {
            const errorData = JSON.parse(responseText);
            throw new Error(errorData.detail || 'Failed to exchange authorization code');
          } catch (parseError) {
            // If it's not JSON, show the raw response
            throw new Error(`Server returned non-JSON response: ${responseText.substring(0, 200)}...`);
          }
        }

        const responseText = await response.text();
        console.log('Raw token exchange response:', responseText);
        
        try {
          const tokenData = JSON.parse(responseText);
          console.log('Parsed token data:', tokenData);
        } catch (parseError) {
          console.error('Failed to parse JSON response:', parseError);
          throw new Error(`Invalid JSON response from server: ${responseText.substring(0, 200)}...`);
        }
        
        const tokenData = JSON.parse(responseText);
        console.log('Token exchange successful for email:', tokenData.user_info?.email);

        // Create Gmail channel with received tokens
        const channelApiUrl = `${backendUrl}/api/gmail/create`;
        console.log('Creating Gmail channel at:', channelApiUrl);
        
        const channelResponse = await fetch(channelApiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({
            name: `Gmail - ${tokenData.user_info.email}`,
            email_address: tokenData.user_info.email,
            access_token: tokenData.tokens.access_token,
            refresh_token: tokenData.tokens.refresh_token,
            config: {
              auto_reply: true,
              signature: '',
              label_ids: ['INBOX'],
              watch_labels: ['UNREAD']
            }
          })
        });

        if (!channelResponse.ok) {
          const channelError = await channelResponse.json();
          throw new Error(channelError.detail || 'Failed to create Gmail channel');
        }

        const channelResult = await channelResponse.json();
        console.log('Gmail channel created successfully:', channelResult.channel?.channel_id);

        // Success!
        setStatus('success');
        setUserEmail(tokenData.user_info.email);
        setMessage('Gmail account connected successfully!');

        // Redirect to channels page after 3 seconds
        setTimeout(() => {
          navigate('/channels?gmail=connected');
        }, 3000);

      } catch (error) {
        console.error('OAuth callback processing failed:', error);
        setStatus('error');
        setMessage(error.message || 'Failed to connect Gmail account. Please try again.');
      }
    };

    processOAuthCallback();
  }, [searchParams, navigate]);

  const handleRetry = () => {
    navigate('/channels');
  };

  const handleGoToChannels = () => {
    navigate('/channels');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            {/* Gmail Logo */}
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <svg className="h-6 w-6 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4ZM20 8L12 13L4 8V6L12 11L20 6V8Z"/>
              </svg>
            </div>

            {/* Status Content */}
            {status === 'processing' && (
              <>
                <LoadingSpinner />
                <h2 className="mt-4 text-lg font-medium text-gray-900">
                  Connecting Gmail Account
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
              </>
            )}

            {status === 'success' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100 mb-4">
                  <HiCheck className="h-6 w-6 text-green-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">
                  Gmail Connected Successfully!
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {userEmail && (
                    <>
                      <span className="font-medium">{userEmail}</span> has been connected to your chatbot.
                    </>
                  )}
                </p>
                <p className="mt-2 text-xs text-gray-500">
                  Redirecting to channels page in a few seconds...
                </p>
                <div className="mt-4">
                  <button
                    onClick={handleGoToChannels}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Go to Channels
                  </button>
                </div>
              </>
            )}

            {status === 'error' && (
              <>
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                  <HiExclamation className="h-6 w-6 text-red-600" />
                </div>
                <h2 className="text-lg font-medium text-gray-900">
                  Connection Failed
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {message}
                </p>
                <div className="mt-4 space-x-3">
                  <button
                    onClick={handleRetry}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <HiRefresh className="mr-2 h-4 w-4" />
                    Try Again
                  </button>
                  <button
                    onClick={handleGoToChannels}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Back to Channels
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs text-gray-500">
          Powered by Customate.ai • Secure OAuth 2.0 Authentication
        </p>
      </div>
    </div>
  );
};

export default GmailCallback;