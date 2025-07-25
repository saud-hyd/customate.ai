// frontend/dashboard/src/components/integrations/AddIntegrationModal.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import integrationService from '../../services/integrationService';

const AddIntegrationModal = ({ provider, onSubmit, onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    provider: provider.id
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  // Initialize form data with provider-specific fields
  useEffect(() => {
    const initialData = {
      name: `${provider.name} Integration`,
      provider: provider.id
    };

    // Initialize all required fields
    if (provider.fields) {
      provider.fields.forEach(field => {
        initialData[field.name] = '';
      });
    }

    setFormData(initialData);
  }, [provider]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    // Clear connection test result when credentials change
    if (['store_domain', 'access_token', 'api_key', 'api_secret', 'email', 'client_id', 'client_secret'].includes(name)) {
      setConnectionTestResult(null);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Integration name is required';
    }

    // Validate provider-specific fields
    if (provider.fields) {
      provider.fields.forEach(field => {
        if (field.required && !formData[field.name]?.trim()) {
          newErrors[field.name] = `${field.label} is required`;
        }

        // Additional validation based on field type
        if (formData[field.name] && field.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(formData[field.name])) {
            newErrors[field.name] = 'Please enter a valid email address';
          }
        }

        // Shopify-specific validation
        if (provider.id === 'shopify') {
          if (field.name === 'store_domain' && formData[field.name]) {
            const domain = formData[field.name].trim();
            if (!domain.includes('.myshopify.com') && !domain.includes('.')) {
              // Auto-append .myshopify.com if just store name is provided
              setFormData(prev => ({
                ...prev,
                store_domain: `${domain}.myshopify.com`
              }));
            }
          }

          if (field.name === 'access_token' && formData[field.name]) {
            const token = formData[field.name].trim();
            if (!token.startsWith('shpat_')) {
              newErrors[field.name] = 'Admin API tokens should start with "shpat_"';
            }
          }
        }
      });
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTestConnection = async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors below before testing connection');
      return;
    }

    setTestingConnection(true);
    setConnectionTestResult(null);

    try {
      const testData = {
        provider: provider.id,
        credentials: {},
        config: {}
      };

      // Map form data to credentials based on provider
      if (provider.id === 'shopify') {
        testData.credentials = {
          store_domain: formData.store_domain,
          access_token: formData.access_token
        };
        testData.config = {
          endpoint_url: formData.store_domain
        };
      } else if (provider.id === 'zendesk') {
        testData.credentials = {
          subdomain: formData.subdomain,
          api_key: formData.api_key,
          email: formData.email
        };
        testData.config = {
          endpoint_url: formData.subdomain
        };
      } else if (provider.id === 'salesforce') {
        testData.credentials = {
          instance_url: formData.instance_url,
          client_id: formData.client_id,
          client_secret: formData.client_secret
        };
        testData.config = {
          endpoint_url: formData.instance_url
        };
      }

      const result = await integrationService.testConnection(testData);

      if (result.success) {
        setConnectionTestResult({
          success: true,
          message: result.message,
          details: result.details
        });
        toast.success('Connection test successful!');
      } else {
        setConnectionTestResult({
          success: false,
          message: result.message,
          status_code: result.status_code
        });
        toast.error(`Connection test failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      const errorMessage = integrationService.formatError(error, 'Connection test failed');
      setConnectionTestResult({
        success: false,
        message: errorMessage
      });
      toast.error(errorMessage);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors below');
      return;
    }

    // Require successful connection test before allowing creation
    if (!connectionTestResult || !connectionTestResult.success) {
      toast.error('Please test the connection successfully before adding the integration');
      return;
    }

    setLoading(true);

    try {
      const result = await onSubmit(formData);
      if (!result.success) {
        // Error already handled in parent component
        return;
      }
    } catch (error) {
      console.error('Submit error:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderField = (field) => {
    const fieldError = errors[field.name];
    const fieldValue = formData[field.name] || '';

    return (
      <div key={field.name}>
        <label htmlFor={field.name} className="block text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </label>
        
        <input
          type={field.type || 'text'}
          id={field.name}
          name={field.name}
          value={fieldValue}
          onChange={handleInputChange}
          placeholder={field.placeholder}
          className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
            fieldError ? 'border-red-300' : ''
          }`}
          required={field.required}
        />
        
        {field.help && (
          <p className="mt-1 text-xs text-gray-500">{field.help}</p>
        )}
        
        {fieldError && (
          <p className="mt-1 text-sm text-red-600">{fieldError}</p>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Connect to {provider.name}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {provider.description}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Setup Instructions */}
          {provider.setup_instructions && (
            <div className="mb-6 p-4 bg-blue-50 rounded-md">
              <h4 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                {provider.setup_instructions.map((instruction, index) => (
                  <li key={index} className="flex">
                    <span className="mr-2">{index + 1}.</span>
                    <span>{instruction}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Integration Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Integration Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-orange-500 focus:border-orange-500 sm:text-sm ${
                  errors.name ? 'border-red-300' : ''
                }`}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
            </div>

            {/* Provider-specific Fields */}
            {provider.fields && provider.fields.map(renderField)}

            {/* Connection Test Section */}
            <div className="border-t border-gray-200 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-gray-900">Connection Test</h4>
                  <p className="text-xs text-gray-500">Test your credentials before adding the integration</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingConnection}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
                >
                  {testingConnection ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-700" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing...
                    </>
                  ) : (
                    'Test Connection'
                  )}
                </button>
              </div>

              {/* Connection Test Result */}
              {connectionTestResult && (
                <div className={`mt-3 p-3 rounded-md ${
                  connectionTestResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
                } border`}>
                  <div className="flex">
                    <div className="flex-shrink-0">
                      {connectionTestResult.success ? (
                        <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                    <div className="ml-3">
                      <p className={`text-sm font-medium ${
                        connectionTestResult.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {connectionTestResult.success ? 'Connection Successful!' : 'Connection Failed'}
                      </p>
                      <p className={`text-sm ${
                        connectionTestResult.success ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {connectionTestResult.message}
                      </p>
                      {connectionTestResult.details && (
                        <div className="mt-2 text-xs text-green-600">
                          <p>Store: {connectionTestResult.details.shop_name}</p>
                          {connectionTestResult.details.shop_email && (
                            <p>Email: {connectionTestResult.details.shop_email}</p>
                          )}
                          {connectionTestResult.details.plan_name && (
                            <p>Plan: {connectionTestResult.details.plan_name}</p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Form Actions */}
            <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !connectionTestResult?.success}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adding...
                  </>
                ) : (
                  'Add Integration'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddIntegrationModal;