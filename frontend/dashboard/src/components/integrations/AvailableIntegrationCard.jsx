// frontend/dashboard/src/components/integrations/AvailableIntegrationCard.jsx
import React, { useState } from 'react';

const AvailableIntegrationCard = ({ integration, onAddIntegration }) => {
  const [showDetails, setShowDetails] = useState(false);

  const providerIcons = {
    zendesk: (
      <img src="/images/integrations/Zendesk_logo.svg" alt="Zendesk" className="h-10 w-10" />
    ),
    shopify: (
      <img src="/images/integrations/shopify.svg" alt="Shopify" className="h-10 w-10" />
    ),
    salesforce: (
      <img src="/images/integrations/salesforce-logo.svg" alt="Salesforce" className="h-10 w-10" />
    ),
    slack: (
      <img src="/images/integrations/slack-logo.svg" alt="Slack" className="h-10 w-10" />
    ),
    hubspot: (
      <img src="/images/integrations/hubspot.svg" alt="HubSpot" className="h-10 w-10" />
    ),
    default: (
      <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-3 rounded-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
    )
  };

  const getProviderInfo = (id) => {
    const providerInfo = {
      shopify: {
        category: 'E-commerce',
        difficulty: 'Easy',
        setupTime: '5 minutes',
        features: ['Product Management', 'Order Tracking', 'Customer Support', 'Inventory Status'],
        color: 'bg-green-100 text-green-800'
      },
      zendesk: {
        category: 'Customer Support',
        difficulty: 'Medium',
        setupTime: '10 minutes',
        features: ['Ticket Management', 'Customer Data', 'Support History', 'Agent Insights'],
        color: 'bg-blue-100 text-blue-800'
      },
      salesforce: {
        category: 'CRM',
        difficulty: 'Advanced',
        setupTime: '15 minutes',
        features: ['Contact Management', 'Sales Pipeline', 'Lead Tracking', 'Account Data'],
        color: 'bg-purple-100 text-purple-800'
      }
    };

    return providerInfo[id] || {
      category: 'Integration',
      difficulty: 'Medium',
      setupTime: '10 minutes',
      features: ['Data Sync', 'API Access'],
      color: 'bg-gray-100 text-gray-800'
    };
  };

  const handleConnect = () => {
    onAddIntegration(integration);
  };

  const info = getProviderInfo(integration.id);

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-lg transition-all duration-200 hover:border-orange-300">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-4">
            {providerIcons[integration.id] || providerIcons.default}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{integration.name}</h3>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
                {info.category}
              </span>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm text-gray-500">{info.difficulty}</div>
            <div className="text-xs text-gray-400">{info.setupTime} setup</div>
          </div>
        </div>

        {/* Description */}
        <p className="text-gray-600 mb-4 leading-relaxed">
          {integration.description}
        </p>

        {/* Resource Types */}
        {integration.resource_types && integration.resource_types.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Available Data:</div>
            <div className="flex flex-wrap gap-1">
              {integration.resource_types.map((type, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 capitalize"
                >
                  {type.replace('_', ' ')}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Quick Features Preview */}
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">Key Features:</div>
          <div className="space-y-1">
            {info.features.slice(0, 3).map((feature, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <svg className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {feature}
              </div>
            ))}
            {info.features.length > 3 && (
              <div className="text-xs text-gray-500 ml-6">
                +{info.features.length - 3} more features
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center"
          >
            <span>View Details</span>
            <svg className={`ml-1 h-4 w-4 transition-transform ${showDetails ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          <button
            onClick={handleConnect}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 transition-colors"
          >
            <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Connect
          </button>
        </div>

        {/* Expandable Details */}
        {showDetails && (
          <div className="mt-6 pt-4 border-t border-gray-200 space-y-4">
            {/* Authentication Types */}
            {integration.auth_types && integration.auth_types.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Authentication:</h4>
                <div className="flex flex-wrap gap-2">
                  {integration.auth_types.map((authType, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {authType.replace('_', ' ').toUpperCase()}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Required Fields Preview */}
            {integration.fields && integration.fields.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Required Information:</h4>
                <div className="space-y-2">
                  {integration.fields.filter(field => field.required).map((field, index) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <svg className="h-4 w-4 text-orange-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium">{field.label}</span>
                      {field.help && (
                        <span className="ml-2 text-gray-500">- {field.help}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Setup Instructions Preview */}
            {integration.setup_instructions && integration.setup_instructions.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-2">Quick Setup Guide:</h4>
                <ol className="text-sm text-gray-600 space-y-1">
                  {integration.setup_instructions.slice(0, 3).map((instruction, index) => (
                    <li key={index} className="flex items-start">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-100 text-orange-600 text-xs font-medium mr-2 mt-0.5 flex-shrink-0">
                        {index + 1}
                      </span>
                      <span>{instruction}</span>
                    </li>
                  ))}
                  {integration.setup_instructions.length > 3 && (
                    <li className="text-xs text-gray-500 ml-7">
                      +{integration.setup_instructions.length - 3} more steps (shown during setup)
                    </li>
                  )}
                </ol>
              </div>
            )}

            {/* Benefits */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Benefits for Your Chatbot:</h4>
              <div className="space-y-1">
                {info.features.map((feature, index) => (
                  <div key={index} className="flex items-center text-sm text-gray-600">
                    <svg className="h-3 w-3 text-green-500 mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </div>
                ))}
              </div>
            </div>

            {/* Use Cases */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-2">Common Use Cases:</h4>
              <div className="text-sm text-gray-600">
                {integration.id === 'shopify' && (
                  <ul className="space-y-1">
                    <li>• "What's the status of my order #12345?"</li>
                    <li>• "Do you have the blue shirt in size M?"</li>
                    <li>• "I need help with my recent purchase"</li>
                  </ul>
                )}
                {integration.id === 'zendesk' && (
                  <ul className="space-y-1">
                    <li>• "Check my support ticket status"</li>
                    <li>• "I need help with my account"</li>
                    <li>• "What's my support history?"</li>
                  </ul>
                )}
                {integration.id === 'salesforce' && (
                  <ul className="space-y-1">
                    <li>• "Show me my account information"</li>
                    <li>• "What's the status of my opportunity?"</li>
                    <li>• "Connect me with my account manager"</li>
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AvailableIntegrationCard;