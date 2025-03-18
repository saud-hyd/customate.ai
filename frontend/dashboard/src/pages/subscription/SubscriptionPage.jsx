import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckIcon, XMarkIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';
import analyticsService from '../../services/analyticsService';

// Components
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Alert from '../../components/common/Alert';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import SubscriptionUsage from '../../components/analytics/SubscriptionUsage';
import PlanComparisonModal from '../../components/subscription/PlanComparisonModal';
import PaymentMethodForm from '../../components/subscription/PaymentMethodForm';

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [usageData, setUsageData] = useState(null);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [recommendedPlan, setRecommendedPlan] = useState(null);
  const [showComparisonModal, setShowComparisonModal] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formProcessing, setFormProcessing] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  
  // Plan details
  const plans = {
    free: {
      name: 'Free',
      price: '$0',
      features: [
        '500 messages per month',
        '5 active users',
        '50 MB storage',
        '3 knowledge collections',
        'Basic chat functionality',
        'Community support'
      ]
    },
    basic: {
      name: 'Basic',
      price: '$29',
      features: [
        '5,000 messages per month',
        '25 active users',
        '500 MB storage',
        '10 knowledge collections',
        'Basic chat functionality',
        'Knowledge integration',
        'Analytics dashboard',
        'Email support'
      ]
    },
    professional: {
      name: 'Professional',
      price: '$99',
      features: [
        '20,000 messages per month',
        '100 active users',
        '2 GB storage',
        '50 knowledge collections',
        'Advanced chat functionality',
        'Knowledge integration',
        'Advanced analytics',
        'Custom domain',
        'External integrations',
        'Priority email support'
      ]
    },
    enterprise: {
      name: 'Enterprise',
      price: '$349',
      features: [
        '100,000 messages per month',
        '500 active users',
        '10 GB storage',
        '250 knowledge collections',
        'Advanced chat functionality',
        'Knowledge integration',
        'Advanced analytics',
        'Custom domain',
        'External integrations',
        'Dedicated account manager',
        'SLA guarantees',
        'Phone support'
      ]
    }
  };

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch current subscription information
      const subscriptionInfo = await subscriptionService.getCurrentSubscription();
      setSubscription(subscriptionInfo);
      
      // Fetch usage data
      const usageResponse = await analyticsService.getSubscriptionUsage();
      setUsageData(usageResponse);
      
      // Fetch payment methods
      const paymentMethodsResponse = await subscriptionService.getPaymentMethods();
      setPaymentMethods(paymentMethodsResponse);
      
      // Fetch recent invoices
      const invoicesResponse = await subscriptionService.getInvoices();
      setInvoices(invoicesResponse);
      
      // Get recommended plan
      const recommendationResponse = await subscriptionService.getRecommendedPlan();
      setRecommendedPlan(recommendationResponse);
      
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
      
      // If upgrading from free, show payment form
      if (subscription?.plan_type === 'free' && planType !== 'free') {
        setShowPaymentForm(true);
        return;
      }
      
      // Otherwise, process the upgrade directly
      const response = await subscriptionService.changePlan(planType);
      
      // Refresh data
      await fetchSubscriptionData();
      
      // Show success message
      setError({
        type: 'success',
        message: `Successfully upgraded to ${plans[planType].name} plan.`
      });
      
    } catch (err) {
      console.error('Error upgrading subscription:', err);
      setError({
        type: 'error',
        message: `Failed to upgrade: ${err.message}`
      });
    } finally {
      setFormProcessing(false);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setFormProcessing(true);
      
      // Call API to cancel subscription
      await subscriptionService.cancelSubscription();
      
      // Refresh data
      await fetchSubscriptionData();
      
      // Close confirmation dialog
      setCancelConfirmOpen(false);
      
      // Show success message
      setError({
        type: 'success',
        message: 'Your subscription has been cancelled and will remain active until the end of the current billing period.'
      });
      
    } catch (err) {
      console.error('Error cancelling subscription:', err);
      setError({
        type: 'error',
        message: `Failed to cancel subscription: ${err.message}`
      });
    } finally {
      setFormProcessing(false);
    }
  };

  const handleViewBilling = async () => {
    try {
      // Generate billing portal URL
      const portalResponse = await subscriptionService.getBillingPortal(window.location.origin + '/subscription');
      
      // Redirect to Stripe portal
      if (portalResponse && portalResponse.portal_url) {
        window.location.href = portalResponse.portal_url;
      }
    } catch (err) {
      console.error('Error accessing billing portal:', err);
      setError({
        type: 'error',
        message: 'Failed to access billing portal. Please try again later.'
      });
    }
  };

  const handlePaymentMethodSubmit = async (paymentMethodId) => {
    try {
      setFormProcessing(true);
      
      // Add payment method
      await subscriptionService.addPaymentMethod(paymentMethodId);
      
      // Now upgrade to the selected plan
      const targetPlan = localStorage.getItem('targetPlan') || 'basic';
      const response = await subscriptionService.changePlan(targetPlan);
      
      // Clear storage
      localStorage.removeItem('targetPlan');
      
      // Refresh data
      await fetchSubscriptionData();
      
      // Close payment form
      setShowPaymentForm(false);
      
      // Show success message
      setError({
        type: 'success',
        message: `Successfully added payment method and upgraded to ${plans[targetPlan].name} plan.`
      });
      
    } catch (err) {
      console.error('Error processing payment method:', err);
      setError({
        type: 'error',
        message: `Failed to process payment: ${err.message}`
      });
    } finally {
      setFormProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const currentPlan = subscription?.plan_type || 'free';
  const isCurrentPlanFree = currentPlan === 'free';
  const planEndsAt = subscription?.end_date ? new Date(subscription.end_date) : null;
  const hasRecommendation = recommendedPlan && recommendedPlan.recommended_plan !== currentPlan;
  
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Subscription Management</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your subscription plan, billing details, and usage limits.
        </p>
      </div>

      {error && (
        <Alert 
          type={error.type || 'error'}
          message={error.message}
          onClose={() => setError(null)}
        />
      )}

      {/* Current Plan & Usage */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Plan Card */}
        <Card title="Current Plan" className="lg:col-span-1">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-4 border-b border-gray-200">
              <div>
                <h3 className="text-xl font-bold text-primary-600">{plans[currentPlan]?.name || 'Free'}</h3>
                <p className="text-sm text-gray-500">
                  {isCurrentPlanFree ? 'Free Plan' : `${plans[currentPlan]?.price}/month`}
                </p>
              </div>
              <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-sm font-medium">
                {subscription?.status || 'Active'}
              </div>
            </div>
            
            {!isCurrentPlanFree && planEndsAt && (
              <div>
                <p className="text-sm text-gray-500">
                  Current period ends on <span className="font-medium">{planEndsAt.toLocaleDateString()}</span>
                </p>
              </div>
            )}
            
            <div className="space-y-1">
              <h4 className="font-medium text-gray-700">Plan Features:</h4>
              <ul className="space-y-2">
                {plans[currentPlan]?.features.map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <CheckIcon className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="pt-4 mt-4 border-t border-gray-200">
              <div className="flex flex-col space-y-3">
                <Button
                  onClick={() => setShowComparisonModal(true)}
                  variant="outline"
                >
                  Compare Plans
                </Button>
                
                {!isCurrentPlanFree && (
                  <Button
                    onClick={handleViewBilling}
                    variant="outline"
                  >
                    Manage Billing
                  </Button>
                )}
                
                {!isCurrentPlanFree && (
                  <Button
                    onClick={() => setCancelConfirmOpen(true)}
                    variant="danger-outline"
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Usage Card */}
        <div className="lg:col-span-2">
          <SubscriptionUsage 
            usageData={usageData} 
            refreshData={fetchSubscriptionData}
          />
        </div>
      </div>

      {/* Recommended Plan Card */}
      {hasRecommendation && (
        <Card 
          title="Recommended Plan" 
          className="border-l-4 border-primary-500"
        >
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2 lg:pr-6 lg:mr-6 lg:border-r border-gray-200">
              <p className="text-gray-600">
                {recommendedPlan.recommendation_reason}
              </p>
              <div className="flex items-center">
                <span className="font-medium text-gray-700 mr-2">Recommended Plan:</span>
                <span className="text-primary-600 font-bold">{plans[recommendedPlan.recommended_plan].name}</span>
              </div>
            </div>
            
            <div className="mt-4 lg:mt-0 flex flex-col space-y-2">
              <div className="text-lg font-bold text-gray-700">
                {plans[recommendedPlan.recommended_plan].price}/month
              </div>
              <Button
                onClick={() => handleUpgrade(recommendedPlan.recommended_plan)}
                disabled={formProcessing}
              >
                {formProcessing ? 'Processing...' : `Upgrade to ${plans[recommendedPlan.recommended_plan].name}`}
              </Button>
              <button 
                className="text-xs text-gray-500 underline"
                onClick={() => setShowComparisonModal(true)}
              >
                Compare all plans
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* Available Plans */}
      <Card title="Available Plans">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Plan</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Price</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Messages</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Users</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Storage</th>
                <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Collections</th>
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
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {planType === 'free' ? '500' : 
                     planType === 'basic' ? '5,000' :
                     planType === 'professional' ? '20,000' : '100,000'}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {planType === 'free' ? '5' : 
                     planType === 'basic' ? '25' :
                     planType === 'professional' ? '100' : '500'}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {planType === 'free' ? '50 MB' : 
                     planType === 'basic' ? '500 MB' :
                     planType === 'professional' ? '2 GB' : '10 GB'}
                  </td>
                  <td className="px-3 py-4 text-sm text-gray-500">
                    {planType === 'free' ? '3' : 
                     planType === 'basic' ? '10' :
                     planType === 'professional' ? '50' : '250'}
                  </td>
                  <td className="py-4 pl-3 pr-4 text-right text-sm font-medium">
                    {planType !== currentPlan ? (
                      <Button
                        onClick={() => {
                          localStorage.setItem('targetPlan', planType);
                          handleUpgrade(planType);
                        }}
                        variant={planType === recommendedPlan?.recommended_plan ? 'primary' : 'outline'}
                        size="sm"
                        disabled={formProcessing}
                      >
                        {planType === 'free' ? 'Downgrade' : 'Upgrade'}
                      </Button>
                    ) : (
                      <span className="text-gray-500">Current</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Payment Methods */}
      <Card 
        title="Payment Methods" 
        subtitle="Manage your saved payment methods"
        actionButton={
          <Button 
            onClick={() => setShowPaymentForm(true)}
            variant="outline"
            size="sm"
          >
            Add Payment Method
          </Button>
        }
      >
        {paymentMethods.length === 0 ? (
          <div className="py-4 text-center text-gray-500">
            <p>No payment methods found.</p>
            <p className="text-sm mt-1">Add a payment method to subscribe to a paid plan.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {paymentMethods.map((method) => (
              <div key={method.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-md">
                <div className="flex items-center space-x-4">
                  <div className="w-10 h-6 bg-gray-100 flex items-center justify-center rounded">
                    {method.card.brand === 'visa' && <span className="text-blue-600 font-bold text-xs">VISA</span>}
                    {method.card.brand === 'mastercard' && <span className="text-red-600 font-bold text-xs">MC</span>}
                    {method.card.brand === 'amex' && <span className="text-blue-800 font-bold text-xs">AMEX</span>}
                    {!['visa', 'mastercard', 'amex'].includes(method.card.brand) && 
                      <span className="text-gray-600 font-bold text-xs">{method.card.brand.toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      •••• •••• •••• {method.card.last4}
                    </div>
                    <div className="text-sm text-gray-500">
                      Expires {method.card.exp_month}/{method.card.exp_year}
                    </div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  {method.is_default && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Default
                    </span>
                  )}
                  <Button
                    variant="danger-outline"
                    size="sm"
                    onClick={() => {
                      // We'd implement this in a real app, but for this demo we'll just show a message
                      alert('Payment method removal would be handled in the Stripe Billing Portal.');
                      handleViewBilling();
                    }}
                  >
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Recent Invoices */}
      {invoices.length > 0 && (
        <Card title="Recent Invoices">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300">
              <thead>
                <tr>
                  <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900">Invoice Number</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Date</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Amount</th>
                  <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Status</th>
                  <th className="py-3.5 pl-3 pr-4 text-right text-sm font-semibold text-gray-900">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="py-4 pl-4 pr-3 text-sm font-medium text-gray-900">{invoice.number}</td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {new Date(invoice.created).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      ${invoice.amount_due.toFixed(2)}
                    </td>
                    <td className="px-3 py-4 text-sm">
                      {invoice.status === 'paid' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Paid
                        </span>
                      )}
                      {invoice.status === 'open' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      )}
                      {invoice.status === 'uncollectible' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                          Failed
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-3 pr-4 text-right text-sm font-medium">
                      <a
                        href={invoice.pdf_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View PDF
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Plan Comparison Modal */}
      <PlanComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        plans={plans}
        currentPlan={currentPlan}
        onSelectPlan={handleUpgrade}
      />

      {/* Payment Method Form */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Payment Method</h3>
              <button
                onClick={() => setShowPaymentForm(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <PaymentMethodForm
              onSubmit={handlePaymentMethodSubmit}
              processing={formProcessing}
              onCancel={() => setShowPaymentForm(false)}
            />
          </div>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {cancelConfirmOpen && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <div className="mb-4">
              <h3 className="text-lg font-medium text-gray-900">Cancel Subscription</h3>
              <p className="mt-2 text-sm text-gray-500">
                Are you sure you want to cancel your subscription? You will still have access until the end of your current billing period.
              </p>
            </div>
            
            <div className="flex justify-end space-x-3">
              <Button
                variant="outline"
                onClick={() => setCancelConfirmOpen(false)}
                disabled={formProcessing}
              >
                Keep Subscription
              </Button>
              <Button
                variant="danger"
                onClick={handleCancelSubscription}
                disabled={formProcessing}
              >
                {formProcessing ? 'Processing...' : 'Cancel Subscription'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionPage;