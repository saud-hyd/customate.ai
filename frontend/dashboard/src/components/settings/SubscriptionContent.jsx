import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import subscriptionService from '../../services/subscriptionService';

const SubscriptionContent = ({ setError, setSuccess }) => {
  const { t } = useTranslation(['subscription', 'common']);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState(null);
  const [formProcessing, setFormProcessing] = useState(false);
  
  // Get dynamic plan details from service
  const plans = subscriptionService.getPlans();

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      
      // Fetch current subscription information
      const subscriptionInfo = await subscriptionService.getCurrentSubscription();
      setSubscription(subscriptionInfo);
      
    } catch (err) {
      console.error('Error fetching subscription data:', err);
      setError(t('common:errors.loadFailed', 'Failed to load subscription information. Please try again later.'));
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
      setError(t('common:errors.upgradeFailed', 'Failed to upgrade: {{error}}', { error: err.message }));
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  const isCurrentPlanFree = currentPlan === 'free';
  const planEndsAt = subscription?.end_date ? new Date(subscription.end_date) : null;
  const currentPlanDetails = plans[currentPlan];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">{t('subscription:title')} {t('common:management', 'Management')}</h3>
        <p className="mt-1 text-sm text-gray-500">
          {t('common:descriptions.subscriptionManagement', 'Manage your subscription plan, billing details, and usage limits.')}
        </p>
      </div>

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 gap-6">
        {/* Current Plan Card - Removed Usage Statistics */}
        <div className="card-orange">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center">
            <div>
              <h3 className="text-xl font-bold text-gradient-orange">{currentPlanDetails?.name || t('subscription:plans.free')} {t('common:plan', 'Plan')}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {isCurrentPlanFree ? t('common:freeForever', 'Free forever') : `${currentPlanDetails?.price.annually}/${t('common:year', 'year')}`}
              </p>
              {!isCurrentPlanFree && planEndsAt && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('subscription:billing.currentPeriodEnds', 'Current period ends on')} <span className="font-medium">{planEndsAt.toLocaleDateString()}</span>
                </p>
              )}
            </div>
            <div className="mt-4 md:mt-0">
              <button
                onClick={handleManageSubscription}
                className="btn-orange shadow-orange"
              >
                {t('common:actions.manageSubscription', 'Manage Subscription')}
              </button>
            </div>
          </div>
        </div>

        {/* Plan Overview Cards with Marketing Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Object.entries(plans).map(([planKey, plan]) => {
            const isCurrentPlan = planKey === currentPlan;
            
            return (
              <div
                key={planKey}
                className={`bg-white border rounded-xl p-4 h-full flex flex-col ${
                  isCurrentPlan ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300'
                } ${plan.highlighted ? 'ring-2 ring-orange-400' : ''} transition-all duration-200`}
              >
                {plan.highlighted && !isCurrentPlan && (
                  <div className="absolute -top-2 left-1/2 transform -translate-x-1/2">
                    <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                      {t('common:popular', 'Popular')}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-gray-900">{plan.name}</h4>
                    <p className="text-sm text-gray-500">{plan.price.annually}/month</p>
                  </div>
                  {isCurrentPlan && (
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                      {t('common:current', 'Current')}
                    </span>
                  )}
                </div>
                
                {/* Show marketing features */}
                <div className="flex-grow space-y-2 mb-4">
                  {plan.features.slice(0, 3).map((feature, index) => (
                    <div key={index} className="text-xs text-gray-600 flex items-center">
                      <div className="w-1 h-1 bg-orange-500 rounded-full mr-2"></div>
                      {feature}
                    </div>
                  ))}
                  {plan.features.length > 3 && (
                    <div className="text-xs text-gray-500">
                      +{plan.features.length - 3} {t('common:moreFeatures', 'more features')}
                    </div>
                  )}
                </div>

                {!isCurrentPlan && (
                  <button
                    onClick={() => handleUpgrade(planKey)}
                    disabled={formProcessing}
                    className={`w-full text-xs px-3 py-2 rounded-lg font-medium transition-all duration-200 ${
                      planKey === 'free'
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'btn-orange shadow-orange hover:shadow-orange-lg transform hover:scale-105'
                    } ${formProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {t('subscription:upgrade')}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Additional Info */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-orange-800">{t('common:needHelp', 'Need Help?')}</h4>
              <p className="mt-1 text-sm text-orange-700">
                {t('common:descriptions.subscriptionHelp', 'Visit our')} <a href="/subscription" className="underline hover:text-orange-600 font-medium">{t('common:subscriptionPage', 'subscription page')}</a> {t('common:descriptions.subscriptionHelpDetails', 'for detailed plan comparisons and billing management.')}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionContent;