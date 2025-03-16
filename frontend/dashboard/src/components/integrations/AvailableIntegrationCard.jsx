// frontend/dashboard/src/components/integrations/AvailableIntegrationCard.jsx
import React from 'react';

const AvailableIntegrationCard = ({ integration, onAddIntegration }) => {
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
      
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6">
      <div className="flex flex-col items-center text-center space-y-4">
        {providerIcons[integration.id] || providerIcons.default}
        
        <div>
          <h3 className="text-lg font-medium text-gray-900">{integration.name}</h3>
          <p className="mt-1 text-sm text-gray-500">
            {integration.description}
          </p>
        </div>
        
        <span className="inline-flex rounded-md shadow-sm">
          <button
            onClick={() => onAddIntegration(integration)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Connect
          </button>
        </span>
      </div>
    </div>
  );
};

export default AvailableIntegrationCard;