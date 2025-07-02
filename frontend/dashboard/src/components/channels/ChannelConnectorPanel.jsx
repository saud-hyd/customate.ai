// frontend/dashboard/src/components/channels/ChannelConnectorPanel.jsx

import React, { useState } from 'react';
import { HiCheck, HiOutlineExclamation } from 'react-icons/hi';
import channelService from '../../services/channelService';
import LoadingSpinner from '../common/LoadingSpinner';

const platforms = [
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Connect with customers through WhatsApp Business API',
    color: 'bg-green-500',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.001 2C17.524 2 22 6.475 22 11.999C22 17.523 17.524 22 12.001 22C10.051 22 8.235 21.473 6.699 20.546L2 22L3.454 17.301C2.527 15.765 2 13.949 2 11.999C2 6.475 6.477 2 12.001 2Z"/>
      </svg>
    ),
    fields: [
      { 
        name: 'phone_number_id', 
        label: 'Phone Number ID', 
        required: true,
        helpText: 'Get this from WhatsApp Business Manager → Phone Numbers → [Your Number] → ID'
      },
      { 
        name: 'access_token', 
        label: 'Permanent Access Token', 
        required: true, 
        type: 'password',
        helpText: 'Generate from Meta Business Settings → System Users → Create Permanent Token'
      },
      { 
        name: 'app_secret', 
        label: 'App Secret', 
        required: true, 
        type: 'password',
        helpText: 'From Meta Developers → Your App → Settings → Basic → App Secret'
      },
      { 
        name: 'webhook_secret', 
        label: 'Webhook Verify Token', 
        required: true, 
        type: 'password',
        helpText: 'Create a custom secret (e.g., "mybot_webhook_2025") for webhook verification'
      },
      { 
        name: 'api_version', 
        label: 'API Version', 
        required: false,
        defaultValue: 'v18.0',
        helpText: 'Use v18.0 or later for 2025 features'
      }
    ]
  },
  {
    id: 'facebook',
    name: 'Facebook Messenger',
    description: 'Engage with customers via Facebook Messenger',
    color: 'bg-blue-600',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.04C6.5 2.04 2 6.53 2 12.06C2 17.06 5.66 21.21 10.44 21.96V14.96H7.9V12.06H10.44V9.85C10.44 7.34 11.93 5.96 14.22 5.96C15.31 5.96 16.45 6.15 16.45 6.15V8.62H15.19C13.95 8.62 13.56 9.39 13.56 10.18V12.06H16.34L15.89 14.96H13.56V21.96C15.9164 21.5878 18.0622 20.3855 19.6099 18.57C21.1576 16.7546 22.0054 14.4456 22 12.06C22 6.53 17.5 2.04 12 2.04Z" />
      </svg>
    ),
    fields: [
      { name: 'page_id', label: 'Page ID', required: true },
      { name: 'access_token', label: 'Page Access Token', required: true, type: 'password' },
      { name: 'app_secret', label: 'App Secret', required: true, type: 'password' },
    ]
  },
  {
    id: 'instagram',
    name: 'Instagram',
    description: 'Respond to customer DMs on Instagram',
    color: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-500',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
    fields: [
      { name: 'instagram_account_id', label: 'Instagram Account ID', required: true },
      { name: 'access_token', label: 'Access Token', required: true, type: 'password' },
      { name: 'app_secret', label: 'App Secret', required: true, type: 'password' },
    ]
  },
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Handle customer service through Twitter DMs',
    color: 'bg-blue-400',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.162 5.65593C21.3986 5.99362 20.589 6.2154 19.76 6.31393C20.6337 5.79136 21.2877 4.96894 21.6 3.99993C20.78 4.48793 19.881 4.82993 18.944 5.01493C18.3146 4.34151 17.4804 3.89489 16.5709 3.74451C15.6615 3.59413 14.7279 3.74842 13.9153 4.18338C13.1026 4.61834 12.4564 5.30961 12.0771 6.14972C11.6978 6.98983 11.6067 7.93171 11.818 8.82893C10.1551 8.74558 8.52832 8.31345 7.04328 7.56059C5.55823 6.80773 4.24812 5.75098 3.19799 4.45893C2.82628 5.09738 2.63095 5.82315 2.63199 6.56193C2.63199 8.01193 3.36999 9.29293 4.49199 10.0429C3.828 10.022 3.17862 9.84271 2.59799 9.51993V9.57193C2.59819 10.5376 2.93236 11.4735 3.54384 12.221C4.15532 12.9684 5.00647 13.4814 5.95299 13.6729C5.33661 13.84 4.6903 13.8646 4.06299 13.7449C4.32986 14.5762 4.85 15.3031 5.55058 15.824C6.25117 16.345 7.09712 16.6337 7.96999 16.6499C7.10247 17.3313 6.10917 17.8349 5.04687 18.1321C3.98458 18.4293 2.87412 18.5142 1.77899 18.3819C3.69069 19.6114 5.91609 20.2641 8.18899 20.2619C15.882 20.2619 20.089 13.8889 20.089 8.36193C20.089 8.18193 20.084 7.99993 20.076 7.82193C20.8949 7.23009 21.6016 6.49695 22.163 5.65693L22.162 5.65593Z" />
      </svg>
    ),
    fields: [
      { name: 'api_key', label: 'API Key', required: true, type: 'password' },
      { name: 'api_secret', label: 'API Secret', required: true, type: 'password' },
      { name: 'access_token', label: 'Access Token', required: true, type: 'password' },
      { name: 'access_token_secret', label: 'Access Token Secret', required: true, type: 'password' },
      { name: 'bearer_token', label: 'Bearer Token', required: true, type: 'password' },
    ]
  }
];

const ChannelConnectorPanel = ({ onChannelCreated, onCancel }) => {
  const [step, setStep] = useState(1); // 1: Select platform, 2: Configure, 3: Success
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handlePlatformSelect = (platform) => {
    setSelectedPlatform(platform);
    setFormData({ name: `My ${platform.name} Channel` });
    setStep(2);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Format credentials based on platform
      const credentials = {};
      selectedPlatform.fields.forEach(field => {
        credentials[field.name] = formData[field.name];
      });
      
      // Get the platform identifier field name
      let platformIdentifierField;
      switch (selectedPlatform.id) {
        case 'whatsapp':
          platformIdentifierField = 'phone_number_id';
          break;
        case 'facebook':
          platformIdentifierField = 'page_id';
          break;
        case 'instagram':
          platformIdentifierField = 'instagram_account_id';
          break;
        case 'twitter':
          platformIdentifierField = 'api_key';
          break;
        default:
          platformIdentifierField = selectedPlatform.fields[0].name;
      }
      
      // Prepare data for API
      const channelData = {
        name: formData.name,
        platform: selectedPlatform.id,
        platform_identifier: formData[platformIdentifierField],
        credentials,
        config: {}
      };
      
      const response = await channelService.createChannel(channelData);
      setStep(3);
      
      // Call the callback with the new channel
      if (onChannelCreated && response.data) {
        onChannelCreated(response.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to connect channel. Please check your credentials and try again.');
      console.error('Error connecting channel:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderStepOne = () => (
    <div className="space-y-6">
      <div className="text-center pb-4">
        <h2 className="text-xl font-bold text-gray-900">Select a Messaging Platform</h2>
        <p className="mt-1 text-sm text-gray-500">
          Choose a platform to connect with your customers
        </p>
      </div>
      
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {platforms.map((platform) => (
          <div 
            key={platform.id}
            onClick={() => handlePlatformSelect(platform)}
            className="relative bg-white rounded-lg shadow border overflow-hidden cursor-pointer hover:shadow-md transition-shadow duration-300"
          >
            <div className="h-3 w-full" style={{ backgroundColor: platform.color.startsWith('bg-gradient') ? '#9333ea' : undefined }} />
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${platform.color} rounded-full p-3`}>
                  {platform.icon}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">{platform.name}</h3>
                  <p className="text-sm text-gray-500">{platform.description}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-4 py-3 sm:px-6 flex justify-end">
              <span className="text-sm font-medium text-orange-600 flex items-center">
                Connect
                <svg className="ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderStepTwo = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 flex items-center">
        <div className={`flex-shrink-0 ${selectedPlatform.color} rounded-full p-3 mr-4`}>
          {selectedPlatform.icon}
        </div>
        <div>
          <h3 className="text-lg font-medium leading-6 text-gray-900">
            Connect to {selectedPlatform.name}
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-gray-500">
            Enter your {selectedPlatform.name} API credentials.
          </p>
        </div>
      </div>
      
      {error && (
        <div className="mx-6 mt-4 rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <HiOutlineExclamation className="h-5 w-5 text-red-400" />
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
      
      <div className="border-t border-gray-200 px-4 py-5 sm:p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Channel Name
            </label>
            <div className="mt-1">
              <input
                type="text"
                name="name"
                id="name"
                value={formData.name || ''}
                onChange={handleInputChange}
                required
                className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
              />
            </div>
            <p className="mt-1 text-xs text-gray-500">
              This is how you'll identify this channel in your dashboard.
            </p>
          </div>
          
          {/* Platform-specific fields */}
          <div className="space-y-4">
            {selectedPlatform.fields.map((field) => (
              <div key={field.name}>
                <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                <div className="mt-1">
                  <input
                    type={field.type || "text"}
                    name={field.name}
                    id={field.name}
                    value={formData[field.name] || ''}
                    onChange={handleInputChange}
                    required={field.required}
                    className="shadow-sm focus:ring-orange-500 focus:border-orange-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  />
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-5">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                {loading ? (
                  <span className="flex items-center">
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Connecting...</span>
                  </span>
                ) : (
                  'Connect Channel'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );

  const renderStepThree = () => (
    <div className="bg-white shadow overflow-hidden sm:rounded-lg">
      <div className="px-4 py-5 sm:px-6 text-center">
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <HiCheck className="h-6 w-6 text-green-600" />
        </div>
        <h3 className="mt-2 text-lg font-medium text-gray-900">Channel Connected Successfully!</h3>
        <p className="mt-1 text-sm text-gray-500">
          Your {selectedPlatform.name} channel has been set up and is ready to use.
        </p>
        
        <div className="mt-6 pb-6">
          <button
            onClick={() => setStep(1)}
            className="mr-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Connect Another
          </button>
          <button
            onClick={onCancel}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Go to Channels
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      {step === 1 && renderStepOne()}
      {step === 2 && renderStepTwo()}
      {step === 3 && renderStepThree()}
    </div>
  );
};

export default ChannelConnectorPanel;