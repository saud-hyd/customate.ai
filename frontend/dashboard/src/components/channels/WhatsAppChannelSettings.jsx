// frontend/dashboard/src/components/channels/WhatsAppChannelSettings.jsx

import React, { useState, useEffect } from 'react';
import { HiOutlineClipboard, HiOutlineCheck, HiOutlineExternalLink, HiOutlineInformationCircle } from 'react-icons/hi';
import channelService from '../../services/channelService';

const WhatsAppChannelSettings = ({ channel, webhookUrl }) => {
  const [copiedField, setCopiedField] = useState(null);
  const [channelDetails, setChannelDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch complete channel details on mount
  useEffect(() => {
    const fetchChannelDetails = async () => {
      try {
        setLoading(true);
        const response = await channelService.getChannelById(channel.channel_id);
        setChannelDetails(response.data);
      } catch (error) {
        console.error('Error fetching channel details:', error);
        setChannelDetails(channel); // Fallback to passed channel
      } finally {
        setLoading(false);
      }
    };

    fetchChannelDetails();
  }, [channel.channel_id]);

  const copyToClipboard = async (text, fieldName) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  // Use channelDetails if available, otherwise fallback to passed channel
  const currentChannel = channelDetails || channel;
  const credentials = currentChannel.credentials || {};
  
  // Extract values with fallbacks
  const phoneNumberId = credentials.phone_number_id || currentChannel.platform_identifier || 'Not configured';
  const apiVersion = credentials.api_version || 'v18.0';

  const connectionDetails = [
    {
      label: 'Webhook URL',
      value: webhookUrl,
      description: 'Copy this URL and paste it in Meta Developer Console > Webhooks > Callback URL',
      copyKey: 'webhook_url',
      required: true
    },
    {
      label: 'Phone Number ID',
      value: phoneNumberId,
      description: 'Your WhatsApp Business phone number ID',
      copyKey: 'phone_id',
      required: false
    },
    {
      label: 'API Version',
      value: apiVersion,
      description: 'WhatsApp Business API version being used',
      copyKey: 'api_version',
      required: false
    }
  ];

  const webhookEvents = [
    'messages',
    'message_deliveries',
    'message_reads',
    'message_echoes'
  ];

  return (
    <div className="space-y-6">
      {/* Connection Details */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Meta Developer Console Configuration
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Use these details to configure webhooks in your Meta Developer Console.
          </p>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            {connectionDetails.map((detail, index) => (
              <div
                key={detail.copyKey}
                className={`${
                  index % 2 === 0 ? 'bg-gray-50' : 'bg-white'
                } px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
              >
                <dt className="text-sm font-medium text-gray-500 flex items-center">
                  {detail.label}
                  {detail.required && (
                    <span className="ml-1 text-red-500">*</span>
                  )}
                </dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <code className="bg-gray-100 px-2 py-1 rounded text-xs font-mono break-all mr-2">
                        {detail.value}
                      </code>
                      <p className="mt-1 text-xs text-gray-500">
                        {detail.description}
                      </p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(detail.value, detail.copyKey)}
                      className="ml-3 flex-shrink-0 inline-flex items-center px-3 py-1 border border-gray-300 shadow-sm text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                      disabled={detail.value === 'Not configured'}
                    >
                      {copiedField === detail.copyKey ? (
                        <>
                          <HiOutlineCheck className="h-4 w-4 mr-1 text-green-500" />
                          Copied
                        </>
                      ) : (
                        <>
                          <HiOutlineClipboard className="h-4 w-4 mr-1" />
                          Copy
                        </>
                      )}
                    </button>
                  </div>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </div>

      {/* Webhook Events Configuration */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Required Webhook Events
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Subscribe to these webhook events in Meta Developer Console.
          </p>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
          <div className="grid grid-cols-2 gap-4">
            {webhookEvents.map((event) => (
              <div key={event} className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">{event}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <HiOutlineInformationCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Meta Developer Console Setup Steps
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <ol className="list-decimal list-inside space-y-1">
                <li>Go to Meta Developer Console → Your App → Webhooks</li>
                <li>Click "Edit" for WhatsApp webhook subscription</li>
                <li>Paste the Webhook URL in "Callback URL" field</li>
                <li>Subscribe to the required webhook events listed above</li>
                <li>Click "Verify and Save" to test the connection</li>
              </ol>
            </div>
            <div className="mt-4">
              <a
                href="https://developers.facebook.com/apps"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-500"
              >
                Open Meta Developer Console
                <HiOutlineExternalLink className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="bg-white overflow-hidden shadow rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Connection Status
          </h3>
          <div className="mt-4 flex items-center">
            <div className={`flex-shrink-0 w-3 h-3 rounded-full ${
              currentChannel.active ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className={`ml-2 text-sm font-medium ${
              currentChannel.active ? 'text-green-800' : 'text-red-800'
            }`}>
              {currentChannel.active ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          {!currentChannel.active && (
            <p className="mt-2 text-sm text-gray-500">
              Channel is inactive. Please check your webhook configuration and credentials.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default WhatsAppChannelSettings;