import React, { useState, useEffect } from 'react';
import subscriptionService from '../../services/subscriptionService';
import analyticsService from '../../services/analyticsService';

const SubscriptionContent = ({ setError, setSuccess }) => {
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [formProcessing, setFormProcessing] = useState(false);
  
  // Plan details
  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      messages: '500',
      users: '5',
      storage: '50 MB',
      collections: '3'
    },
    basic: {
      name: 'Basic',
      price: '$29',
      messages: '5,000',
      users: '25',
      storage: '500 MB',
      collections: '10'
    },
    professional: {
      name: 'Professional',
      price: '$99',
      messages: '20,000',
      users: '100',
      storage: '2 GB',
      collections: '50'
    },
    enterprise: {
      name: 'Enterprise',
      price: '$349',
      messages: '100,000',
      users: '500',
      storage: '10 GB',
      collections: '250'
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Fetch current subscription information
      const subscriptionInfo = await subscriptionService.getCurrentSubscription();
      setSubscription(subscriptionInfo);
      
      // Fetch usage data
      const usageResponse = await analyticsService.getSubscriptionUsage();
      setUsageData(usageResponse);
      
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError('Failed to load subscription information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (planType) => {
    if (planType === subscription?.plan_type) {
      return; // Already on this plan
    }
    
    try {
      setFormProcessing(true);
      
      // For demo purposes, redirect to full subscription page for complex actions
      window.location.href = '/subscription';
      
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError(`Failed to upgrade: ${err.message}`);
    } finally {
      setFormProcessing(false);
    }
  };

  const handleManageSubscription = () => {
    // Redirect to the full subscription page
    window.location.href = '/subscription';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  const isCurrentPlanFree = currentPlan === 'free';
  const planEndsAt = subscription?.end_date ? new Date(subscription.end_date) : null;
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Subscription Management</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription plan, billing details, and usage limits.
        </p>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 gap-6">
        {/* Current Plan Card */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h3 className="text-xl font-bold text-primary-600">{plans[currentPlan]?.name || 'Free'} Plan</h3>
              <p className="text-sm text-gray-500 mt-1">
                {isCurrentPlanFree ? 'Free' : `${plans[currentPlan]?.price}/month`}
              </p>
              {!isCurrentPlanFree && planEndsAt && (
                <p className="text-sm text-gray-500 mt-1">
                  Current period ends on <span className="font-medium">{planEndsAt.toLocaleDateString()}</span>
                </p>
              )}
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleManageSubscription}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              >
                Manage Subscription
              </button>
            </div>
          </div>

          {/* Usage statistics */}
          {usageData && (
            <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {usageData.messages?.used || 0} / {usageData.messages?.limit || plans[currentPlan]?.messages || 0}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min((usageData.messages?.percentage || 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Users</h4>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {usageData.users?.active || 0} / {usageData.users?.limit || plans[currentPlan]?.users || 0}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min((usageData.users?.percentage || 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Storage</h4>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {Math.round((usageData.storage?.used_bytes || 0) / (1024 * 1024))} MB / 
                  {plans[currentPlan]?.storage || '0 MB'}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min((usageData.storage?.percentage || 0), 100)}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700">Collections</h4>
                <div className="mt-1 text-lg font-semibold text-gray-900">
                  {usageData.collections?.count || 0} / {plans[currentPlan]?.collections || 0}
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full"
                    style={{ width: `${Math.min(((usageData.collections?.count || 0) / (plans[currentPlan]?.collections || 1) * 100), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Available Plans */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Plan</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Messages</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Users</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Storage</th>
                <th className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(plans).map(([planType, plan]) => (
                <tr key={planType} className={planType === currentPlan ? 'bg-primary-50' : ''}>
                  <td className="py-4 pl-4 pr-3 text-sm">
                    <div className="font-medium text-gray-900">{plan.name}</div>
                    {planType === currentPlan && (
                      <div className="text-xs text-primary-600 font-medium mt-1">Current Plan</div>
                    )}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">{plan.price}/month</td>
                  <td className="px-3 py-4 text-sm text-gray-500">{plan.messages}</td>
                  <td className="px-3 py-4 text-sm text-gray-500">{plan.users}</td>
                  <td className="px-3 py-4 text-sm text-gray-500">{plan.storage}</td>
                  <td className="py-4 pl-3 pr-4 text-right text-sm font-medium">
                    {planType !== currentPlan ? (
                      <button
                        onClick={() => handleUpgrade(planType)}
                        className={`inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm ${
                          'text-white bg-primary-600 hover:bg-primary-700'
                        }`}
                        disabled={formProcessing}
                      >
                        {planType === 'free' ? 'Downgrade' : 'Upgrade'}
                      </button>
                    ) : (
                      <span className="text-gray-500">Current</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Need more info section */}
      <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-primary-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-primary-700">
              Need more information about our plans? <a href="/subscription" className="font-medium underline">Visit the subscription page</a> or <a href="#" className="font-medium underline">contact our sales team</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionContent;