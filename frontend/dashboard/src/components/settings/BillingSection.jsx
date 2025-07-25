import React, { useState } from 'react';
import { XMarkIcon, ArrowRightIcon } from '@heroicons/react/24/outline';
import subscriptionService from '../../services/subscriptionService';
import { formatDate } from '../../utils/formatters';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import PaymentMethodForm from '../subscription/PaymentMethodForm';

const BillingSection = ({ billingData, loading, setError, setSuccess, refreshData }) => {
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formProcessing, setFormProcessing] = useState(false);

  const handleViewBilling = async () => {
    try {
      const portalResponse = await subscriptionService.getBillingPortal(window.location.origin + '/settings');
      
      if (portalResponse && portalResponse.portal_url) {
        window.location.href = portalResponse.portal_url;
      }
    } catch (err) {
      console.error('Error accessing billing portal:', err);
      setError('Failed to access billing portal. Please try again later.');
    }
  };

  const handlePaymentMethodSubmit = async (paymentMethodId) => {
    try {
      setFormProcessing(true);
      
      // Add payment method
      await subscriptionService.addPaymentMethod(paymentMethodId);
      
      // Refresh data
      await refreshData();
      
      // Close payment form
      setShowPaymentForm(false);
      
      // Show success message
      setSuccess('Payment method added successfully.');
    } catch (err) {
      console.error('Error adding payment method:', err);
      setError(`Failed to add payment method: ${err.message || 'An error occurred'}`);
    } finally {
      setFormProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const { paymentMethods = [], invoices = [], subscription = {} } = billingData || {};
  const planType = subscription?.plan_type || 'free';
  const isFreePlan = planType === 'free';

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900">Billing & Payment</h3>
        <p className="mt-1 text-sm text-gray-500">
          Manage your payment methods, view invoices, and update your subscription plan.
        </p>
      </div>

      {/* Subscription Summary */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <div className="flex flex-col md:flex-row justify-between">
          <div>
            <h4 className="text-base font-medium text-gray-900">Current Subscription</h4>
            <p className="mt-1 text-sm text-gray-600">
              You are on the <span className="font-medium">{planType.charAt(0).toUpperCase() + planType.slice(1)}</span> plan
              {subscription.status && ` (${subscription.status})`}
            </p>
            {subscription.expires_at && (
              <p className="mt-1 text-sm text-gray-500">
                Current period ends on {formatDate(subscription.expires_at)}
              </p>
            )}
          </div>
          <div className="mt-4 md:mt-0">
            <Button
              onClick={() => window.location.href = '/subscription'}
              variant="primary"
            >
              Manage Subscription
            </Button>
          </div>
        </div>
        
        {!isFreePlan && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <Button
              onClick={handleViewBilling}
              variant="outline"
              size="sm"
            >
              Access Billing Portal
            </Button>
          </div>
        )}
      </div>

      {/* Payment Methods */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <h4 className="text-base font-medium text-gray-900">Payment Methods</h4>
          <Button 
            onClick={() => setShowPaymentForm(true)}
            variant="outline"
            size="sm"
          >
            Add Payment Method
          </Button>
        </div>
        
        <div className="p-6">
          {paymentMethods.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
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
                  <div className="flex space-x-2 items-center">
                    {method.is_default && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Default
                      </span>
                    )}
                    {!isFreePlan && (
                      <Button
                        variant="danger-outline"
                        size="sm"
                        onClick={handleViewBilling}
                      >
                        Manage
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h4 className="text-base font-medium text-gray-900">Billing History</h4>
        </div>
        
        <div className="p-6">
          {invoices.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No billing history found.</p>
              <p className="text-sm mt-1">Your invoices will appear here once you subscribe to a paid plan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Description
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="relative px-4 py-3">
                      <span className="sr-only">Action</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {invoice.description || `Invoice #${invoice.number}`}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 font-medium">
                        ${(invoice.amount_due / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
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
                      <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                                              <a
                                                href={invoice.pdf_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-primary-600 hover:text-primary-900 inline-flex items-center"
                                              >
                                                View
                                                <ArrowRightIcon className="ml-1 h-4 w-4" />
                                              </a>
                                            </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 z-10 overflow-y-auto bg-gray-600 bg-opacity-75 flex items-center justify-center">
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
    </div>
  );
};

export default BillingSection;