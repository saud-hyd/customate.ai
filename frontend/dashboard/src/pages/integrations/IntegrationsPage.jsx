// frontend/dashboard/src/pages/integrations/IntegrationsPage.jsx
import React, { useState, useEffect } from 'react';
import integrationService from '../../services/integrationService';
import { useToast } from '../../context/ToastContext';
import AddIntegrationModal from '../../components/integrations/AddIntegrationModal';
import IntegrationCard from '../../components/integrations/IntegrationCard';
import AvailableIntegrationCard from '../../components/integrations/AvailableIntegrationCard';

const IntegrationsPage = () => {
  const [activeIntegrations, setActiveIntegrations] = useState([]);
  const [availableIntegrations, setAvailableIntegrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const { success, error: showError } = useToast();
  
  useEffect(() => {
    const fetchIntegrations = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch client integrations
        const clientIntegrationsData = await integrationService.getClientIntegrations();
        setActiveIntegrations(clientIntegrationsData);
        
        // Fetch available integrations
        const availableIntegrationsData = await integrationService.getAvailableIntegrations();
        setAvailableIntegrations(availableIntegrationsData);
      } catch (err) {
        console.error('Error fetching integrations:', err);
        setError('Failed to load integrations. Please try again later.');
        showError('Failed to load integrations. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchIntegrations();
  }, [refreshTrigger, showError]);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = () => setShowDropdown(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);
  
  const handleAddIntegration = (provider) => {
    setSelectedProvider(provider);
    setIsAddModalOpen(true);
    setShowDropdown(false);
  };
  
  const handleCreateIntegration = async (formData) => {
    try {
      const response = await integrationService.createIntegration(formData);
      
      // Check if the integration failed
      if (response.status === 'failed') {
        showError(response.status_message || 'Failed to connect. Please check your credentials.');
        return;
      }
      
      setIsAddModalOpen(false);
      setRefreshTrigger(prev => prev + 1);
      success('Integration added successfully!');
    } catch (err) {
      console.error('Error creating integration:', err);
      showError(err.message || 'Failed to create integration. Please try again.');
    }
  };
    
  const handleDisconnect = async (integrationId) => {
    try {
      if (!window.confirm('Are you sure you want to disconnect this integration?')) {
        return;
      }
      
      // Try delete method if disconnect doesn't work
      await integrationService.deleteIntegration(integrationId);
      setRefreshTrigger(prev => prev + 1);
      success('Integration disconnected successfully!');
    } catch (err) {
      console.error('Error disconnecting integration:', err);
      showError(err.response?.data?.detail || 'Failed to disconnect integration. Please try again.');
    }
  };
  
  const handleTestConnection = async (integrationId) => {
    try {
      const result = await integrationService.testIntegration(integrationId);
      if (result.success) {
        success('Connection test successful!');
      } else {
        showError(`Connection test failed: ${result.message}`);
      }
    } catch (err) {
      console.error('Error testing connection:', err);
      showError(err.response?.data?.detail || 'Connection test failed. Please check your credentials.');
    }
  };
  
  const handleSync = async (integrationId) => {
    try {
      const result = await integrationService.syncIntegration(integrationId);
      if (result.status === 'success') {
        success(`Sync completed: ${result.items_processed} items processed`);
      } else {
        showError(`Sync failed: ${result.message}`);
      }
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      console.error('Error syncing integration:', err);
      showError(err.response?.data?.detail || 'Failed to sync integration. Please try again.');
    }
  };
  
  // Filter out active integrations from available ones
  const getFilteredAvailableIntegrations = () => {
    const activeProviders = activeIntegrations.map(integration => integration.provider);
    return availableIntegrations.filter(integration => !activeProviders.includes(integration.id));
  };
  
  // For handling custom integration dropdown
  const handleDropdownClick = (e) => {
    e.stopPropagation();
    setShowDropdown(!showDropdown);
  };
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">External Integrations</h1>
            <p className="mt-1 text-sm text-gray-500">
              Connect your existing tools and services to enhance your chatbot with external data.
            </p>
          </div>
          
          {/* Improved dropdown menu for custom integrations */}
          <div className="relative">
            <button
              onClick={handleDropdownClick}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Add Custom Integration
              <svg className="ml-2 -mr-0.5 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            
            {showDropdown && (
              <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <button
                    onClick={() => handleAddIntegration()}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Custom API Integration
                  </button>
                  <button
                    onClick={() => window.open('https://docs.customate.ai/integrations', '_blank')}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Integration Documentation
                  </button>
                  <button
                    onClick={() => window.open('mailto:support@customate.ai?subject=New Integration Request', '_blank')}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    role="menuitem"
                  >
                    Request New Integration
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Active Integrations */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Active Integrations</h2>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-3 text-gray-700">Loading integrations...</p>
          </div>
        ) : activeIntegrations.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No active integrations. Connect a service to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeIntegrations.map((integration) => (
              <IntegrationCard
                key={integration.integration_id}
                integration={integration}
                onTestConnection={handleTestConnection}
                onDisconnect={handleDisconnect}
                onSync={handleSync}
              />
            ))}
          </div>
        )}
      </div>

      {/* Available Integrations */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Available Integrations</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {getFilteredAvailableIntegrations().map((integration) => (
            <AvailableIntegrationCard
              key={integration.id}
              integration={integration}
              onAddIntegration={() => handleAddIntegration(integration)}
            />
          ))}
        </div>
      </div>

      {/* Add Integration Modal */}
      <AddIntegrationModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        selectedProvider={selectedProvider}
        availableProviders={availableIntegrations}
        onSubmit={handleCreateIntegration}
      />
    </div>
  );
};

export default IntegrationsPage;