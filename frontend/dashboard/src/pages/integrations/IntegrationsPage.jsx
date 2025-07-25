// frontend/dashboard/src/pages/integrations/IntegrationsPage.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import integrationService from '../../services/integrationService';
import IntegrationCard from '../../components/integrations/IntegrationCard';
import AvailableIntegrationCard from '../../components/integrations/AvailableIntegrationCard';
import AddIntegrationModal from '../../components/integrations/AddIntegrationModal';

const IntegrationsPage = () => {
  const [integrations, setIntegrations] = useState([]);
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [testingConnection, setTestingConnection] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch both current integrations and available providers using enhanced service
      const [integrations, availableProviders] = await Promise.all([
        integrationService.getIntegrations(),
        integrationService.getAvailableProviders()
      ]);

      setIntegrations(integrations || []);
      setAvailableIntegrations(availableProviders || []);
    } catch (error) {
      console.error('Error fetching integrations:', error);
      toast.error('Failed to load integrations');
      
      // Set empty arrays to prevent render errors
      setIntegrations([]);
      setAvailableIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddIntegration = (provider) => {
    setSelectedProvider(provider);
    setShowAddModal(true);
  };

  const handleTestConnection = async (integrationId) => {
    try {
      setTestingConnection(true);
      const result = await integrationService.testExistingConnection(integrationId);
      
      if (result.success) {
        toast.success('Connection test successful!');
      } else {
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      const errorMessage = integrationService.formatError(error, 'Connection test failed');
      toast.error(errorMessage);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSync = async (integrationId) => {
    try {
      const result = await integrationService.syncIntegration(integrationId);
      
      if (result.success) {
        toast.success('Sync started successfully!');
        await fetchData(); // Refresh the list
      } else {
        toast.error(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Error starting sync:', error);
      const errorMessage = integrationService.formatError(error, 'Failed to start sync');
      toast.error(errorMessage);
    }
  };

  const handleDisconnect = async (integrationId) => {
    if (!window.confirm('Are you sure you want to disconnect this integration?')) {
      return;
    }

    try {
      const result = await integrationService.deleteIntegration(integrationId);
      
      if (result.success) {
        toast.success('Integration disconnected successfully');
        await fetchData(); // Refresh the list
      } else {
        toast.error(`Failed to disconnect: ${result.message}`);
      }
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      const errorMessage = integrationService.formatError(error, 'Failed to disconnect integration');
      toast.error(errorMessage);
    }
  };

  const handleModalSubmit = async (integrationData) => {
    try {
      // First test the connection using the enhanced service
      const testResult = await integrationService.testConnection({
        provider: integrationData.provider,
        credentials: {
          store_domain: integrationData.store_domain || integrationData.endpoint_url,
          access_token: integrationData.access_token || integrationData.api_key,
          api_key: integrationData.api_key,
          api_secret: integrationData.api_secret,
          email: integrationData.email,
          client_id: integrationData.client_id,
          client_secret: integrationData.client_secret
        },
        config: {
          endpoint_url: integrationData.store_domain || integrationData.endpoint_url
        }
      });

      if (!testResult.success) {
        throw new Error(testResult.message || 'Connection test failed');
      }

      // If test passes, create the integration using the enhanced service
      const createResult = await integrationService.createIntegration({
        provider: integrationData.provider,
        name: integrationData.name,
        credentials: {
          store_domain: integrationData.store_domain || integrationData.endpoint_url,
          access_token: integrationData.access_token || integrationData.api_key,
          api_key: integrationData.api_key,
          api_secret: integrationData.api_secret,
          email: integrationData.email,
          client_id: integrationData.client_id,
          client_secret: integrationData.client_secret
        },
        config: {
          endpoint_url: integrationData.store_domain || integrationData.endpoint_url
        }
      });

      if (createResult.success) {
        toast.success('Integration added successfully!');
        setShowAddModal(false);
        setSelectedProvider(null);
        await fetchData(); // Refresh the list
        return { success: true };
      } else {
        throw new Error(createResult.message || 'Failed to create integration');
      }
    } catch (error) {
      console.error('Error adding integration:', error);
      const errorMessage = integrationService.formatError(error, 'Failed to add integration');
      toast.error(errorMessage);
      return { success: false, message: errorMessage };
    }
  };

  const handleModalClose = () => {
    setShowAddModal(false);
    setSelectedProvider(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Integrations</h1>
        <p className="mt-1 text-sm text-gray-500">
          Connect external services to enhance your chatbot with real-time data.
        </p>
      </div>

      {/* Connected Integrations */}
      {integrations.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 mb-4">Connected Integrations</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {integrations.map((integration) => (
              <IntegrationCard
                key={integration.integration_id}
                integration={integration}
                onTestConnection={handleTestConnection}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
                isTestingConnection={testingConnection}
              />
            ))}
          </div>
        </div>
      )}

      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">
          {integrations.length > 0 ? 'Available Integrations' : 'Add Your First Integration'}
        </h2>
        
        {availableIntegrations.length > 0 ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {availableIntegrations
              .filter(provider => !integrations.some(integration => integration.provider === provider.id))
              .map((provider) => (
                <AvailableIntegrationCard
                  key={provider.id}
                  integration={provider}
                  onAddIntegration={handleAddIntegration}
                />
              ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No integrations available</h3>
            <p className="mt-1 text-sm text-gray-500">
              Integration providers will appear here when available.
            </p>
          </div>
        )}
      </div>

      {/* Add Integration Modal */}
      {showAddModal && selectedProvider && (
        <AddIntegrationModal
          provider={selectedProvider}
          onSubmit={handleModalSubmit}
          onClose={handleModalClose}
        />
      )}
    </div>
  );
};

export default IntegrationsPage;