// frontend/dashboard/src/components/integrations/AddIntegrationModal.jsx
import React, { useState, useEffect } from 'react';

const AddIntegrationModal = ({ isOpen, onClose, selectedProvider, availableProviders, onSubmit }) => {
  const [provider, setProvider] = useState('');
  const [name, setName] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [portalId, setPortalId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Provider-specific required fields
  const providerFields = {
    zendesk: ['api_endpoint', 'api_key'],
    shopify: ['api_endpoint', 'api_key', 'api_secret'],
    salesforce: ['api_endpoint', 'api_key', 'client_id', 'client_secret'],
    slack: ['api_key'],
    hubspot: ['api_key', 'portal_id']
  };
  
  // When the modal opens with a selected provider, set that provider
  useEffect(() => {
    if (selectedProvider) {
      setProvider(selectedProvider.id);
      setName(selectedProvider.name || `${selectedProvider.name} Integration`);
    }
  }, [selectedProvider, isOpen]);
  
  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setProvider('');
        setName('');
        setApiEndpoint('');
        setApiKey('');
        setApiSecret('');
        setPortalId('');
        setClientId('');
        setClientSecret('');
        setErrors({});
        setIsSubmitting(false);
      }, 300);
    }
  }, [isOpen]);
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!provider) {
      newErrors.provider = 'Provider is required';
    }
    
    if (!name) {
      newErrors.name = 'Name is required';
    }
    
    // Find the selected provider object and check required fields
    const providerRequiredFields = providerFields[provider] || [];
    
    if (providerRequiredFields.includes('api_endpoint') && !apiEndpoint) {
      newErrors.apiEndpoint = 'API Endpoint is required';
    }
    
    if (providerRequiredFields.includes('api_key') && !apiKey) {
      newErrors.apiKey = 'API Key is required';
    }
    
    if (providerRequiredFields.includes('api_secret') && !apiSecret) {
      newErrors.apiSecret = 'API Secret is required';
    }
    
    if (providerRequiredFields.includes('portal_id') && !portalId) {
      newErrors.portalId = 'Portal ID is required';
    } else if (provider === 'hubspot' && portalId && !/^\d+$/.test(portalId)) {
      newErrors.portalId = 'Portal ID should be a number';
    }
    
    if (providerRequiredFields.includes('client_id') && !clientId) {
      newErrors.clientId = 'Client ID is required';
    }
    
    if (providerRequiredFields.includes('client_secret') && !clientSecret) {
      newErrors.clientSecret = 'Client Secret is required';
    }
    
    // Provider-specific validations
    if (provider === 'zendesk' && apiEndpoint && !apiEndpoint.includes('zendesk.com')) {
      newErrors.apiEndpoint = 'Please enter a valid Zendesk domain (e.g., yourdomain.zendesk.com)';
    }
    
    if (provider === 'shopify' && apiEndpoint && !apiEndpoint.includes('myshopify.com')) {
      newErrors.apiEndpoint = 'Please enter a valid Shopify store URL (e.g., your-store.myshopify.com)';
    }
    
    return newErrors;
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate form
    const formErrors = validateForm();
    
    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      return;
    }
    
    setIsSubmitting(true);
    
    // Create integration data
    const formData = {
      provider,
      name,
      api_endpoint: apiEndpoint,
      api_key: apiKey,
      api_secret: apiSecret,
      portal_id: portalId,
      client_id: clientId,
      client_secret: clientSecret
    };
    
    onSubmit(formData);
  };
  
  if (!isOpen) return null;
  
  // Find the selected provider object
  const selectedProviderObj = availableProviders.find(p => p.id === provider);
  
  // Get the list of required fields for the selected provider
  const requiredFields = selectedProviderObj ? providerFields[selectedProviderObj.id] || [] : [];
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
      <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true"></div>
        
        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900" id="modal-title">
                  {selectedProvider ? `Connect to ${selectedProvider.name}` : 'Add Integration'}
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Connect to an external service to enhance your chatbot with additional data.
                </p>
              </div>
              
              <div className="mt-6 space-y-4">
                {/* Provider Select - Only show if not pre-selected */}
                {!selectedProvider ? (
                  <div>
                    <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
                      Provider
                    </label>
                    <select
                      id="provider"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm rounded-md ${errors.provider ? 'border-red-300' : ''}`}
                    >
                      <option value="">Select a provider</option>
                      {availableProviders.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                    {errors.provider && (
                      <p className="mt-1 text-sm text-red-600">{errors.provider}</p>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Provider</label>
                    <div className="mt-1 flex items-center">
                      <input type="hidden" name="provider" value={provider} />
                      <div className="bg-gray-100 rounded-md px-3 py-2 text-gray-700">
                        {selectedProvider.name}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Name Input */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Integration Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.name ? 'border-red-300' : ''}`}
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name}</p>
                  )}
                </div>
                
                {/* Conditional Fields based on Provider */}
                {selectedProviderObj && (
                  <>
                    {/* API Endpoint Field */}
                    {requiredFields.includes('api_endpoint') && (
                      <div>
                        <label htmlFor="apiEndpoint" className="block text-sm font-medium text-gray-700">
                          API Endpoint {requiredFields.includes('api_endpoint') && '*'}
                        </label>
                        <input
                          type="text"
                          id="apiEndpoint"
                          value={apiEndpoint}
                          onChange={(e) => setApiEndpoint(e.target.value)}
                          placeholder={selectedProviderObj.id === 'zendesk' 
                            ? "https://yourdomain.zendesk.com" 
                            : selectedProviderObj.id === 'shopify'
                              ? "https://your-store.myshopify.com"
                              : ""}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.apiEndpoint ? 'border-red-300' : ''}`}
                        />
                        {errors.apiEndpoint && (
                          <p className="mt-1 text-sm text-red-600">{errors.apiEndpoint}</p>
                        )}
                      </div>
                    )}
                    
                    {/* API Key Field */}
                    {requiredFields.includes('api_key') && (
                      <div>
                        <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                          API Key {requiredFields.includes('api_key') && '*'}
                        </label>
                        <input
                          type="text"
                          id="apiKey"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.apiKey ? 'border-red-300' : ''}`}
                        />
                        {errors.apiKey && (
                          <p className="mt-1 text-sm text-red-600">{errors.apiKey}</p>
                        )}
                        {selectedProviderObj.id === 'hubspot' && (
                          <p className="mt-1 text-xs text-gray-500">Find in HubSpot → Settings → Private Apps</p>
                        )}
                      </div>
                    )}
                    
                    {/* API Secret Field */}
                    {requiredFields.includes('api_secret') && (
                      <div>
                        <label htmlFor="apiSecret" className="block text-sm font-medium text-gray-700">
                          API Secret {requiredFields.includes('api_secret') && '*'}
                        </label>
                        <input
                          type="password"
                          id="apiSecret"
                          value={apiSecret}
                          onChange={(e) => setApiSecret(e.target.value)}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.apiSecret ? 'border-red-300' : ''}`}
                        />
                        {errors.apiSecret && (
                          <p className="mt-1 text-sm text-red-600">{errors.apiSecret}</p>
                        )}
                      </div>
                    )}
                    
                    {/* HubSpot Portal ID Field */}
                    {requiredFields.includes('portal_id') && (
                      <div>
                        <label htmlFor="portalId" className="block text-sm font-medium text-gray-700">
                          Portal ID {requiredFields.includes('portal_id') && '*'}
                        </label>
                        <input
                          type="text"
                          id="portalId"
                          value={portalId}
                          onChange={(e) => setPortalId(e.target.value)}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.portalId ? 'border-red-300' : ''}`}
                        />
                        {errors.portalId && (
                          <p className="mt-1 text-sm text-red-600">{errors.portalId}</p>
                        )}
                        <p className="mt-1 text-xs text-gray-500">Find in your HubSpot URL: app.hubspot.com/reports/{'{portal_id}'}</p>
                      </div>
                    )}
                    
                    {/* Client ID Field */}
                    {requiredFields.includes('client_id') && (
                      <div>
                        <label htmlFor="clientId" className="block text-sm font-medium text-gray-700">
                          Client ID {requiredFields.includes('client_id') && '*'}
                        </label>
                        <input
                          type="text"
                          id="clientId"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.clientId ? 'border-red-300' : ''}`}
                        />
                        {errors.clientId && (
                          <p className="mt-1 text-sm text-red-600">{errors.clientId}</p>
                        )}
                      </div>
                    )}
                    
                    {/* Client Secret Field */}
                    {requiredFields.includes('client_secret') && (
                      <div>
                        <label htmlFor="clientSecret" className="block text-sm font-medium text-gray-700">
                          Client Secret {requiredFields.includes('client_secret') && '*'}
                        </label>
                        <input
                          type="password"
                          id="clientSecret"
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${errors.clientSecret ? 'border-red-300' : ''}`}
                        />
                        {errors.clientSecret && (
                          <p className="mt-1 text-sm text-red-600">{errors.clientSecret}</p>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
            
            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                {isSubmitting ? 'Connecting...' : 'Connect'}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddIntegrationModal;