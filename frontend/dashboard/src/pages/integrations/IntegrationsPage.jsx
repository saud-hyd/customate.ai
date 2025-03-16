import React, { useState, useEffect } from 'react';
import { 
  PlusIcon, 
  CheckCircleIcon, 
  ExclamationCircleIcon,
  ArrowPathIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import integrationService from '../../services/integrationService';

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState([]);
  const [availableProviders, setAvailableProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [newIntegrationData, setNewIntegrationData] = useState({
    name: '',
    provider: '',
    api_endpoint: '',
    api_key: '',
    api_secret: ''
  });
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [syncingIntegration, setSyncingIntegration] = useState(null);

  // Fetch integrations on component mount
  useEffect(() => {
    fetchIntegrations();
    fetchAvailableProviders();
  }, []);

  const fetchIntegrations = async () => {
    try {
      setLoading(true);
      const data = await integrationService.getIntegrations();
      setIntegrations(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching integrations:', err);
      setError('Failed to load integrations. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableProviders = async () => {
    try {
      const data = await integrationService.getAvailableProviders();
      setAvailableProviders(data);
    } catch (err) {
      console.error('Error fetching available providers:', err);
    }
  };

  const handleProviderSelect = (provider) => {
    setSelectedProvider(provider);
    setNewIntegrationData({
      ...newIntegrationData,
      provider: provider.id,
      name: `${provider.name} Integration`
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewIntegrationData({
      ...newIntegrationData,
      [name]: value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await integrationService.createIntegration(newIntegrationData);
      setShowAddModal(false);
      setNewIntegrationData({
        name: '',
        provider: '',
        api_endpoint: '',
        api_key: '',
        api_secret: ''
      });
      fetchIntegrations();
    } catch (err) {
      console.error('Error creating integration:', err);
      setError('Failed to create integration. Please check your inputs and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIntegration = async (integrationId) => {
    if (!window.confirm('Are you sure you want to delete this integration?')) {
      return;
    }
    
    try {
      setLoading(true);
      await integrationService.deleteIntegration(integrationId);
      fetchIntegrations();
    } catch (err) {
      console.error('Error deleting integration:', err);
      setError('Failed to delete integration.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async (integrationId) => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      const result = await integrationService.testConnection(integrationId);
      setTestResult(result);
    } catch (err) {
      console.error('Error testing connection:', err);
      setTestResult({
        success: false,
        message: 'An error occurred during connection test.'
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSyncIntegration = async (integrationId) => {
    try {
      setSyncingIntegration(integrationId);
      await integrationService.syncIntegration(integrationId);
      fetchIntegrations();
    } catch (err) {
      console.error('Error syncing integration:', err);
      setError('Failed to sync integration.');
    } finally {
      setSyncingIntegration(null);
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
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Configured
          </span>
        );
      case 'disconnected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            <svg xmlns="http://www.w3.org/2000/svg" className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
            Disconnected
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

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Connect your chatbot with external services to provide more contextual responses.
            </p>
          </div>
          
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md flex items-center"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Add Integration
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
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
      )}

      {/* Integrations list */}
      <div className="bg-white shadow-sm overflow-hidden sm:rounded-lg">
        {loading && integrations.length === 0 ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading integrations...</p>
          </div>
        ) : integrations.length === 0 ? (
          <div className="p-12 text-center bg-gray-50">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 14v6m-3-3h6M6 10h2a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2zm10 0h2a2 2 0 002-2V6a2 2 0 00-2-2h-2a2 2 0 00-2 2v2a2 2 0 002 2zM6 20h2a2 2 0 002-2v-2a2 2 0 00-2-2H6a2 2 0 00-2 2v2a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-4 text-gray-900 text-lg font-medium">No integrations found</h3>
            <p className="mt-2 text-gray-500 text-sm">
              Get started by adding your first integration.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-primary-700 bg-primary-100 hover:bg-primary-200"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              Add Integration
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Provider
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Last Sync
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {integrations.map((integration) => (
                  <tr key={integration.integration_id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{integration.name}</div>
                      <div className="text-sm text-gray-500">{integration.integration_id}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 capitalize">{integration.provider}</div>
                      <div className="text-sm text-gray-500 truncate max-w-xs">{integration.endpoint_url}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(integration.status)}
                      {integration.status === 'error' && (
                        <div className="text-xs text-red-600 mt-1">{integration.status_message}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {integration.last_sync ? new Date(integration.last_sync).toLocaleString() : 'Never'}
                      </div>
                      {integration.latest_sync && (
                        <div className="text-xs text-gray-500">
                          {integration.latest_sync.items_processed} items processed
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleTestConnection(integration.integration_id)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        disabled={testingConnection}
                      >
                        {testingConnection && integration.integration_id === testResult?.integration_id ? 'Testing...' : 'Test Connection'}
                      </button>
                      <button
                        onClick={() => handleSyncIntegration(integration.integration_id)}
                        className="text-primary-600 hover:text-primary-900 mr-4"
                        disabled={syncingIntegration === integration.integration_id}
                      >
                        {syncingIntegration === integration.integration_id ? (
                          <ArrowPathIcon className="h-5 w-5 animate-spin inline" />
                        ) : (
                          'Sync Now'
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteIntegration(integration.integration_id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Integration Modal */}
      {showAddModal && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)}></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Add New Integration
                    </h3>
                    <div className="mt-4">
                      {selectedProvider ? (
                        <form onSubmit={handleSubmit}>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                                Integration Name
                              </label>
                              <input
                                type="text"
                                name="name"
                                id="name"
                                value={newIntegrationData.name}
                                onChange={handleInputChange}
                                required
                                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>

                            <div>
                              <label htmlFor="api_endpoint" className="block text-sm font-medium text-gray-700">
                                API Endpoint
                              </label>
                              <input
                                type="text"
                                name="api_endpoint"
                                id="api_endpoint"
                                value={newIntegrationData.api_endpoint}
                                onChange={handleInputChange}
                                placeholder={`e.g., ${selectedProvider.id === 'zendesk' ? 'yourcompany.zendesk.com' : selectedProvider.id === 'shopify' ? 'your-store.myshopify.com' : 'your-instance.salesforce.com'}`}
                                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            
                            <div>
                              <label htmlFor="api_key" className="block text-sm font-medium text-gray-700">
                                API Key
                              </label>
                              <input
                                type="text"
                                name="api_key"
                                id="api_key"
                                value={newIntegrationData.api_key}
                                onChange={handleInputChange}
                                required
                                className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                              />
                            </div>
                            
                            {(selectedProvider.id === 'zendesk' || selectedProvider.id === 'shopify') && (
                              <div>
                                <label htmlFor="api_secret" className="block text-sm font-medium text-gray-700">
                                  {selectedProvider.id === 'zendesk' ? 'API Token' : 'API Secret'}
                                </label>
                                <input
                                  type="password"
                                  name="api_secret"
                                  id="api_secret"
                                  value={newIntegrationData.api_secret}
                                  onChange={handleInputChange}
                                  className="mt-1 focus:ring-primary-500 focus:border-primary-500 block w-full shadow-sm sm:text-sm border-gray-300 rounded-md"
                                />
                              </div>
                            )}

                            <div className="bg-gray-50 p-4 rounded-md">
                              <h4 className="text-sm font-medium text-gray-700">Integration Details</h4>
                              <p className="mt-1 text-sm text-gray-500">
                                {selectedProvider.description}
                              </p>
                              <p className="mt-2 text-xs text-gray-500">
                                Available resources: {selectedProvider.resource_types.join(', ')}
                              </p>
                            </div>
                          </div>

                          <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                            <button
                              type="submit"
                              className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm"
                              disabled={loading}
                            >
                              {loading ? 'Adding...' : 'Add Integration'}
                            </button>
                            <button
                              type="button"
                              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                              onClick={() => setSelectedProvider(null)}
                            >
                              Back
                            </button>
                          </div>
                        </form>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-500 mb-4">
                            Select a provider to integrate with your chatbot:
                          </p>
                          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                            {availableProviders.map((provider) => (
                              <div
                                key={provider.id}
                                className="relative rounded-lg border border-gray-300 bg-white px-6 py-5 shadow-sm flex items-center space-x-3 hover:border-gray-400 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-primary-500 cursor-pointer"
                                onClick={() => handleProviderSelect(provider)}
                              >
                                <div className="flex-shrink-0">
                                  <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                                    {provider.icon || provider.name.charAt(0)}
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="focus:outline-none">
                                    <span className="absolute inset-0" aria-hidden="true" />
                                    <p className="text-sm font-medium text-gray-900">{provider.name}</p>
                                    <p className="text-sm text-gray-500 truncate">{provider.description}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                {!selectedProvider && (
                  <button
                    type="button"
                    className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:w-auto sm:text-sm"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Connection Test Result Modal */}
      {testResult && (
        <div className="fixed z-10 inset-0 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setTestResult(null)}></div>

            {/* Modal panel */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full sm:mx-0 sm:h-10 sm:w-10 ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
                    {testResult.success ? (
                      <CheckCircleIcon className="h-6 w-6 text-green-600" />
                    ) : (
                      <ExclamationCircleIcon className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Connection Test Result
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {testResult.message}
                      </p>
                      {testResult.success && testResult.details && (
                        <div className="mt-3 bg-gray-50 p-3 rounded-md">
                          <h4 className="text-sm font-medium text-gray-700">Connection Details</h4>
                          <ul className="mt-2 text-xs text-gray-600 space-y-1">
                            {Object.entries(testResult.details).map(([key, value]) => (
                              <li key={key}>
                                <span className="font-medium">{key}:</span> {value}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 ${testResult.success ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'} text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm`}
                  onClick={() => setTestResult(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationsPage;