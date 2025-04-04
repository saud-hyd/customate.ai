import React from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import Button from '../common/Button';

const PlanComparisonModal = ({ isOpen, onClose, plans, currentPlan, onSelectPlan }) => {
  if (!isOpen) return null;

  // Plan features to compare
  const features = {
    messages: {
      title: 'Monthly Messages',
      values: {
        free: '100',
        basic: '2,000',
        professional: '5,000',
        enterprise: '12,000'
      }
    },
    users: {
      title: 'Active Users',
      values: {
        free: '5',
        basic: '25',
        professional: '100',
        enterprise: '500'
      }
    },
    storage: {
      title: 'Storage',
      values: {
        free: '500 KB',
        basic: '5 MB',
        professional: '25 MB',
        enterprise: '100 MB'
      }
    },
    collections: {
      title: 'Knowledge Collections',
      values: {
        free: '3',
        basic: '10',
        professional: '50',
        enterprise: '250'
      }
    },
    basicChat: {
      title: 'Basic Chat',
      values: {
        free: true,
        basic: true,
        professional: true,
        enterprise: true
      }
    },
    advancedChat: {
      title: 'Advanced Chat',
      values: {
        free: false,
        basic: false,
        professional: true,
        enterprise: true
      }
    },
    knowledge: {
      title: 'Knowledge Integration',
      values: {
        free: true,
        basic: true,
        professional: true,
        enterprise: true
      }
    },
    analytics: {
      title: 'Analytics',
      values: {
        free: false,
        basic: true,
        professional: true,
        enterprise: true
      }
    },
    advancedAnalytics: {
      title: 'Advanced Analytics',
      values: {
        free: false,
        basic: false,
        professional: true,
        enterprise: true
      }
    },
    integrations: {
      title: 'External Integrations',
      values: {
        free: false,
        basic: false,
        professional: true,
        enterprise: true
      }
    },
    customDomain: {
      title: 'Custom Domain',
      values: {
        free: false,
        basic: false,
        professional: true,
        enterprise: true
      }
    },
    support: {
      title: 'Support Level',
      values: {
        free: 'Community',
        basic: 'Email',
        professional: 'Priority Email',
        enterprise: 'Dedicated Account Manager'
      }
    },
    sla: {
      title: 'SLA Guarantees',
      values: {
        free: false,
        basic: false,
        professional: false,
        enterprise: true
      }
    }
  };

  // All plan types
  const planTypes = ['free', 'basic', 'standard', 'professional'];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" 
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Modal container */}
        <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full sm:p-6">
          {/* Header */}
          <div className="flex justify-between items-start mb-5">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Compare Subscription Plans
            </h3>
            <button
              onClick={onClose}
              className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none"
            >
              <span className="sr-only">Close</span>
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Plan comparison table */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Feature
                  </th>
                  {planTypes.map(planType => (
                    <th 
                      key={planType} 
                      scope="col" 
                      className={`px-6 py-3 text-center text-xs font-medium uppercase tracking-wider ${
                        planType === currentPlan 
                          ? 'bg-primary-50 text-primary-700'
                          : 'text-gray-500'
                      }`}
                    >
                      {plans[planType].name}
                      <div className="font-normal mt-1">{plans[planType].price}/month</div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-200">
                {/* Feature rows */}
                {Object.entries(features).map(([featureKey, feature]) => (
                  <tr key={featureKey} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {feature.title}
                    </td>
                    {planTypes.map(planType => (
                      <td 
                        key={`${featureKey}-${planType}`} 
                        className={`px-6 py-4 whitespace-nowrap text-sm text-center ${
                          planType === currentPlan 
                            ? 'bg-primary-50 text-primary-700'
                            : 'text-gray-500'
                        }`}
                      >
                        {typeof feature.values[planType] === 'boolean' ? (
                          feature.values[planType] ? (
                            <CheckIcon className="h-5 w-5 mx-auto text-green-500" />
                          ) : (
                            <XMarkIcon className="h-5 w-5 mx-auto text-gray-300" />
                          )
                        ) : (
                          feature.values[planType]
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Plan selection buttons */}
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {planTypes.map(planType => (
              <div key={planType} className="col-span-1">
                {planType === currentPlan ? (
                  <Button
                    disabled
                    variant="outline"
                    className="w-full"
                  >
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    onClick={() => {
                      onSelectPlan(planType);
                      onClose();
                    }}
                    variant={planType === 'free' ? 'secondary' : 'primary'}
                    className="w-full"
                  >
                    {planType === 'free' ? 'Downgrade' : 'Select'} {plans[planType].name}
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Footnote */}
          <div className="mt-5 text-xs text-gray-500 text-center">
            All plans are billed monthly. You can cancel or change your plan at any time.
            For enterprise-specific needs, please contact our sales team.
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanComparisonModal;