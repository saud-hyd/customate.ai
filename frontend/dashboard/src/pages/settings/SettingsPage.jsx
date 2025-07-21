import React, { useState, useEffect } from 'react';
import useAuth from '../../hooks/useAuth';
import subscriptionService from '../../services/subscriptionService';
import TeamMembersSection from '../../components/settings/TeamMembersSection';
import ProfileSettings from '../../components/settings/ProfileSettings';
import SupportSection from '../../components/settings/SupportSection';
import BillingSection from '../../components/settings/BillingSection';

import {
  UserIcon,
  CreditCardIcon,
  UsersIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

const SettingsPage = () => {
  const { currentUser, updateSettings } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [billingData, setBillingData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Only fetch billing data when billing tab is active
    if (activeTab === 'billing') {
      fetchBillingData();
    }
  }, [activeTab]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      
      // Fetch payment methods
      const paymentMethods = await subscriptionService.getPaymentMethods();
      
      // Fetch recent invoices
      const invoices = await subscriptionService.getInvoices();
      
      // Fetch subscription info
      const subscription = await subscriptionService.getCurrentSubscription();
      
      setBillingData({
        paymentMethods,
        invoices,
        subscription
      });
      
    } catch (err) {
      console.error('Error fetching billing data:', err);
      setError('Failed to load billing information. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">

      {/* Settings tabs */}
      <div className="bg-white shadow-sm rounded-lg">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-4 sm:px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('profile')}
              className={`${
                activeTab === 'profile'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <UserIcon className="h-5 w-5 mr-2" />
              Profile
            </button>
            <button
              onClick={() => setActiveTab('billing')}
              className={`${
                activeTab === 'billing'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Billing
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`${
                activeTab === 'team'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <UsersIcon className="h-5 w-5 mr-2" />
              Team Members
            </button>
            <button
              onClick={() => setActiveTab('support')}
              className={`${
                activeTab === 'support'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <QuestionMarkCircleIcon className="h-5 w-5 mr-2" />
              Support
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {/* Feedback messages */}
          {error && (
            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {success && (
            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
              <div className="flex">
                <div className="ml-3">
                  <p className="text-sm text-green-700">{success}</p>
                </div>
              </div>
            </div>
          )}

          {/* Profile tab */}
          {activeTab === 'profile' && (
            <ProfileSettings 
              setError={setError} 
              setSuccess={setSuccess} 
              currentUser={currentUser}
              updateSettings={updateSettings}
            />
          )}

          {/* Billing tab - New section */}
          {activeTab === 'billing' && (
            <BillingSection 
              billingData={billingData}
              loading={loading}
              setError={setError} 
              setSuccess={setSuccess}
              refreshData={fetchBillingData}
            />
          )}

          {/* Team Members tab */}
          {activeTab === 'team' && (
            <TeamMembersSection 
              setError={setError} 
              setSuccess={setSuccess}
            />
          )}

          {/* Support tab */}
          {activeTab === 'support' && (
            <SupportSection />
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;