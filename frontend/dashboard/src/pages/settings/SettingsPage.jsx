// frontend/dashboard/src/pages/settings/SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import useAuth from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';
import subscriptionService from '../../services/subscriptionService';
import TeamMembersSection from '../../components/settings/TeamMembersSection';
import ProfileSettings from '../../components/settings/ProfileSettings';
import SupportSection from '../../components/settings/SupportSection';
import SubscriptionContent from '../../components/settings/SubscriptionContent';

import {
  UserIcon,
  CreditCardIcon,
  UsersIcon,
  QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

const SettingsPage = () => {
  const { currentUser, updateSettings } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [subscriptionLimits, setSubscriptionLimits] = useState(null);

  useEffect(() => {
    // Load subscription limits
    const fetchSubscriptionLimits = async () => {
      try {
        // Fixed: Use the correct service and method for fetching subscription limits
        const data = await subscriptionService.getCurrentSubscription();
        setSubscriptionLimits(data.limits);
      } catch (err) {
        console.error('Error fetching subscription limits:', err);
      }
    };

    fetchSubscriptionLimits();
  }, []);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings, subscription, team members, and get support.
        </p>
      </div>

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
              onClick={() => setActiveTab('subscription')}
              className={`${
                activeTab === 'subscription'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <CreditCardIcon className="h-5 w-5 mr-2" />
              Subscription
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

          {/* Subscription tab - Use our component directly instead of iframe */}
          {activeTab === 'subscription' && (
            <SubscriptionContent 
              setError={setError} 
              setSuccess={setSuccess}
              subscriptionLimits={subscriptionLimits}
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