// frontend/dashboard/src/components/integrations/IntegrationCard.jsx
import React from 'react';
import { format, formatDistanceToNow } from 'date-fns';

const IntegrationCard = ({ integration, onTestConnection, onDisconnect, onSync }) => {
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
          <div className="bg-gray-100 p-3 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
        )
      };
        
      const getStatusBadge = (status) => {
        if (status === 'connected') {
          return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
              Active
            </span>
          );
        } else if (status === 'failed') {
          return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
              Failed
            </span>
          );
        } else if (status === 'pending') {
          return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-yellow-100 text-yellow-800">
              Pending
            </span>
          );
        } else if (status === 'disconnected') {
          return (
            <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
              Disconnected
            </span>
          );
        }
        
        return (
          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
      };
      
      const formatLastSync = (lastSyncDate) => {
        if (!lastSyncDate) return 'Never';
        
        const date = new Date(lastSyncDate);
        const today = new Date();
        
        // If it's today, show the time
        if (date.toDateString() === today.toDateString()) {
          return `Today at ${format(date, 'HH:mm')}`;
        }
        
        // Otherwise show how long ago
        return formatDistanceToNow(date, { addSuffix: true });
      };
      
      return (
        <div className="bg-white shadow-sm rounded-lg overflow-hidden p-4">
          {/* Integration Header */}
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              {providerIcons[integration.provider] || providerIcons.default}
              <div className="ml-3">
                <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
                <p className="text-sm text-gray-500">{integration.provider.charAt(0).toUpperCase() + integration.provider.slice(1)}</p>
              </div>
            </div>
            <div>
              {getStatusBadge(integration.status)}
            </div>
          </div>
          
          {/* Integration Details */}
          <div className="space-y-3">
            {integration.api_endpoint && (
              <div>
                <h4 className="text-sm font-medium text-gray-500">API Endpoint</h4>
                <p className="mt-1 text-sm text-gray-900 break-all">{integration.api_endpoint}</p>
              </div>
            )}
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Last Sync</h4>
              <p className="mt-1 text-sm text-gray-900">{formatLastSync(integration.last_sync)}</p>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-gray-500">Status</h4>
              <p className="mt-1 text-sm text-gray-900 flex items-center">
                <span className={`h-2 w-2 rounded-full mr-2 ${
                  integration.status === 'connected' ? 'bg-green-500' : 
                  integration.status === 'failed' ? 'bg-red-500' : 
                  'bg-yellow-500'
                }`}></span>
                {integration.status === 'connected' ? 'Connected & Working' : 
                 integration.status === 'failed' ? 'Connection Failed' : 
                 integration.status === 'pending' ? 'Awaiting Connection' : 
                 'Disconnected'}
              </p>
              {integration.status_message && (
                <p className="mt-1 text-xs text-red-600">{integration.status_message}</p>
              )}
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex justify-between mt-6 pt-4 border-t border-gray-200">
            <button
              onClick={() => onTestConnection(integration.integration_id)}
              className="text-sm text-orange-600 hover:text-orange-900"
            >
              Test Connection
            </button>
            
            <button
              onClick={() => onDisconnect(integration.integration_id)}
              className="text-sm text-red-600 hover:text-red-900"
            >
              Disconnect
            </button>
          </div>
        </div>
      );
    };
    
    export default IntegrationCard;