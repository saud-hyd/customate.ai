// frontend/dashboard/src/components/integrations/IntegrationCard.jsx
import React, { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

const IntegrationCard = ({ integration, onTestConnection, onDisconnect, onSync, isTestingConnection }) => {
  const [showDetails, setShowDetails] = useState(false);

  const providerIcons = {
    zendesk: (
      <img src="/images/integrations/Zendesk_logo.svg" alt="Zendesk" className="h-8 w-8" />
    ),
    shopify: (
      <img src="/images/integrations/shopify.svg" alt="Shopify" className="h-8 w-8" />
    ),
    salesforce: (
      <img src="/images/integrations/salesforce-logo.svg" alt="Salesforce" className="h-8 w-8" />
    ),
    slack: (
      <img src="/images/integrations/slack-logo.svg" alt="Slack" className="h-8 w-8" />
    ),
    hubspot: (
      <img src="/images/integrations/hubspot.svg" alt="HubSpot" className="h-8 w-8" />
    ),
    default: (
      <div className="bg-gray-100 p-2 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    )
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      connected: {
        color: 'bg-green-100 text-green-800',
        label: 'Connected',
        icon: (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        )
      },
      configured: {
        color: 'bg-yellow-100 text-yellow-800',
        label: 'Configured',
        icon: (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        )
      },
      error: {
        color: 'bg-red-100 text-red-800',
        label: 'Error',
        icon: (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        )
      },
      disconnected: {
        color: 'bg-gray-100 text-gray-800',
        label: 'Disconnected',
        icon: (
          <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        )
      }
    };

    const config = statusConfig[status] || statusConfig.error;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return format(date, 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Never';
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const handleTestConnection = () => {
    onTestConnection(integration.integration_id);
  };

  const handleSync = () => {
    onSync(integration.integration_id);
  };

  const handleDisconnect = () => {
    onDisconnect(integration.integration_id);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          {providerIcons[integration.provider] || providerIcons.default}
          <div>
            <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
            <p className="text-sm text-gray-500 capitalize">{integration.provider}</p>
          </div>
        </div>
        {getStatusBadge(integration.status)}
      </div>

      {/* Status Message */}
      {integration.status_message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          integration.status === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {integration.status_message}
        </div>
      )}

      {/* Connection Info */}
      <div className="space-y-2 mb-4">
        {integration.endpoint_url && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Endpoint:</span>
            <span className="text-gray-900 truncate ml-2" title={integration.endpoint_url}>
              {integration.endpoint_url.length > 30 
                ? `${integration.endpoint_url.substring(0, 30)}...` 
                : integration.endpoint_url}
            </span>
          </div>
        )}
        
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Created:</span>
          <span className="text-gray-900">{formatDate(integration.created_at)}</span>
        </div>
        
        {integration.last_sync && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Last Sync:</span>
            <span className="text-gray-900">{formatRelativeTime(integration.last_sync)}</span>
          </div>
        )}
      </div>

      {/* Sync Information */}
      {integration.latest_sync && (
        <div className="mb-4 p-3 bg-gray-50 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Latest Sync</span>
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              integration.latest_sync.status === 'completed' 
                ? 'bg-green-100 text-green-800'
                : integration.latest_sync.status === 'failed'
                ? 'bg-red-100 text-red-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}>
              {integration.latest_sync.status}
            </span>
          </div>
          
          {integration.latest_sync.status === 'completed' && (
            <div className="grid grid-cols-3 gap-2 text-xs text-gray-600">
              <div className="text-center">
                <div className="font-medium text-gray-900">{integration.latest_sync.items_processed || 0}</div>
                <div>Processed</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-green-600">{integration.latest_sync.items_created || 0}</div>
                <div>Created</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-blue-600">{integration.latest_sync.items_updated || 0}</div>
                <div>Updated</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleTestConnection}
          disabled={isTestingConnection}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
        >
          {isTestingConnection ? (
            <>
              <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Testing...
            </>
          ) : (
            <>
              <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Test
            </>
          )}
        </button>
        
        {integration.status === 'connected' && (
          <button
            onClick={handleSync}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync
          </button>
        )}
        
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          <svg className={`-ml-1 mr-1 h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Details
        </button>
        
        <button
          onClick={handleDisconnect}
          className="inline-flex items-center px-3 py-2 border border-red-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
        >
          <svg className="-ml-1 mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          Disconnect
        </button>
      </div>

      {/* Expandable Details */}
      {showDetails && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="space-y-3">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Integration Details</h4>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Integration ID</dt>
                  <dd className="text-sm text-gray-900 font-mono">{integration.integration_id}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Provider</dt>
                  <dd className="text-sm text-gray-900 capitalize">{integration.provider}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Status</dt>
                  <dd className="text-sm text-gray-900">{integration.status}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Active</dt>
                  <dd className="text-sm text-gray-900">{integration.is_active ? 'Yes' : 'No'}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="text-sm text-gray-900">{formatDate(integration.created_at)} ({formatRelativeTime(integration.created_at)})</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
                  <dd className="text-sm text-gray-900">{formatDate(integration.updated_at)} ({formatRelativeTime(integration.updated_at)})</dd>
                </div>
              </dl>
            </div>

            {/* Configuration Details */}
            {integration.config && Object.keys(integration.config).length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Configuration</h4>
                <div className="bg-gray-50 rounded-md p-3">
                  <pre className="text-xs text-gray-700 overflow-x-auto">
                    {JSON.stringify(integration.config, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationCard;