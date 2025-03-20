import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { paymentService } from '../../services/paymentService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Chart JS components
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// Icons
import {
  ArrowPathIcon,
  CurrencyDollarIcon,
  UserGroupIcon,
  CheckCircleIcon,
  ExclamationCircleIcon
} from '@heroicons/react/24/outline';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function PaymentsPage() {
  const [paymentData, setPaymentData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('month');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchPaymentData();
  }, [selectedPeriod]);

  const fetchPaymentData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await paymentService.getPaymentOverview(selectedPeriod);
      setPaymentData(data);
    } catch (error) {
      console.error('Error fetching payment data:', error);
      setError('Failed to load payment data. Please try again.');
      toast.error('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchPaymentData();
    toast.success('Payment data refreshed');
  };

  // Generate chart data for revenue
  const getRevenueChartData = () => {
    if (!paymentData || !paymentData.revenue || !paymentData.revenue.time_series) {
      return null;
    }

    const labels = paymentData.revenue.time_series.map(item => {
      // Format the date label based on period
      if (selectedPeriod === 'day') {
        return format(new Date(item.date), 'h aaa');
      } else if (selectedPeriod === 'week' || selectedPeriod === 'month') {
        return format(new Date(item.date), 'MMM d');
      } else {
        return format(new Date(item.date), 'MMM yyyy');
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'Revenue',
          data: paymentData.revenue.time_series.map(item => item.amount),
          backgroundColor: 'rgba(79, 70, 229, 0.8)',
        }
      ]
    };
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Revenue Overview (${selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)})`
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          // Format the y-axis labels as currency
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      }
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="text-center">
          <ExclamationCircleIcon className="mx-auto h-12 w-12 text-red-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Error</h3>
          <p className="mt-1 text-sm text-gray-500">{error}</p>
          <div className="mt-6">
            <button
              onClick={handleRefresh}
              className="btn btn-primary"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">Payments</h1>
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="block pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="day">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
            </select>
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <ArrowPathIcon className="mr-2 h-5 w-5 text-gray-500" />
              Refresh
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {/* Revenue Overview */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3 bg-white shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Revenue Overview</h2>
            {getRevenueChartData() ? (
              <Bar data={getRevenueChartData()} options={chartOptions} height={80} />
            ) : (
              <div className="flex justify-center items-center h-64">
                <p className="text-gray-500">No revenue data available for the selected period.</p>
              </div>
            )}
          </div>
          
          <div className="lg:col-span-1 space-y-6">
            {/* Total Revenue */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Total Revenue</h2>
                  <p className="text-sm text-gray-500">
                    {selectedPeriod === 'day' ? 'Today' : 
                     selectedPeriod === 'week' ? 'This Week' : 
                     selectedPeriod === 'month' ? 'This Month' : 'This Year'}
                  </p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-gray-900">
                  ${paymentData?.revenue?.total_revenue?.toLocaleString() || '0'}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  From {paymentData?.revenue?.transaction_count || 0} transactions
                </p>
              </div>
            </div>
            
            {/* Subscriptions */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <UserGroupIcon className="h-8 w-8 text-indigo-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-lg font-medium text-gray-900">Active Subscriptions</h2>
                  <p className="text-sm text-gray-500">Across all plans</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-3xl font-bold text-gray-900">
                  {paymentData?.subscriptions?.counts?.total || 0}
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  ${paymentData?.subscriptions?.mrr?.toLocaleString() || '0'} Monthly Recurring Revenue
                </p>
              </div>
              <div className="mt-4">
                <Link 
                  to="/payments/history" 
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                >
                  View payment history →
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Subscription Statistics */}
        <div className="mt-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Subscription Plans</h2>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="bg-blue-50 rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <CheckCircleIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-blue-800 truncate">Basic Plan</dt>
                      <dd>
                        <div className="text-lg font-medium text-blue-900">
                          {paymentData?.subscriptions?.counts?.basic || 0} subscribers
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-blue-100 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-blue-900">
                    ${((paymentData?.subscriptions?.counts?.basic || 0) * 29).toLocaleString()} monthly revenue
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-purple-100 rounded-md p-3">
                    <CheckCircleIcon className="h-6 w-6 text-purple-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-purple-800 truncate">Professional Plan</dt>
                      <dd>
                        <div className="text-lg font-medium text-purple-900">
                          {paymentData?.subscriptions?.counts?.professional || 0} subscribers
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-purple-100 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-purple-900">
                    ${((paymentData?.subscriptions?.counts?.professional || 0) * 99).toLocaleString()} monthly revenue
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-indigo-50 rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-indigo-100 rounded-md p-3">
                    <CheckCircleIcon className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-indigo-800 truncate">Enterprise Plan</dt>
                      <dd>
                        <div className="text-lg font-medium text-indigo-900">
                          {paymentData?.subscriptions?.counts?.enterprise || 0} subscribers
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-indigo-100 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-indigo-900">
                    ${((paymentData?.subscriptions?.counts?.enterprise || 0) * 299).toLocaleString()} monthly revenue
                  </span>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 rounded-lg shadow overflow-hidden">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-gray-100 rounded-md p-3">
                    <CheckCircleIcon className="h-6 w-6 text-gray-600" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-800 truncate">Free Plan</dt>
                      <dd>
                        <div className="text-lg font-medium text-gray-900">
                          {paymentData?.subscriptions?.counts?.free || 0} users
                        </div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
              <div className="bg-gray-100 px-5 py-3">
                <div className="text-sm">
                  <span className="font-medium text-gray-900">
                    {(((paymentData?.subscriptions?.counts?.free || 0) / 
                      (paymentData?.subscriptions?.counts?.total || 1)) * 100).toFixed(1)}% of users
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Problem Payments */}
        {paymentData?.problem_payments && paymentData.problem_payments.length > 0 && (
          <div className="mt-8">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Problem Payments</h2>
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
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
                        Reason
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {paymentData.problem_payments.map((payment) => (
                      <tr key={payment.payment_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {payment.client_id ? (
                            <Link 
                              to={`/clients/${payment.client_id}`}
                              className="text-indigo-600 hover:text-indigo-900"
                            >
                              {payment.client_id}
                            </Link>
                          ) : (
                            <span>Unknown client</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.currency} {payment.amount}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            payment.status === 'failed' 
                              ? 'bg-red-100 text-red-800' 
                              : payment.status === 'disputed' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {payment.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {format(new Date(payment.created), 'MMM d, yyyy')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {payment.failure_message || payment.dispute_reason || 'Refund requested'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/payments/history?payment=${payment.payment_id}`}
                            className="text-indigo-600 hover:text-indigo-900"
                          >
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}