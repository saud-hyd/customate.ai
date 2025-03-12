import React, { useState, useEffect } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import useAuth from '../../hooks/useAuth';
import analyticsService from '../../services/analyticsService';

import {
  UserIcon,
  BuildingLibraryIcon,
  SwatchIcon,
  ChatBubbleLeftEllipsisIcon,
  DocumentTextIcon
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
        const data = await analyticsService.checkSubscriptionLimits();
        setSubscriptionLimits(data);
      } catch (err) {
        console.error('Error fetching subscription limits:', err);
      }
    };

    fetchSubscriptionLimits();
  }, []);

  // Profile form validation schema
  const profileSchema = Yup.object().shape({
    name: Yup.string().required('Company name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    website: Yup.string().url('Invalid URL format').nullable(),
    phone: Yup.string().nullable(),
  });

  // Chatbot settings validation schema
  const chatbotSchema = Yup.object().shape({
    primary_color: Yup.string().required('Primary color is required'),
    chatbot_name: Yup.string().required('Chatbot name is required'),
    greeting_message: Yup.string().required('Greeting message is required'),
    enable_suggestions: Yup.boolean(),
    enable_typing_indicator: Yup.boolean(),
    widget_position: Yup.string().required('Widget position is required'),
  });

  // Profile form
  const profileForm = useFormik({
    initialValues: {
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      website: currentUser?.website || '',
      phone: currentUser?.phone || '',
      industry: currentUser?.industry || '',
    },
    validationSchema: profileSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        await updateSettings(values);
        setSuccess('Profile updated successfully');
      } catch (err) {
        console.error('Error updating profile:', err);
        setError(err.response?.data?.detail || 'Failed to update profile');
      } finally {
        setLoading(false);
      }
    },
  });

  // Chatbot settings form
  const chatbotForm = useFormik({
    initialValues: {
      primary_color: currentUser?.settings?.primary_color || '#4f46e5',
      chatbot_name: currentUser?.settings?.chatbot_name || 'AI Assistant',
      greeting_message: currentUser?.settings?.greeting_message || 'Hello! How can I help you today?',
      enable_suggestions: currentUser?.settings?.enable_suggestions !== undefined ? currentUser.settings.enable_suggestions : true,
      enable_typing_indicator: currentUser?.settings?.enable_typing_indicator !== undefined ? currentUser.settings.enable_typing_indicator : true,
      widget_position: currentUser?.settings?.widget_position || 'bottom-right',
    },
    validationSchema: chatbotSchema,
    enableReinitialize: true,
    onSubmit: async (values) => {
      try {
        setLoading(true);
        setError(null);
        setSuccess(null);
        
        await updateSettings({ settings: values });
        setSuccess('Chatbot settings updated successfully');
      } catch (err) {
        console.error('Error updating chatbot settings:', err);
        setError(err.response?.data?.detail || 'Failed to update chatbot settings');
      } finally {
        setLoading(false);
      }
    },
  });

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="bg-white shadow-sm p-4 sm:p-6 sm:rounded-lg">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account and chatbot settings.
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
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Profile
            </button>
            <button
              onClick={() => setActiveTab('chatbot')}
              className={`${
                activeTab === 'chatbot'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Chatbot
            </button>
            <button
              onClick={() => setActiveTab('subscription')}
              className={`${
                activeTab === 'subscription'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Subscription
            </button>
            <button
              onClick={() => setActiveTab('api')}
              className={`${
                activeTab === 'api'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              API Keys
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
            <form onSubmit={profileForm.handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg">
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                  <div className="sm:col-span-3">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Company Name
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="name"
                        name="name"
                        value={profileForm.values.name}
                        onChange={profileForm.handleChange}
                        onBlur={profileForm.handleBlur}
                        className={`input w-full ${
                          profileForm.touched.name && profileForm.errors.name
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : ''
                        }`}
                      />
                      {profileForm.touched.name && profileForm.errors.name && (
                        <p className="mt-1 text-sm text-red-600">{profileForm.errors.name}</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <div className="mt-1">
                      <input
                        type="email"
                        id="email"
                        name="email"
                        value={profileForm.values.email}
                        onChange={profileForm.handleChange}
                        onBlur={profileForm.handleBlur}
                        className={`input w-full ${
                          profileForm.touched.email && profileForm.errors.email
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : ''
                        }`}
                      />
                      {profileForm.touched.email && profileForm.errors.email && (
                        <p className="mt-1 text-sm text-red-600">{profileForm.errors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                      Website
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="website"
                        name="website"
                        value={profileForm.values.website}
                        onChange={profileForm.handleChange}
                        onBlur={profileForm.handleBlur}
                        className={`input w-full ${
                          profileForm.touched.website && profileForm.errors.website
                            ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                            : ''
                        }`}
                      />
                      {profileForm.touched.website && profileForm.errors.website && (
                        <p className="mt-1 text-sm text-red-600">{profileForm.errors.website}</p>
                      )}
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                      Phone
                    </label>
                    <div className="mt-1">
                      <input
                        type="text"
                        id="phone"
                        name="phone"
                        value={profileForm.values.phone}
                        onChange={profileForm.handleChange}
                        onBlur={profileForm.handleBlur}
                        className="input w-full"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-3">
                    <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                      Industry
                    </label>
                    <div className="mt-1">
                      <select
                        id="industry"
                        name="industry"
                        value={profileForm.values.industry}
                        onChange={profileForm.handleChange}
                        onBlur={profileForm.handleBlur}
                        className="input w-full"
                      >
                        <option value="ecommerce">E-commerce</option>
                        <option value="saas">SaaS</option>
                        <option value="technology">Technology</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="education">Education</option>
                        <option value="finance">Finance</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Chatbot settings tab */}
          {activeTab === 'chatbot' && (
            <form onSubmit={chatbotForm.handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-3">
                  <label htmlFor="chatbot_name" className="block text-sm font-medium text-gray-700">
                    Chatbot Name
                  </label>
                  <div className="mt-1">
                    <input
                      type="text"
                      id="chatbot_name"
                      name="chatbot_name"
                      value={chatbotForm.values.chatbot_name}
                      onChange={chatbotForm.handleChange}
                      onBlur={chatbotForm.handleBlur}
                      className={`input w-full ${
                        chatbotForm.touched.chatbot_name && chatbotForm.errors.chatbot_name
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : ''
                      }`}
                    />
                    {chatbotForm.touched.chatbot_name && chatbotForm.errors.chatbot_name && (
                      <p className="mt-1 text-sm text-red-600">{chatbotForm.errors.chatbot_name}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="primary_color" className="block text-sm font-medium text-gray-700">
                    Primary Color
                  </label>
                  <div className="mt-1 flex items-center">
                    <input
                      type="color"
                      id="primary_color_picker"
                      value={chatbotForm.values.primary_color}
                      onChange={(e) => chatbotForm.setFieldValue('primary_color', e.target.value)}
                      className="h-10 w-10 rounded-md border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      id="primary_color"
                      name="primary_color"
                      value={chatbotForm.values.primary_color}
                      onChange={chatbotForm.handleChange}
                      onBlur={chatbotForm.handleBlur}
                      className="ml-2 input w-full"
                    />
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <label htmlFor="greeting_message" className="block text-sm font-medium text-gray-700">
                    Greeting Message
                  </label>
                  <div className="mt-1">
                    <textarea
                      id="greeting_message"
                      name="greeting_message"
                      rows="3"
                      value={chatbotForm.values.greeting_message}
                      onChange={chatbotForm.handleChange}
                      onBlur={chatbotForm.handleBlur}
                      className={`input w-full ${
                        chatbotForm.touched.greeting_message && chatbotForm.errors.greeting_message
                          ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                          : ''
                      }`}
                    ></textarea>
                    {chatbotForm.touched.greeting_message && chatbotForm.errors.greeting_message && (
                      <p className="mt-1 text-sm text-red-600">{chatbotForm.errors.greeting_message}</p>
                    )}
                  </div>
                </div>

                <div className="sm:col-span-3">
                  <label htmlFor="widget_position" className="block text-sm font-medium text-gray-700">
                    Widget Position
                  </label>
                  <div className="mt-1">
                    <select
                      id="widget_position"
                      name="widget_position"
                      value={chatbotForm.values.widget_position}
                      onChange={chatbotForm.handleChange}
                      onBlur={chatbotForm.handleBlur}
                      className="input w-full"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                    </select>
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-center">
                    <input
                      id="enable_suggestions"
                      name="enable_suggestions"
                      type="checkbox"
                      checked={chatbotForm.values.enable_suggestions}
                      onChange={chatbotForm.handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enable_suggestions" className="ml-2 block text-sm text-gray-900">
                      Enable suggestions
                    </label>
                  </div>
                </div>

                <div className="sm:col-span-6">
                  <div className="flex items-center">
                    <input
                      id="enable_typing_indicator"
                      name="enable_typing_indicator"
                      type="checkbox"
                      checked={chatbotForm.values.enable_typing_indicator}
                      onChange={chatbotForm.handleChange}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="enable_typing_indicator" className="ml-2 block text-sm text-gray-900">
                      Enable typing indicator
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn-primary"
                >
                  {loading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}

          {/* Subscription tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Current Subscription</h3>
                
                {subscriptionLimits && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Messages usage */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700">Messages</h4>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                          {subscriptionLimits.limits.messages.used} / {subscriptionLimits.limits.messages.limit}
                        </div>
                        <div className="mt-1">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Usage</span>
                            <span className={subscriptionLimits.limits.messages.exceeded ? 'text-red-600' : 'text-green-600'}>
                              {subscriptionLimits.limits.messages.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div 
                              className={`h-2.5 rounded-full ${
                                subscriptionLimits.limits.messages.exceeded ? 'bg-red-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(subscriptionLimits.limits.messages.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Users usage */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700">Active Users</h4>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                          {subscriptionLimits.limits.users.active} / {subscriptionLimits.limits.users.limit}
                        </div>
                        <div className="mt-1">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Usage</span>
                            <span className={subscriptionLimits.limits.users.exceeded ? 'text-red-600' : 'text-green-600'}>
                              {subscriptionLimits.limits.users.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div 
                              className={`h-2.5 rounded-full ${
                                subscriptionLimits.limits.users.exceeded ? 'bg-red-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(subscriptionLimits.limits.users.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Storage usage */}
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <h4 className="text-sm font-medium text-gray-700">Storage</h4>
                        <div className="mt-1 text-2xl font-semibold text-gray-900">
                          {Math.round(subscriptionLimits.limits.storage.used_bytes / (1024 * 1024))} MB / {Math.round(subscriptionLimits.limits.storage.limit_bytes / (1024 * 1024))} MB
                        </div>
                        <div className="mt-1">
                          <div className="flex items-center justify-between text-sm text-gray-600">
                            <span>Usage</span>
                            <span className={subscriptionLimits.limits.storage.exceeded ? 'text-red-600' : 'text-green-600'}>
                              {subscriptionLimits.limits.storage.percentage}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                            <div 
                              className={`h-2.5 rounded-full ${
                                subscriptionLimits.limits.storage.exceeded ? 'bg-red-600' : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(subscriptionLimits.limits.storage.percentage, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Overall status */}
                    <div className={`p-4 rounded-lg ${
                      subscriptionLimits.within_limits ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <div className="flex items-center">
                        <div className={`flex-shrink-0 h-5 w-5 rounded-full ${
                          subscriptionLimits.within_limits ? 'bg-green-400' : 'bg-red-400'
                        }`}></div>
                        <div className="ml-3">
                          <h3 className={`text-sm font-medium ${
                            subscriptionLimits.within_limits ? 'text-green-800' : 'text-red-800'
                          }`}>
                            {subscriptionLimits.within_limits 
                              ? 'Your subscription is active and within limits' 
                              : 'Your subscription has exceeded one or more limits'}
                          </h3>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Upgrade button */}
                <div className="mt-6">
                  <button
                    type="button"
                    className="btn btn-primary w-full sm:w-auto"
                  >
                    Upgrade Subscription
                  </button>
                </div>
              </div>
              
              {/* Available plans */}
              <div className="bg-white rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Available Plans</h3>
                
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {/* Basic plan */}
                  <div className="border rounded-lg p-6 flex flex-col">
                    <h3 className="text-lg font-medium text-gray-900">Basic</h3>
                    <p className="mt-4 text-3xl font-extrabold text-gray-900">$29<span className="text-base font-medium">/mo</span></p>
                    <p className="mt-4 text-sm text-gray-500">Perfect for small businesses getting started with chatbots.</p>
                    
                    <ul className="mt-6 space-y-4 flex-1">
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">1,000 messages/month</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">100 MB storage</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Basic customization</span>
                      </li>
                    </ul>
                    
                    <button
                      type="button"
                      className="mt-8 btn btn-outline w-full"
                    >
                      Get Started
                    </button>
                  </div>
                  
                  {/* Professional plan */}
                  <div className="border border-primary-600 rounded-lg p-6 flex flex-col relative">
                    <div className="absolute top-0 right-0 bg-primary-600 text-white px-3 py-1 text-sm font-bold rounded-bl-lg rounded-tr-lg">
                      POPULAR
                    </div>
                    <h3 className="text-lg font-medium text-gray-900">Professional</h3>
                    <p className="mt-4 text-3xl font-extrabold text-gray-900">$79<span className="text-base font-medium">/mo</span></p>
                    <p className="mt-4 text-sm text-gray-500">For growing businesses with advanced needs.</p>
                    
                    <ul className="mt-6 space-y-4 flex-1">
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">5,000 messages/month</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">500 MB storage</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Advanced customization</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Analytics dashboard</span>
                      </li>
                    </ul>
                    
                    <button
                      type="button"
                      className="mt-8 btn btn-primary w-full"
                    >
                      Upgrade
                    </button>
                  </div>
                  
                  {/* Enterprise plan */}
                  <div className="border rounded-lg p-6 flex flex-col">
                    <h3 className="text-lg font-medium text-gray-900">Enterprise</h3>
                    <p className="mt-4 text-3xl font-extrabold text-gray-900">Custom</p>
                    <p className="mt-4 text-sm text-gray-500">For organizations with specific requirements.</p>
                    
                    <ul className="mt-6 space-y-4 flex-1">
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Unlimited messages</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Unlimited storage</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Custom integrations</span>
                      </li>
                      <li className="flex space-x-3">
                        <svg className="h-5 w-5 text-green-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-500">Dedicated support</span>
                      </li>
                    </ul>
                    
                    <button
                      type="button"
                      className="mt-8 btn btn-outline w-full"
                    >
                      Contact Sales
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* API Keys tab */}
          {activeTab === 'api' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4">API Keys</h3>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-500">
                    Use these API keys to authenticate your API requests and interact with the Customate.ai API.
                  </p>
                </div>
                
                <div className="space-y-4">
                  {/* Production API Key */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Live API Key</h4>
                        <p className="text-sm text-gray-500">Used in production environments</p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex">
                      <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50 flex-1 font-mono text-xs text-gray-700">
                        <span className="flex-1 truncate">
                          {currentUser?.api_key || 'sk-457a5f4d6d0049d59c47469819b19703'}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ml-2 btn btn-outline btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText(currentUser?.api_key || 'sk-457a5f4d6d0049d59c47469819b19703');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                  
                  {/* Test API Key */}
                  <div className="border rounded-lg p-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Test API Key</h4>
                        <p className="text-sm text-gray-500">Used in development environments</p>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          type="button"
                          className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                        >
                          Regenerate
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 flex">
                      <div className="flex items-center border rounded-md px-3 py-2 bg-gray-50 flex-1 font-mono text-xs text-gray-700">
                        <span className="flex-1 truncate">
                          sk-test-123456789abcdef123456789abcdef
                        </span>
                      </div>
                      <button
                        type="button"
                        className="ml-2 btn btn-outline btn-sm"
                        onClick={() => {
                          navigator.clipboard.writeText('sk-test-123456789abcdef123456789abcdef');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* API documentation */}
                <div className="mt-6 bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900">API Documentation</h4>
                  <p className="mt-1 text-sm text-gray-500">
                    Learn how to integrate Customate.ai into your applications using our API.
                  </p>
                  <div className="mt-4">
                    <a
                      href="#"
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      View Documentation →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;