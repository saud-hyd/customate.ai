// Path: frontend/dashboard/src/pages/subscription/SubscriptionPage.jsx
import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';
import api from '../../services/api';

const SubscriptionPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [processingPlan, setProcessingPlan] = useState(null);
  const [billingCycle, setBillingCycle] = useState('annually'); // Default to annually

  // Get dynamic plan details from service
  const plans = subscriptionService.getPlans();

  useEffect(() => {
    fetchData();
    handleUrlParams();
  }, []);

  const handleUrlParams = () => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('success') === 'true') {
      setSuccess('Payment successful! Your subscription has been updated.');
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (urlParams.get('cancelled') === 'true') {
      setError('Payment was cancelled. Your subscription remains unchanged.');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch subscription info
      const subData = await subscriptionService.getCurrentSubscription();
      setSubscription(subData);
      
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError('Failed to load subscription data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (planType) => {
    const currentPlan = subscription?.plan_type || 'free';
    
    if (planType === currentPlan) {
      return;
    }
    
    try {
      setProcessingPlan(planType);
      setError(null);
      
      if (planType === 'free') {
        // Direct downgrade to free
        await subscriptionService.changePlan(planType);
        setSuccess('Successfully downgraded to Free plan');
        fetchData();
      } else {
        // Redirect to Stripe checkout for paid plans
        await subscriptionService.changePlan(planType, billingCycle);
      }
    } catch (err) {
      console.error('Error changing plan:', err);
      setError(`Failed to change plan: ${err.message}`);
    } finally {
      setProcessingPlan(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await api.post('/api/client/subscription/billing-portal', {
        return_url: window.location.href
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (err) {
      console.error('Error accessing billing portal:', err);
      setError('Failed to access billing portal. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  const isCurrentPlanFree = currentPlan === 'free';

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">


        {/* Status Messages */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex">
              <XMarkIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex">
              <CheckIcon className="h-5 w-5 text-green-400" />
              <div className="ml-3">
                <p className="text-sm text-green-800">{success}</p>
              </div>
            </div>
          </div>
        )}


        {/* Improved Billing Cycle Toggle */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-100 rounded-full p-1 inline-flex">
            <button
              onClick={() => setBillingCycle('annually')}
              className={`relative px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                billingCycle === 'annually'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Annual
              {billingCycle === 'annually' && (
                <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                  -20%
                </span>
              )}
            </button>
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-6 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
                billingCycle === 'monthly'
                  ? 'bg-white text-orange-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrentPlan = planKey === currentPlan;
            const isProcessing = processingPlan === planKey;
            
            return (
              <div
                key={planKey}
                className={`card-orange relative h-full flex flex-col ${
                  isCurrentPlan ? 'ring-2 ring-orange-500' : ''
                } ${plan.highlighted ? 'ring-2 ring-orange-400 transform scale-105' : ''}`}
              >
                {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-orange text-white px-3 py-1 rounded-full text-xs font-medium">
                      Current Plan
                    </span>
                  </div>
                )}

                {plan.highlighted && !isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1 rounded-full text-xs font-medium">
                      Popular
                    </span>
                  </div>
                )}

                <div className="text-center flex-grow">
                  <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                  <p className="text-sm text-gray-500 mt-1 mb-4">{plan.description}</p>
                  
                  <div className="mb-6">
                    <span className="text-3xl font-bold text-gradient-orange">
                      {plan.price[billingCycle]}
                    </span>
                    {planKey !== 'free' && (
                      <span className="text-sm text-gray-500">
                        /month
                      </span>
                    )}
                    {planKey !== 'free' && billingCycle === 'annually' && (
                      <p className="text-xs text-green-600 mt-1">Billed annually</p>
                    )}
                  </div>

                  <div className="text-left space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <div key={index} className="flex items-center">
                        <CheckIcon className="h-4 w-4 text-orange-500 mr-3 flex-shrink-0" />
                        <span className="text-sm text-gray-700">{feature}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* All Upgrade buttons with same shiny effect */}
                <div className="mt-auto">
                  <button
                    onClick={() => handlePlanChange(planKey)}
                    disabled={isCurrentPlan || isProcessing}
                    className={`w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                      isCurrentPlan
                        ? 'bg-gray-100 text-gray-500 cursor-not-allowed'
                        : 'btn-orange shadow-orange hover:shadow-orange-lg transform hover:scale-105'
                    } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600 mr-2"></div>
                        Processing...
                      </div>
                    ) : isCurrentPlan ? (
                      'Current Plan'
                    ) : (
                      plan.cta
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Additional Information */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>
          Need a custom plan? <a href="https://www.customate.ai/contact" className="text-orange-600 hover:text-orange-500 font-medium">Contact our sales team</a> for enterprise solutions.          </p>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;