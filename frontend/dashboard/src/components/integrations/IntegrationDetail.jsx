import React, { useState, useEffect } from 'react';
import { 
  ArrowPathIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ClockIcon,
  DocumentTextIcon,
  ShoppingBagIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const IntegrationDetail = ({ integrationId }) => {
  const [integration, setIntegration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [resourceData, setResourceData] = useState([]);
  const [resourceType, setResourceType] = useState(null);
  const [loadingResources, setLoadingResources] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mock integrationService for demonstration
  const integrationService = {
    getIntegrations: async () => {
      // Simulating API response
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            {
              integration_id: "1234",
              name: "Zendesk Support",
              provider: "zendesk",
              status: "connected",
              endpoint_url: "company.zendesk.com",
              created_at: new Date().toISOString(),
              last_sync: new Date().toISOString(),
              latest_sync: {
                status: "completed",
                items_processed: 150,
                items_created: 25,
                items_updated: 10,
                start_time: new Date().toISOString(),
                end_time: new Date().toISOString()
              }
            }
          ]);
        }, 500);
      });
    },
    
    getIntegrationData: async (provider, resourceType, query) => {
      // Mock data based on resource type
      return new Promise((resolve) => {
        setTimeout(() => {
          if (resourceType === 'tickets') {
            resolve([
              { id: 1, subject: "Login issue", status: "open", priority: "high", requested_by: "customer@example.com" },
              { id: 2, subject: "Payment problem", status: "pending", priority: "urgent", requested_by: "user@example.com" }
            ]);
          } else if (resourceType === 'products') {
            resolve([
              { id: 101, title: "Product A", price: 19.99, inventory: 45, category: "Electronics" },
              { id: 102, title: "Product B", price: 29.99, inventory: 12, category: "Home" }
            ]);
          } else {
            resolve([]);
          }
        }, 500);
      });
    },
    
    syncIntegration: async () => {
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve({ success: true });
        }, 800);
      });
    }
  };

  useEffect(() => {
    fetchIntegrationDetails();
  }, []);

  const fetchIntegrationDetails = async () => {
    try {
      setLoading(true);
      
      // Get all integrations and find the specific one
      const allIntegrations = await integrationService.getIntegrations();
      const targetIntegration = allIntegrations.find(i => i.integration_id === integrationId);
      
      if (!targetIntegration) {
        setError('Integration not found');
        return;
      }
      
      setIntegration(targetIntegration);
      
      // Set default resource type based on provider
      if (targetIntegration.provider === 'zendesk') {
        setResourceType('tickets');
      } else if (targetIntegration.provider === 'shopify') {
        setResourceType('products');
      } else if (targetIntegration.provider === 'salesforce') {
        setResourceType('contacts');
      }
      
    } catch (err) {
      console.error('Error fetching integration details:', err);
      setError('Failed to load integration details');
    } finally {
      setLoading(false);
    }
  };

  const fetchResourceData = async () => {
    if (!integration || !resourceType) return;
    
    try {
      setLoadingResources(true);
      const data = await integrationService.getIntegrationData(
        integration.provider, 
        resourceType,
        searchQuery
      );
      setResourceData(data);
    } catch (err) {
      console.error('Error fetching resource data:', err);
      setError('Failed to load resource data');
    } finally {
      setLoadingResources(false);
    }
  };

  useEffect(() => {
    if (resourceType) {
      fetchResourceData();
    }
  }, [resourceType]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchResourceData();
  };

  const handleSyncIntegration = async () => {
    try {
      await integrationService.syncIntegration(integrationId);
      fetchIntegrationDetails();
    } catch (err) {
      console.error('Error syncing integration:', err);
      setError('Failed to sync integration');
    }
  };

  const getResourceIcon = () => {
    switch (resourceType) {
      case 'tickets':
        return <DocumentTextIcon className="w-5 h-5" />;
      case 'products':
        return <ShoppingBagIcon className="w-5 h-5" />;
      case 'orders':
        return <ShoppingBagIcon className="w-5 h-5" />;
      case 'contacts':
      case 'users':
        return <UserCircleIcon className="w-5 h-5" />;
      default:
        return <DocumentTextIcon className="w-5 h-5" />;
    }
  };

  const getStatusBadge = (status) => {
    switch(status) {
      case 'connected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircleIcon className="mr-1 h-4 w-4" />
            Connected
          </span>
        );
      case 'error':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <ExclamationCircleIcon className="mr-1 h-4 w-4" />
            Error
          </span>
        );
      case 'configured':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <ClockIcon className="mr-1 h-4 w-4" />
            Configured
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Get resource type options based on provider
  const getResourceTypeOptions = () => {
    if (!integration) return [];
    
    switch (integration.provider) {
      case 'zendesk':
        return [
          { value: 'tickets', label: 'Tickets' },
          { value: 'users', label: 'Users' },
          { value: 'organizations', label: 'Organizations' }
        ];
      case 'shopify':
        return [
          { value: 'products', label: 'Products' },
          { value: 'orders', label: 'Orders' },
          { value: 'customers', label: 'Customers' }
        ];
      case 'salesforce':
        return [
          { value: 'contacts', label: 'Contacts' },
          { value: 'accounts', label: 'Accounts' },
          { value: 'opportunities', label: 'Opportunities' }
        ];
      default:
        return [];
    }
  };

  // Render resource data based on type
  const renderResourceData = () => {
    if (loadingResources) {
      return (
        <div className="py-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-500">Loading data...</p>
        </div>
      );
    }

    if (resourceData.length === 0) {
      return (
        <div className="py-12 text-center">
          <p className="text-gray-500">No data found</p>
        </div>
      );
    }

    // Create table headers based on the first item's keys
    const firstItem = resourceData[0];
    const headers = Object.keys(firstItem).filter(key => 
      !['id', '_id', 'created_at', 'updated_at'].includes(key.toLowerCase())
    ).slice(0, 5); // Limit to 5 columns

    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead>
            <tr>
              {headers.map(header => (
                <th 
                  key={header} 
                  className="px-6 py-3 bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {resourceData.map((item, index) => (
              <tr key={item.id || index}>
                {headers.map(header => (
                  <td key={`${index}-${header}`} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {typeof item[header] === 'object' 
                      ? JSON.stringify(item[header]).substring(0, 50) + '...'
                      : String(item[header]).substring(0, 100)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
        <p className="mt-4 text-center text-gray-500">Loading integration details...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!integration) {
    return (
      <div className="bg-white shadow-sm rounded-lg p-6">
        <p className="text-center text-gray-500">Integration not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-gray-900">{integration.name}</h1>
              <div className="ml-3">{getStatusBadge(integration.status)}</div>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              {integration.provider} Integration • 
              Last synced: {integration.last_sync ? new Date(integration.last_sync).toLocaleString() : 'Never'}
            </p>
          </div>
          
          <button
            onClick={handleSyncIntegration}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <ArrowPathIcon className="h-5 w-5 mr-2" />
            Sync Now
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('data')}
              className={`${
                activeTab === 'data'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Data Preview
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`${
                activeTab === 'settings'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Settings
            </button>
          </nav>
        </div>

        {/* Tab content */}
        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Integration Details</h3>
                <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Provider</h4>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{integration.provider}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Status</h4>
                    <p className="mt-1 text-sm text-gray-900 capitalize">{integration.status}</p>
                    {integration.status === 'error' && (
                      <p className="mt-1 text-sm text-red-600">{integration.status_message}</p>
                    )}
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Endpoint URL</h4>
                    <p className="mt-1 text-sm text-gray-900">{integration.endpoint_url || 'Not specified'}</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-gray-500">Created At</h4>
                    <p className="mt-1 text-sm text-gray-900">{new Date(integration.created_at).toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {integration.latest_sync && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Last Sync Details</h3>
                  <div className="mt-4 bg-gray-50 p-4 rounded-md">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Status</h4>
                        <p className="mt-1 text-sm text-gray-900 capitalize">{integration.latest_sync.status}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Items Processed</h4>
                        <p className="mt-1 text-sm text-gray-900">{integration.latest_sync.items_processed}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Items Created</h4>
                        <p className="mt-1 text-sm text-gray-900">{integration.latest_sync.items_created}</p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-500">Items Updated</h4>
                        <p className="mt-1 text-sm text-gray-900">{integration.latest_sync.items_updated}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-gray-500">Sync Time</h4>
                      <p className="mt-1 text-sm text-gray-900">
                        Started: {new Date(integration.latest_sync.start_time).toLocaleString()}
                      </p>
                      {integration.latest_sync.end_time && (
                        <p className="mt-1 text-sm text-gray-900">
                          Completed: {new Date(integration.latest_sync.end_time).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Data Preview</h3>
                <p className="mt-1 text-sm text-gray-500">
                  View data from your integration. This is what will be available to your chatbot.
                </p>
              </div>

              <div className="flex items-center space-x-4">
                <div className="w-64">
                  <label htmlFor="resourceType" className="block text-sm font-medium text-gray-700">
                    Resource Type
                  </label>
                  <select
                    id="resourceType"
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                    value={resourceType || ''}
                    onChange={(e) => setResourceType(e.target.value)}
                  >
                    {getResourceTypeOptions().map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex-1">
                  <form onSubmit={handleSearch} className="flex items-end">
                    <div className="flex-1">
                      <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                        Search
                      </label>
                      <input
                        type="text"
                        name="search"
                        id="search"
                        className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                        placeholder="Search by name or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button
                      type="submit"
                      className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Search
                    </button>
                  </form>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-md overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center">
                  <div className="flex-shrink-0 mr-3">
                    {getResourceIcon()}
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 capitalize">{resourceType || 'Select a resource type'}</h4>
                    <p className="text-xs text-gray-500">
                      {resourceData.length} items loaded
                    </p>
                  </div>
                </div>
                <div>
                  {renderResourceData()}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Integration Settings</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure how this integration behaves with your chatbot.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900">Sync Frequency</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Choose how often data should be synchronized from this integration.
                </p>
                <div className="mt-4">
                  <div className="flex items-center">
                    <input
                      id="frequency-manual"
                      name="sync-frequency"
                      type="radio"
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                      defaultChecked
                    />
                    <label htmlFor="frequency-manual" className="ml-3 block text-sm font-medium text-gray-700">
                      Manual Only
                    </label>
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      id="frequency-daily"
                      name="sync-frequency"
                      type="radio"
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                    />
                    <label htmlFor="frequency-daily" className="ml-3 block text-sm font-medium text-gray-700">
                      Daily
                    </label>
                  </div>
                  <div className="mt-2 flex items-center">
                    <input
                      id="frequency-hourly"
                      name="sync-frequency"
                      type="radio"
                      className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300"
                    />
                    <label htmlFor="frequency-hourly" className="ml-3 block text-sm font-medium text-gray-700">
                      Hourly
                    </label>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h4 className="text-sm font-medium text-gray-900">Data Usage</h4>
                <p className="mt-1 text-sm text-gray-500">
                  Configure how data from this integration should be used by the chatbot.
                </p>
                <div className="mt-4 space-y-4">
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="use-for-chat"
                        name="use-for-chat"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                        defaultChecked
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="use-for-chat" className="font-medium text-gray-700">Use for chat responses</label>
                      <p className="text-gray-500">This integration's data will be used to enhance chatbot responses.</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="use-sensitive-data"
                        name="use-sensitive-data"
                        type="checkbox"
                        className="focus:ring-primary-500 h-4 w-4 text-primary-600 border-gray-300 rounded"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="use-sensitive-data" className="font-medium text-gray-700">Use sensitive data</label>
                      <p className="text-gray-500">Allow the chatbot to access sensitive data like customer details or pricing information.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Save Settings
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationDetail;