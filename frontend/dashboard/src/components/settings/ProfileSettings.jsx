import React, { useState } from 'react';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const ProfileSettings = ({ setError, setSuccess, currentUser, updateSettings }) => {
  const [loading, setLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(currentUser?.avatar || null);
  
  // Profile form validation schema
  const profileSchema = Yup.object().shape({
    name: Yup.string().required('Company name is required'),
    email: Yup.string().email('Invalid email address').required('Email is required'),
    website: Yup.string().url('Invalid URL format').nullable(),
    phone: Yup.string().nullable(),
    industry: Yup.string().required('Industry is required')
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

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result);
      };
      reader.readAsDataURL(file);
      // In a real implementation, you would upload this file to your server
    }
  };

  return (
    <form onSubmit={profileForm.handleSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:space-x-6">
        {/* Profile Avatar */}
        <div className="mb-6 sm:mb-0">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-300">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-bold text-gray-400">
                    {profileForm.values.name.charAt(0)}
                  </span>
                )}
              </div>
              <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-1 cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <input 
                  id="avatar-upload" 
                  type="file" 
                  accept="image/*" 
                  className="sr-only" 
                  onChange={handleAvatarChange}
                />
              </label>
            </div>
            <p className="mt-2 text-xs text-gray-500">Click to upload a company logo</p>
          </div>
        </div>

        {/* Profile Form Fields */}
        <div className="flex-1 w-full">
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
                  className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    profileForm.touched.name && profileForm.errors.name
                      ? 'border-red-500'
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
                  className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    profileForm.touched.email && profileForm.errors.email
                      ? 'border-red-500'
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
                  className={`shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md ${
                    profileForm.touched.website && profileForm.errors.website
                      ? 'border-red-500'
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
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
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
                  className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                >
                  <option value="">Select an industry</option>
                  <option value="ecommerce">E-commerce</option>
                  <option value="saas">SaaS</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="education">Education</option>
                  <option value="finance">Finance</option>
                  <option value="other">Other</option>
                </select>
                {profileForm.touched.industry && profileForm.errors.industry && (
                  <p className="mt-1 text-sm text-red-600">{profileForm.errors.industry}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timezone Selection */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-medium text-gray-900">Preferences</h3>
        <div className="mt-4 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
          <div className="sm:col-span-3">
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700">
              Timezone
            </label>
            <div className="mt-1">
              <select
                id="timezone"
                name="timezone"
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                defaultValue="UTC"
              >
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Australia/Sydney">Sydney</option>
              </select>
            </div>
          </div>

          <div className="sm:col-span-3">
            <label htmlFor="language" className="block text-sm font-medium text-gray-700">
              Language
            </label>
            <div className="mt-1">
              <select
                id="language"
                name="language"
                className="shadow-sm focus:ring-primary-500 focus:border-primary-500 block w-full sm:text-sm border-gray-300 rounded-md"
                defaultValue="en"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="zh">中文</option>
                <option value="ja">日本語</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default ProfileSettings;