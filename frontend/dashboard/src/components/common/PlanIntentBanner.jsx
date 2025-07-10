import React from 'react';
import { XMarkIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { usePlanIntent } from '../../hooks/usePlanIntent';
import { useNavigate } from 'react-router-dom';

const PlanIntentBanner = () => {
  const { planIntent, clearPlanIntent } = usePlanIntent();
  const navigate = useNavigate();

  if (!planIntent) return null;

  const handleUpgrade = async () => {
    try {
      // Use the subscription service to start the upgrade process
      const subscriptionService = await import('../../services/subscriptionService');
      await subscriptionService.default.upgradeWithIntent(planIntent.plan, planIntent.billing);
      clearPlanIntent();
    } catch (error) {
      console.error('Error starting upgrade:', error);
      // Fallback to subscription page
      clearPlanIntent();
      navigate('/subscription');
    }
  };

  const getPlanDisplayName = (plan) => {
    return plan.charAt(0).toUpperCase() + plan.slice(1);
  };

  const getBillingDisplayName = (billing) => {
    return billing === 'annual' ? 'Annual (Save 20%)' : 'Monthly';
  };

  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-4 rounded-lg shadow-lg mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <SparklesIcon className="h-6 w-6 mr-3" />
          <div>
            <h3 className="font-semibold text-lg">
              Ready to upgrade to {getPlanDisplayName(planIntent.plan)}?
            </h3>
            <p className="text-blue-100 text-sm">
              {getBillingDisplayName(planIntent.billing)} billing • Start your upgrade now
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleUpgrade}
            className="bg-white text-blue-600 px-4 py-2 rounded-md font-medium hover:bg-blue-50 transition-colors"
          >
            Upgrade Now
          </button>
          <button
            onClick={clearPlanIntent}
            className="text-blue-100 hover:text-white transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlanIntentBanner;