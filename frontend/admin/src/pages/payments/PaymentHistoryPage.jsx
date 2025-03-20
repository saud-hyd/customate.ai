import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import { clientService } from '../../services/clientService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Dialog component for refunds
import { Dialog, Transition } from '@headlessui/react';

// Icons
import {
  ArrowPathIcon,
  MagnifyingGlassIcon,
  ArrowsRightLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  QuestionMarkCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

export default function PaymentHistoryPage() {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const paymentIdFromQuery = queryParams.get('payment');

  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    days: 30,
    status: '',
    paymentId: paymentIdFromQuery || ''
  });
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [refundData, setRefundData] = useState({
    amount: '',
    reason: 'requested_by_customer'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [clientNames, setClientNames] = useState({});

  // Fetch payment history with current filters
  const fetchPaymentHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await paymentService.getPaymentHistory({
        days: filters.days,
        status: filters.status || undefined
      });
      
      let filteredPayments = data;
      
      // Additional filtering for payment ID if specified
      if (filters.paymentId) {
        filteredPayments = data.filter(payment => 
          payment.payment_id.includes(filters.paymentId)
        );
      }
      
      setPayments(filteredPayments);
      
      // Fetch client names for the payments
      await fetchClientNames(filteredPayments);
      
    } catch (error) {
      console.error('Error fetching payment history:', error);
      setError('Failed to load payment history. Please try again.');
      toast.error('Failed to load payment history');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch client names for better display
  const fetchClientNames = async (paymentsList) => {
    const clientIds = paymentsList
      .filter(payment => payment.client_id && !clientNames[payment.client_id])
      .map(payment => payment.client_id);
    
    if (clientIds.length === 0) return;
    
    const uniqueClientIds = [...new Set(clientIds)];
    const newClientNames = { ...clientNames };
    
    for (const clientId of uniqueClientIds) {
      try {
        const clientData = await clientService.getClientById(clientId);
        newClientNames[clientId] = clientData.name;
      } catch (error) {
        console.error(`Error fetching client name for ${clientId}:`, error);
        newClientNames[clientId] = 'Unknown Client';
      }
    }
    
    setClientNames(newClientNames);
  };

  // Initial fetch and when filters change
  useEffect(() => {
    fetchPaymentHistory();
  }, [filters.days, filters.status]);

  // Apply search filter
  const handleSearch = () => {
    fetchPaymentHistory();
  };

  // Handle refund submission
  const handleRefund = async () => {
    if (!selectedPayment) return;
    
    try {
      setIsSubmitting(true);
      
      // Convert amount to cents if provided
      const refundAmount = refundData.amount 
        ? Math.round(parseFloat(refundData.amount) * 100) 
        : undefined;
      
      await paymentService.issueRefund(selectedPayment.payment_id, {
        amount: refundAmount,
        reason: refundData.reason
      });
      
      toast.success('Refund processed successfully');
      setIsRefundModalOpen(false);
      
      // Reset form
      setRefundData({
        amount: '',
        reason: 'requested_by_customer'
      });
      
      // Refresh payment data
      fetchPaymentHistory();
      
    } catch (error) {
      console.error('Error processing refund:', error);
      toast.error('Failed to process refund: ' + (error.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Open refund modal for a payment
  const openRefundModal = (payment) => {
    setSelectedPayment(payment);
    
    // Pre-fill full amount
    setRefundData({
      amount: (payment.amount - (payment.refunded_amount || 0)).toString(),
      reason: 'requested_by_customer'
    });
    
    setIsRefundModalOpen(true);
  };

  // Status badge styling
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'succeeded':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'refunded':
        return 'bg-purple-100 text-purple-800';
      case 'disputed':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Payment History</h1>
          <button
            type="button"
            onClick={() => fetchPaymentHistory()}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ArrowPathIcon className="mr-2 h-5 w-5 text-gray-500" />
            Refresh
          </button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Filters */}
        <div className="bg-white shadow p-6 rounded-lg mb-6">
          <div className="flex flex-col md:flex-row md:items-end space-y-4 md:space-y-0 md:space-x-4">
            {/* Time range filter */}
            <div>
              <label htmlFor="days" className="block text-sm font-medium text-gray-700 mb-1">
                Time Range
              </label>
              <select
                id="days"
                name="days"
                value={filters.days}
                onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value={7}>Last 7 days</option>
                <option value={30}>Last 30 days</option>
                <option value={90}>Last 90 days</option>
                <option value={365}>Last year</option>
              </select>
            </div>
            
            {/* Status filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                id="status"
                name="status"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">All Statuses</option>
                <option value="succeeded">Succeeded</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
                <option value="disputed">Disputed</option>
              </select>
            </div>
            
            {/* Payment ID search */}
            <div className="flex-1">
              <label htmlFor="paymentId" className="block text-sm font-medium text-gray-700 mb-1">
                Payment ID
              </label>
              <div className="relative rounded-md shadow-sm">
                <input
                  type="text"
                  name="paymentId"
                  id="paymentId"
                  value={filters.paymentId}
                  onChange={(e) => setFilters({ ...filters, paymentId: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pr-10 sm:text-sm border-gray-300 rounded-md"
                  placeholder="Search by payment ID"
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                </div>
              </div>
            </div>
            
            <button
              type="button"
              onClick={handleSearch}
              className="py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Apply Filters
            </button>
          </div>
        </div>
        
        {/* Payments table */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mb-4" />
              <p className="text-gray-500">{error}</p>
              <button
                onClick={fetchPaymentHistory}
                className="mt-4 btn btn-primary"
              >
                Retry
              </button>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <p className="text-gray-500">No payments found matching your filters.</p>
              <button
                onClick={() => setFilters({ days: 30, status: '', paymentId: '' })}
                className="mt-4 btn btn-secondary"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Client
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Payment Method
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.payment_id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                        {payment.payment_id.substring(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.client_id ? (
                          <Link 
                            to={`/clients/${payment.client_id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            {clientNames[payment.client_id] || payment.client_id.substring(0, 8) + '...'}
                          </Link>
                        ) : (
                          <span className="text-gray-500">Unknown</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {payment.currency && payment.amount ? (
                          <>
                            {payment.currency.toUpperCase()} {payment.amount.toFixed(2)}
                            {payment.refunded_amount > 0 && (
                              <span className="ml-1 text-xs text-gray-500">
                                ({payment.refunded_amount.toFixed(2)} refunded)
                              </span>
                            )}
                          </>
                        ) : (
                          'N/A'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(payment.status)}`}>
                          {payment.status === 'succeeded' && <CheckCircleIcon className="mr-1 h-4 w-4" />}
                          {payment.status === 'failed' && <XCircleIcon className="mr-1 h-4 w-4" />}
                          {payment.status === 'refunded' && <ArrowsRightLeftIcon className="mr-1 h-4 w-4" />}
                          {payment.status === 'disputed' && <QuestionMarkCircleIcon className="mr-1 h-4 w-4" />}
                          {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(payment.created), 'MMM d, yyyy h:mm a')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.payment_method ? (
                          payment.payment_method.charAt(0).toUpperCase() + payment.payment_method.slice(1)
                        ) : (
                          'Unknown'
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {payment.status === 'succeeded' && (
                          <button
                            onClick={() => openRefundModal(payment)}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            Refund
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Refund Modal */}
      <Transition.Root show={isRefundModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed z-10 inset-0 overflow-y-auto"
          onClose={setIsRefundModalOpen}
        >
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0"
              enterTo="opacity-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
            </Transition.Child>

            <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">
              &#8203;
            </span>
            
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            >
              <div className="inline-block align-bottom bg-white rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
                <div>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100">
                    <ArrowsRightLeftIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      Process Refund
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        You are about to refund payment 
                        <span className="font-mono font-medium ml-1">
                          {selectedPayment?.payment_id}
                        </span>
                      </p>
                      {selectedPayment && (
                        <div className="mt-2 text-sm text-gray-700">
                          <p>Original amount: <span className="font-medium">{selectedPayment.currency.toUpperCase()} {selectedPayment.amount.toFixed(2)}</span></p>
                          {selectedPayment.refunded_amount > 0 && (
                            <p>Already refunded: <span className="font-medium">{selectedPayment.currency.toUpperCase()} {selectedPayment.refunded_amount.toFixed(2)}</span></p>
                          )}
                          <p>Available for refund: <span className="font-medium">{selectedPayment.currency.toUpperCase()} {(selectedPayment.amount - (selectedPayment.refunded_amount || 0)).toFixed(2)}</span></p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                        Refund Amount (leave blank for full amount)
                      </label>
                      <div className="mt-1 relative rounded-md shadow-sm">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">
                            {selectedPayment?.currency.toUpperCase()}
                          </span>
                        </div>
                        <input
                          type="number"
                          name="amount"
                          id="amount"
                          step="0.01"
                          min="0.01"
                          max={selectedPayment ? (selectedPayment.amount - (selectedPayment.refunded_amount || 0)).toFixed(2) : 0}
                          className="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-12 pr-12 sm:text-sm border-gray-300 rounded-md"
                          placeholder="Amount"
                          value={refundData.amount}
                          onChange={(e) => setRefundData({ ...refundData, amount: e.target.value })}
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="reason" className="block text-sm font-medium text-gray-700">
                        Reason for Refund
                      </label>
                      <select
                        id="reason"
                        name="reason"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        value={refundData.reason}
                        onChange={(e) => setRefundData({ ...refundData, reason: e.target.value })}
                      >
                        <option value="requested_by_customer">Requested by customer</option>
                        <option value="duplicate">Duplicate charge</option>
                        <option value="fraudulent">Fraudulent</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                    <button
                      type="button"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:col-start-2 sm:text-sm"
                      onClick={handleRefund}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Processing...' : 'Process Refund'}
                    </button>
                    <button
                      type="button"
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                      onClick={() => setIsRefundModalOpen(false)}
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>
    </div>
  );
}