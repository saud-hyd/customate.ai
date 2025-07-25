import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { clientService } from '../../services/clientService';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Components
import { Dialog, Transition } from '@headlessui/react';

// Icons
import {
  UserIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
  GlobeAltIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckBadgeIcon,
  XCircleIcon,
  BellIcon
} from '@heroicons/react/24/outline';

export default function ClientDetailPage() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [client, setClient] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [notificationData, setNotificationData] = useState({
    title: '',
    message: '',
    type: 'admin_announcement'
  });

  useEffect(() => {
    fetchClientDetails();
  }, [clientId]);

  const fetchClientDetails = async () => {
    try {
      setIsLoading(true);
      const data = await clientService.getClientById(clientId);
      setClient(data);
      if (data.subscription) {
        setSelectedPlan(data.subscription.plan_type);
      }
    } catch (error) {
      console.error('Error fetching client details:', error);
      toast.error('Failed to load client details');
      // Redirect back to clients list on error
      navigate('/clients');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      setIsStatusModalOpen(false);
      toast.loading(client.active ? 'Deactivating client...' : 'Activating client...', { id: 'statusChange' });
      
      if (client.active) {
        await clientService.deactivateClient(clientId);
        toast.success('Client deactivated successfully', { id: 'statusChange' });
      } else {
        await clientService.activateClient(clientId);
        toast.success('Client activated successfully', { id: 'statusChange' });
      }
      
      // Refresh client data
      fetchClientDetails();
    } catch (error) {
      console.error('Error changing client status:', error);
      toast.error(`Failed to ${client.active ? 'deactivate' : 'activate'} client`, { id: 'statusChange' });
    }
  };

  const handlePlanChange = async () => {
    try {
      setIsPlanModalOpen(false);
      toast.loading('Updating subscription plan...', { id: 'planChange' });
      
      await clientService.changeClientPlan(clientId, selectedPlan);
      toast.success('Subscription plan updated successfully', { id: 'planChange' });
      
      // Refresh client data
      fetchClientDetails();
    } catch (error) {
      console.error('Error changing subscription plan:', error);
      toast.error('Failed to update subscription plan', { id: 'planChange' });
    }
  };

  const handleSendNotification = async () => {
    try {
      setIsNotificationModalOpen(false);
      
      if (!notificationData.title || !notificationData.message) {
        toast.error('Title and message are required');
        return;
      }
      
      toast.loading('Sending notification...', { id: 'notification' });
      
      await clientService.sendNotification({
        ...notificationData,
        client_id: clientId
      });
      
      toast.success('Notification sent successfully', { id: 'notification' });
      
      // Reset notification form
      setNotificationData({
        title: '',
        message: '',
        type: 'admin_announcement'
      });
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification', { id: 'notification' });
    }
  };

  if (isLoading) {
    return (
      <div className="py-6 px-4 sm:px-6 lg:px-8 flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  // Function to determine badge color based on plan type
  const getPlanBadgeClass = (planType) => {
    switch (planType) {
      case 'free':
        return 'bg-gray-100 text-gray-800';
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'professional':
        return 'bg-purple-100 text-purple-800';
      case 'enterprise':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-semibold text-gray-900">{client.name}</h1>
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={() => setIsNotificationModalOpen(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <BellIcon className="h-5 w-5 mr-2 text-gray-500" />
              Send Notification
            </button>
            <button
              type="button"
              onClick={() => setIsStatusModalOpen(true)}
              className={`inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                client.active
                  ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  : 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
              }`}
            >
              {client.active ? (
                <>
                  <XCircleIcon className="h-5 w-5 mr-2" />
                  Deactivate
                </>
              ) : (
                <>
                  <CheckBadgeIcon className="h-5 w-5 mr-2" />
                  Activate
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Client Details Card */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg col-span-2">
            <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">Client Information</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Details and basic information.</p>
              </div>
              <div>
                {client.active ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    Inactive
                  </span>
                )}
              </div>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <UserIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Client Name
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.name}</dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <EnvelopeIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Email
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.email}</dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <BuildingOffice2Icon className="h-5 w-5 mr-2 text-gray-400" />
                    Industry
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{client.industry}</dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <PhoneIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Phone
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {client.phone || 'Not provided'}
                  </dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <GlobeAltIcon className="h-5 w-5 mr-2 text-gray-400" />
                    Website
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {client.website ? (
                      <a 
                        href={client.website.startsWith('http') ? client.website : `https://${client.website}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:text-indigo-500"
                      >
                        {client.website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500 flex items-center">
                    <KeyIcon className="h-5 w-5 mr-2 text-gray-400" />
                    API Key
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    <code className="bg-gray-100 px-2 py-1 rounded font-mono">{client.api_key}</code>
                  </dd>
                </div>
                
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Created At</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {format(new Date(client.created_at), 'PPpp')}
                  </dd>
                </div>
              </dl>
            </div>
          </div>

          {/* Subscription & Usage Card */}
          <div className="space-y-6">
            {/* Subscription */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900">Subscription</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500">Plan and billing details.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(true)}
                  className="inline-flex items-center p-1.5 border border-transparent rounded-full shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <ArrowPathIcon className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                <dl className="sm:divide-y sm:divide-gray-200">
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Plan</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        client.subscription ? getPlanBadgeClass(client.subscription.plan_type) : 'bg-gray-100 text-gray-800'
                      }`}>
                        {client.subscription 
                          ? client.subscription.plan_type.charAt(0).toUpperCase() + client.subscription.plan_type.slice(1) 
                          : 'Free'}
                      </span>
                    </dd>
                  </div>
                  
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                      {client.subscription 
                        ? client.subscription.status.charAt(0).toUpperCase() + client.subscription.status.slice(1)
                        : 'Free Tier'}
                    </dd>
                  </div>
                  
                  {client.subscription && client.subscription.current_period_start && (
                    <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500">Current Period</dt>
                      <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                        {format(new Date(client.subscription.current_period_start), 'MMM d, yyyy')} - 
                        {client.subscription.current_period_end 
                          ? format(new Date(client.subscription.current_period_end), ' MMM d, yyyy')
                          : ' Ongoing'}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Usage */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Usage Statistics</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Current month consumption.</p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
                {client.usage ? (
                  <dl className="sm:divide-y sm:divide-gray-200">
                    <div className="py-4 sm:py-5 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 mb-2">Messages</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="flex justify-between mb-1">
                          <span>{client.usage.messages_used} / {client.usage.messages_limit}</span>
                          <span className={client.usage.percentage_used > 80 ? 'text-red-600' : 'text-gray-500'}>
                            {client.usage.percentage_used}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className={`h-2.5 rounded-full ${
                              client.usage.percentage_used > 80 ? 'bg-red-600' : 'bg-indigo-600'
                            }`}
                            style={{ width: `${client.usage.percentage_used}%` }}
                          ></div>
                        </div>
                      </dd>
                    </div>
                    
                    <div className="py-4 sm:py-5 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 mb-2">Active Users</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        <div className="flex justify-between mb-1">
                          <span>{client.usage.active_users} / {client.usage.active_users_limit}</span>
                          <span>
                            {((client.usage.active_users / client.usage.active_users_limit) * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2.5">
                          <div 
                            className="bg-indigo-600 h-2.5 rounded-full"
                            style={{ 
                              width: `${Math.min(100, (client.usage.active_users / client.usage.active_users_limit) * 100)}%` 
                            }}
                          ></div>
                        </div>
                      </dd>
                    </div>
                    
                    <div className="py-4 sm:py-5 sm:px-6">
                      <dt className="text-sm font-medium text-gray-500 mb-2">Storage</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {(client.usage.storage_used_bytes / (1024 * 1024)).toFixed(2)} MB / 
                        {(client.usage.storage_limit_bytes / (1024 * 1024)).toFixed(0)} MB
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <div className="px-4 py-5 sm:px-6">
                    <p className="text-sm text-gray-500">No usage data available</p>
                  </div>
                )}
              </div>
            </div>

            {/* Analytics */}
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Analytics</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Last 30 days activity.</p>
              </div>
              <div className="border-t border-gray-200 p-4">
                {client.analytics ? (
                  <dl className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Sessions</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {client.analytics.total_sessions}
                      </dd>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Messages</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {client.analytics.total_messages}
                      </dd>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Searches</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {client.analytics.total_searches}
                      </dd>
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <dt className="text-sm font-medium text-gray-500">Avg Response Time</dt>
                      <dd className="mt-1 text-2xl font-semibold text-gray-900">
                        {client.analytics.average_response_time_ms?.toFixed(0) || 0} ms
                      </dd>
                    </div>
                  </dl>
                ) : (
                  <p className="text-sm text-gray-500">No analytics data available</p>
                )}
              </div>
            </div>
          </div>
        </div>
        
        {/* Payment History */}
        {client.payment_history && client.payment_history.length > 0 && (
          <div className="mt-6">
            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900">Payment History</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">Recent payments and invoices.</p>
              </div>
              <div className="border-t border-gray-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Amount
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {client.payment_history.map((payment) => (
                        <tr key={payment.payment_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(new Date(payment.created), 'MMM d, yyyy')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.description || 'Subscription payment'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {payment.currency.toUpperCase()} {payment.amount.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              payment.status === 'succeeded'
                                ? 'bg-green-100 text-green-800'
                                : payment.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Change Plan Modal */}
      <Transition.Root show={isPlanModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed z-10 inset-0 overflow-y-auto"
          onClose={setIsPlanModalOpen}
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
                    <ArrowPathIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      Change Subscription Plan
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Update the subscription plan for {client.name}. This will affect billing and available features.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Plan
                    </label>
                    <select
                      value={selectedPlan}
                      onChange={(e) => setSelectedPlan(e.target.value)}
                      className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                    >
                      <option value="free">Free</option>
                      <option value="basic">Basic</option>
                      <option value="professional">Professional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsPlanModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handlePlanChange}
                    >
                      Update Plan
                    </button>
                  </div>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Status Change Modal */}
      <Transition.Root show={isStatusModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed z-10 inset-0 overflow-y-auto"
          onClose={setIsStatusModalOpen}
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
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      {client.active ? 'Deactivate Client' : 'Activate Client'}
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        {client.active
                          ? `Are you sure you want to deactivate ${client.name}? This will prevent them from using the platform.`
                          : `Are you sure you want to activate ${client.name}? This will restore their access to the platform.`}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setIsStatusModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`btn ${client.active ? 'btn-danger' : 'btn-primary'}`}
                    onClick={handleStatusChange}
                  >
                    {client.active ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition.Root>

      {/* Notification Modal */}
      <Transition.Root show={isNotificationModalOpen} as={React.Fragment}>
        <Dialog
          as="div"
          className="fixed z-10 inset-0 overflow-y-auto"
          onClose={setIsNotificationModalOpen}
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
                    <BellIcon className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                  </div>
                  <div className="mt-3 text-center sm:mt-5">
                    <Dialog.Title as="h3" className="text-lg leading-6 font-medium text-gray-900">
                      Send Notification to Client
                    </Dialog.Title>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500">
                        Send a notification to {client.name}. This will appear in their dashboard.
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-5 sm:mt-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                        Title
                      </label>
                      <input
                        type="text"
                        name="title"
                        id="title"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Notification Title"
                        value={notificationData.title}
                        onChange={(e) => setNotificationData({ ...notificationData, title: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                        Message
                      </label>
                      <textarea
                        name="message"
                        id="message"
                        rows={4}
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        placeholder="Notification message..."
                        value={notificationData.message}
                        onChange={(e) => setNotificationData({ ...notificationData, message: e.target.value })}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                        Type
                      </label>
                      <select
                        id="type"
                        name="type"
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                        value={notificationData.type}
                        onChange={(e) => setNotificationData({ ...notificationData, type: e.target.value })}
                      >
                        <option value="admin_announcement">Announcement</option>
                        <option value="account_update">Account Update</option>
                        <option value="subscription_updated">Subscription Update</option>
                        <option value="important_alert">Important Alert</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsNotificationModalOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={handleSendNotification}
                    >
                      Send Notification
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