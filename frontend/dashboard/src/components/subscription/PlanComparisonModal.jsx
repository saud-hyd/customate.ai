import React, { useState } from 'react';
import { CheckIcon, XMarkIcon } from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';

const PlanComparisonModal = ({ isOpen, onClose, onSelectPlan, currentPlan }) => {
  const [billingCycle, setBillingCycle] = useState('annually'); // Default to annually
  const [processing, setProcessing] = useState(false);

  // Get dynamic plan details from service
  const plans = subscriptionService.getPlans();

  // Feature comparison matrix - Updated to match marketing website
  const featureMatrix = {
    messages: {
      title: 'Messages per Month',
      values: {
        free: '100',
        basic: '3,000',
        standard: '10,000',
        professional: '40,000'
      }
    },
    storage: {
      title: 'Storage Limit',
      values: {
        free: '500 KB',
        basic: '5 MB',
        standard: '25 MB',
        professional: '35 MB'
      }
    },
    chatbot: {
      title: 'Chatbot Features',
      values: {
        free: 'Basic customization',
        basic: 'Basic customization',
        standard: 'Advanced customization',
        professional: 'Custom deployment'
      }
    },
    support: {
      title: 'Support Level',
      values: {
        free: 'Community',
        basic: 'Email support',
        standard: 'Priority email support',
        professional: 'Phone & email support'
      }
    },
    analytics: {
      title: 'Analytics',
      values: {
        free: false,
        basic: true,
        standard: true,
        professional: true
      }
    },
    advancedAnalytics: {
      title: 'Advanced Analytics',
      values: {
        free: false,
        basic: false,
        standard: true,
        professional: true
      }
    },
    apiAccess: {
      title: 'API Access',
      values: {
        free: false,
        basic: true,
        standard: true,
        professional: true
      }
    },
    customIntegrations: {
      title: 'Custom Integrations',
      values: {
        free: false,
        basic: false,
        standard: false,
        professional: true
      }
    },
    accountManager: {
      title: 'Dedicated Account Manager',
      values: {
        free: false,
        basic: false,
        standard: false,
        professional: true
      }
    }
  };

  // All plan types
  const planTypes = ['free', 'basic', 'standard', 'professional'];

  const handlePlanSelect = async (planType) => {
    if (planType === currentPlan) {
      return;
    }

    setProcessing(true);
    try {
      if (onSelectPlan) {
        await onSelectPlan(planType, billingCycle);
      }
      onClose();
    } catch (error) {
      console.error('Error selecting plan:', error);
    } finally {
      setProcessing(false);
    }
  };

  const renderFeatureValue = (feature, planType) => {
    const value = feature.values[planType];
    
    if (typeof value === 'boolean') {
      return value ? (
        <CheckIcon className="h-5 w-5 text-orange-500 mx-auto" />
      ) : (
        <XMarkIcon className="h-5 w-5 text-gray-400 mx-auto" />
      );
    }
    
    return <span className="text-sm text-gray-900">{value}</span>;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-xl px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full sm:p-6">
          <div className="absolute top-0 right-0 pt-4 pr-4">
            <button
              type="button"
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg leading-6 font-medium text-gradient-orange mb-4">
                Compare Plans
              </h3>

              {/* Enhanced Billing Cycle Toggle */}
              <div className="flex justify-center mb-6">
                <div className="bg-white rounded-xl p-2 shadow-lg border border-orange-200 flex">
                  <button
                    onClick={() => setBillingCycle('annually')}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      billingCycle === 'annually'
                        ? 'bg-gradient-orange text-white shadow-orange'
                        : 'text-gray-600 hover:text-orange-600'
                    }`}
                  >
                    Annually
                    <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                      Save 20%
                    </span>
                  </button>
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      billingCycle === 'monthly'
                        ? 'bg-gradient-orange text-white shadow-orange'
                        : 'text-gray-600 hover:text-orange-600'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
              </div>

              {/* Plan Headers */}
              <div className="grid grid-cols-5 gap-4 mb-6">
                <div className="col-span-1">
                  <h4 className="text-sm font-medium text-gray-900">Features</h4>
                </div>
                {planTypes.map((planType) => {
                  const plan = plans[planType];
                  const isCurrentPlan = planType === currentPlan;
                  
                  return (
                    <div key={planType} className={`text-center p-4 rounded-xl border-2 ${
                      isCurrentPlan ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                    }`}>
                      <div className="mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                        <p className="text-2xl font-bold text-gradient-orange mt-1">
                          {plan.price[billingCycle]}
                        </p>
                        {planType !== 'free' && (
                          <p className="text-sm text-gray-500">
                            per month
                          </p>
                        )}
                        {planType !== 'free' && billingCycle === 'annually' && (
                          <p className="text-xs text-green-600 mt-1">Billed annually</p>
                        )}
                      </div>
                      
                      {isCurrentPlan ? (
                        <div className="text-sm text-orange-600 font-medium">
                          Current Plan
                        </div>
                      ) : (
                        <button
                          onClick={() => handlePlanSelect(planType)}
                          disabled={processing}
                          className={`w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            processing ? 'opacity-50 cursor-not-allowed' : ''
                          } ${
                            planType === 'free'
                              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                              : 'btn-orange shadow-orange hover:shadow-orange-lg'
                          }`}
                        >
                          {processing ? 'Processing...' : 'Upgrade'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Feature Comparison Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <tbody className="divide-y divide-gray-200">
                    {Object.entries(featureMatrix).map(([featureKey, feature]) => (
                      <tr key={featureKey} className="hover:bg-orange-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {feature.title}
                        </td>
                        {planTypes.map((planType) => (
                          <td key={planType} className="px-6 py-4 whitespace-nowrap text-center">
                            {renderFeatureValue(feature, planType)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Footer */}
              <div className="mt-6 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  All paid plans include a 14-day free trial
                </div>
                <button
                  onClick={onClose}
                  className="btn-orange-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanComparisonModal;