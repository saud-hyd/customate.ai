// Path: frontend/dashboard/src/pages/subscription/SubscriptionPage.jsx
import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';
import analyticsService from '../../services/analyticsService';
import { formatNumber } from '../../utils/formatters';
import api from '../../services/api';

const SubscriptionPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);

  // Plan details
  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      description: 'Get started with basic chatbot',
      messageLimit: 100,  // Updated from 500
      userLimit: 5,
      storageLimit: '500 KB',  // Updated from 50 MB
      collectionLimit: 3,
      features: [
        { name: '100 messages per month', included: true },  // Updated
        { name: '5 active users', included: true },
        { name: '500 KB storage', included: true },  // Updated
        { name: '3 knowledge collections', included: true },
        { name: 'Basic chat functionality', included: true },
        { name: 'Community support', included: true },
        { name: 'Knowledge integration', included: false },
        { name: 'Analytics dashboard', included: false },
        { name: 'Custom domain', included: false },
        { name: 'External integrations', included: false },
      ]
    },
    basic: {
      name: 'Basic',
      price: '$29',
      description: 'Essential features for small businesses',
      messageLimit: 2000,  // Updated from 5000
      userLimit: 25, 
      storageLimit: '5 MB',  // Updated from 500 MB
      collectionLimit: 10,
      features: [
        { name: '2,000 messages per month', included: true },  // Updated
        { name: '25 active users', included: true },
        { name: '5 MB storage', included: true },  // Updated
        { name: '10 knowledge collections', included: true },
        { name: 'Basic chat functionality', included: true },
        { name: 'Knowledge integration', included: true },
        { name: 'Analytics dashboard', included: true },
        { name: 'Email support', included: true },
        { name: 'Custom domain', included: false },
        { name: 'External integrations', included: false },
      ]
    },
    standard: {  // New tier
      name: 'Standard',
      price: '$69',
      description: 'Advanced features for growing teams',
      messageLimit: 5000,
      userLimit: 50,
      storageLimit: '25 MB',
      collectionLimit: 25,
      features: [
        { name: '5,000 messages per month', included: true },
        { name: '50 active users', included: true },
        { name: '25 MB storage', included: true },
        { name: '25 knowledge collections', included: true },
        { name: 'Basic chat functionality', included: true },
        { name: 'Knowledge integration', included: true },
        { name: 'Analytics dashboard', included: true },
        { name: 'Email support', included: true },
        { name: 'Custom domain', included: true },
        { name: 'External integrations', included: true },
      ]
    },
    professional: {  // Renamed from enterprise
      name: 'Professional',
      price: '$149',
      description: 'Ultimate solution for businesses',
      messageLimit: 12000,  // Updated from 100000
      userLimit: 100,  // Updated from 500
      storageLimit: '100 MB',  // Updated from 10 GB
      collectionLimit: 50,  // Updated from 250
      features: [
        { name: '12,000 messages per month', included: true },  // Updated
        { name: '100 active users', included: true },  // Updated
        { name: '100 MB storage', included: true },  // Updated
        { name: '50 knowledge collections', included: true },
        { name: 'Advanced chat functionality', included: true },
        { name: 'Knowledge integration', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom domain', included: true },
        { name: 'External integrations', included: true },
        { name: 'Priority support', included: true },
      ]
    }
  };

  useEffect(() => {
    fetchData();
    
    // Check for success or cancel parameters in URL (for Stripe redirects)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccess('Your subscription has been updated successfully!');
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('cancelled') === 'true') {
      setError('Payment was cancelled. Your subscription remains unchanged.');
      // Clear the URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

// Update the fetchData function:
const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription info
      const subData = await subscriptionService.getCurrentSubscription();
      setSubscription(subData);
      
      // Use the logic provided to fetch subscription usage data
      try {
        // Fetch subscription usage (convert to months)
        const months = 6; // Default to 6 months of history
        const subscriptionData = await analyticsService.getSubscriptionUsage(months);
        
        // Also get current subscription limits
        const subscriptionLimitsData = await analyticsService.getSubscriptionLimits();
        
        // Process the data to match expected format
        if (subscriptionLimitsData && subscriptionLimitsData.limits) {
          // Transform the data into the expected format
          const current = {
            messages: {
              used: subscriptionLimitsData.limits.messages.used,
              limit: subscriptionLimitsData.limits.messages.limit,
              percentage: subscriptionLimitsData.limits.messages.percentage * 100
            },
            users: {
              used: subscriptionLimitsData.limits.users.active,
              limit: subscriptionLimitsData.limits.users.limit,
              percentage: subscriptionLimitsData.limits.users.percentage * 100
            },
            storage: {
              used_bytes: subscriptionLimitsData.limits.storage.used_bytes,
              limit_bytes: subscriptionLimitsData.limits.storage.limit_bytes,
              percentage: subscriptionLimitsData.limits.storage.percentage * 100,
              used_mb: subscriptionLimitsData.limits.storage.used_bytes / (1024 * 1024),
              limit_mb: subscriptionLimitsData.limits.storage.limit_bytes / (1024 * 1024)
            }
          };
          
          // Merge with subscription data
          subscriptionData.current = current;
          setUsageData(current);
        } else if (subscriptionData && subscriptionData.current) {
          // If we have data directly from subscription usage
          setUsageData(subscriptionData.current);
        } else {
          console.warn('No subscription data available from API');
          
          // Set default values based on plan
          const currentPlan = subData?.plan_type || 'free';
          const planLimits = plans[currentPlan];
          
          setUsageData({
            messages: {
              used: 0,
              limit: planLimits.messageLimit,
              percentage: 0
            },
            storage: {
              used_bytes: 0,
              limit_bytes: parseInt(planLimits.storageLimit) * 1024 * 1024, // Convert MB to bytes
              percentage: 0
            }
          });
        }
        
      } catch (err) {
        console.error('Error fetching subscription data:', err);
        
        // Set default fallback data
        const currentPlan = subData?.plan_type || 'free';
        const planLimits = plans[currentPlan];
        
        setUsageData({
          messages: {
            used: 0,
            limit: planLimits.messageLimit,
            percentage: 0
          },
          storage: {
            used_bytes: 0,
            limit_bytes: parseInt(planLimits.storageLimit) * 1024 * 1024, // Convert MB to bytes
            percentage: 0
          }
        });
      }
      
      // Force a sync if we don't have usage data
      if (!usageData || (!usageData.messages?.used && !usageData.storage?.used_bytes)) {
        try {
          await analyticsService.syncSubscriptionUsage();
          // Could potentially refetch data here, but we'll leave it for the manual refresh
        } catch (syncErr) {
          console.warn('Error syncing subscription usage:', syncErr);
        }
      }
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load subscription information');
    } finally {
      setLoading(false);
    }
  };
  
  // Also update the refreshUsageData function to use the same logic:
  const refreshUsageData = async () => {
    try {
      setLoading(true);
      
      // First try to sync the subscription data
      await analyticsService.syncSubscriptionUsage();
      
      // Then fetch the updated data using the same logic
      const months = 6;
      const subscriptionData = await analyticsService.getSubscriptionUsage(months);
      const subscriptionLimitsData = await analyticsService.getSubscriptionLimits();
      
      if (subscriptionLimitsData && subscriptionLimitsData.limits) {
        const current = {
          messages: {
            used: subscriptionLimitsData.limits.messages.used,
            limit: subscriptionLimitsData.limits.messages.limit,
            percentage: subscriptionLimitsData.limits.messages.percentage * 100
          },
          users: {
            used: subscriptionLimitsData.limits.users.active,
            limit: subscriptionLimitsData.limits.users.limit,
            percentage: subscriptionLimitsData.limits.users.percentage * 100
          },
          storage: {
            used_bytes: subscriptionLimitsData.limits.storage.used_bytes,
            limit_bytes: subscriptionLimitsData.limits.storage.limit_bytes,
            percentage: subscriptionLimitsData.limits.storage.percentage * 100,
            used_mb: subscriptionLimitsData.limits.storage.used_bytes / (1024 * 1024),
            limit_mb: subscriptionLimitsData.limits.storage.limit_bytes / (1024 * 1024)
          }
        };
        
        subscriptionData.current = current;
        setUsageData(current);
        setSuccess("Usage data refreshed successfully");
      } else if (subscriptionData && subscriptionData.current) {
        setUsageData(subscriptionData.current);
        setSuccess("Usage data refreshed successfully");
      } else {
        throw new Error("No usage data returned");
      }
    } catch (err) {
      console.error('Error refreshing usage data:', err);
      setError('Failed to refresh usage data');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType) => {
    if (planType === subscription?.plan_type) {
      return; // Already on this plan
    }
    
    try {
      setProcessingPlan(planType); // Set only the specific plan as processing
      
      // Store target plan for reference
      localStorage.setItem('targetPlan', planType);
      
      // Call the service to change plan
      await subscriptionService.changePlan(planType);
      
      // For free plan downgrades, we'll reach this point
      if (planType === 'free') {
        // Refresh data
        await fetchData();
        
        // Show success message
        setSuccess(`Successfully changed to ${plans[planType].name} plan.`);
      }
      // For paid plans, redirect happens in the service
      
    } catch (err) {
      console.error('Error changing plan:', err);
      setError(`Failed to change plan: ${err.message || 'An error occurred'}`);
    } finally {
      setProcessingPlan(null); // Reset processing state regardless of outcome
    }
  };

  if (loading && !subscription) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  
  // Default values if no usage data is available
  const defaultLimits = {
    messages: {
      used: 0,
      limit: plans[currentPlan].messageLimit,
      percentage: 0
    },
    storage: {
      used_bytes: 0,
      limit_bytes: 0.5 * 1024 * 1024, 
      percentage: 0
    }
  };
  
  // Get usage data with fallbacks
  const messagesUsed = usageData?.messages?.used || 0;
  const messagesLimit = usageData?.messages?.limit || plans[currentPlan].messageLimit;
  const messagePercentage = Math.min(((messagesUsed || 0) / (messagesLimit || 1)) * 100, 100) || 0;
  
  const storageUsed = usageData?.storage?.used_bytes || 0;
  const storageLimit = usageData?.storage?.limit_bytes || 50 * 1024 * 1024; // Default to 50MB
  const storagePercentage = Math.min(((storageUsed || 0) / (storageLimit || 1)) * 100, 100) || 0;
  
  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-6 rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription plan, billing details, and usage limits.
        </p>
      </div>

      {/* Alert messages */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <XMarkIcon className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-green-700">{success}</p>
            </div>
          </div>
        </div>
      )}

      {/* Current Plan */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Current Plan</h2>
        </div>
        
        <div className="p-6">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between">
            <div>
              <h3 className="text-xl font-bold text-primary-600">{plans[currentPlan]?.name || 'Free'} Plan</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 mt-1">
                {subscription?.status || 'active'}
              </span>
              <p className="mt-2 text-sm text-gray-500">
                {plans[currentPlan]?.description || 'Free plan with basic features'}
              </p>
              
              {/* Show next billing date for paid plans */}
              {currentPlan !== 'free' && subscription?.expires_at && (
                <p className="mt-2 text-sm text-gray-500">
                  Next billing date: {new Date(subscription.expires_at).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {/* Usage metrics */}
            <div className="mt-6 md:mt-0 grid grid-cols-1 sm:grid-cols-2 gap-4 md:w-1/2">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                <div className="mt-1 flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatNumber(messagesUsed)}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {formatNumber(messagesLimit)}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`${messagePercentage > 90 ? 'bg-red-500' : 'bg-indigo-600'} h-2 rounded-full`}
                    style={{ width: `${messagePercentage}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500 flex justify-end">
                  {messagePercentage.toFixed(1)}% used
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Storage</h4>
                <div className="mt-1 flex justify-between">
                  <span className="text-lg font-semibold text-gray-900">
                    {formatBytes(storageUsed)}
                  </span>
                  <span className="text-sm text-gray-500">
                    of {plans[currentPlan].storageLimit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className={`${storagePercentage > 90 ? 'bg-red-500' : 'bg-indigo-600'} h-2 rounded-full`}
                    style={{ width: `${storagePercentage}%` }}
                  ></div>
                </div>
                <div className="mt-1 text-xs text-gray-500 flex justify-end">
                  {storagePercentage.toFixed(1)}% used
                </div>
              </div>
              
              {/* Refresh button for usage data */}
              <div className="sm:col-span-2 flex justify-end">
                <button
                  onClick={refreshUsageData}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                  disabled={loading}
                >
                  {loading ? 'Refreshing...' : 'Refresh usage data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Available Plans</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {Object.entries(plans).map(([planType, plan]) => (
              <div 
                key={planType} 
                className={`border rounded-lg overflow-hidden flex flex-col h-full ${
                  planType === currentPlan 
                    ? 'border-indigo-500 ring-1 ring-indigo-500' 
                    : 'border-gray-200'
                }`}
              >
                <div className={`px-6 py-4 border-b ${
                  planType === currentPlan 
                    ? 'bg-indigo-50 border-indigo-100' 
                    : 'bg-gray-50 border-gray-200'
                }`}>
                  <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                  <p className="text-2xl font-bold mt-1">
                    {plan.price}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </p>
                  <p className="mt-2 text-sm text-gray-600">{plan.description}</p>
                </div>
                
                <div className="px-6 py-4 flex-grow">
                  <ul className="space-y-3">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        {feature.included ? (
                          <CheckIcon className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        ) : (
                          <XMarkIcon className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span className={`ml-3 text-sm ${feature.included ? 'text-gray-700' : 'text-gray-400'}`}>
                          {feature.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="px-6 pb-4 mt-auto">
                  {planType === currentPlan ? (
                    <span className="inline-block w-full py-2 px-4 border border-transparent font-medium rounded-md text-center bg-gray-100 text-gray-500">
                      Current Plan
                    </span>
                  ) : (
                    <button
                      onClick={() => handleUpgrade(planType)}
                      disabled={processingPlan !== null}
                      className={`w-full py-2 px-4 border border-transparent rounded-md font-medium text-center text-white ${
                        planType === 'free' 
                          ? 'bg-gray-600 hover:bg-gray-700' 
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {processingPlan === planType ? 'Processing...' : planType === 'free' ? 'Downgrade' : 'Upgrade'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;