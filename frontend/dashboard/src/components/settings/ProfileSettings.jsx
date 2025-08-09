import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../../context/LanguageContext';
import useAuth from '../../hooks/useAuth';

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useTranslation(['settings', 'common']);
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    website: '',
    phone: '',
    industry: ''
  });

  const [editData, setEditData] = useState({
    name: '',
    email: '',
    website: '',
    phone: '',
    industry: ''
  });

  // Simulate fetching data from your actual backend APIs
  useEffect(() => {
    const fetchData = async () => {
      try {
        // This would be: const user = await authService.getCurrentUser();
        const mockUser = {
          name: '',        // From /api/client/me
          email: '',       // From /api/client/me  
          website: '',     // From /api/client/me
          phone: '',       // From /api/client/me
          industry: '',    // From /api/client/me
          language: 'en'   // From user preferences
        };

        setProfileData(mockUser);
        setEditData(mockUser);
        
      } catch (error) {
        console.error('Error fetching profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleEdit = () => {
    setEditData({ ...profileData });
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData({ ...profileData });
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // This would call: await clientService.updateProfile(editData);
      console.log('Would save to backend:', editData);
      
      setProfileData({ ...editData });
      setIsEditing(false);
      alert(t('settings:profile.profileUpdated'));
      
    } catch (error) {
      console.error('Error saving profile:', error);
      alert(t('settings:profile.profileUpdateFailed'));
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e) => {
    setEditData({
      ...editData,
      [e.target.name]: e.target.value
    });
  };

  const handleLanguageChange = async (e) => {
    const newLanguage = e.target.value;
    
    try {
      await changeLanguage(newLanguage);
      // TODO: Save language preference to backend
      // await userService.updateLanguage(newLanguage);
    } catch (error) {
      console.error('Error updating language:', error);
    }
  };

  const handleManageSubscription = () => {
    // Navigate to subscription page or open modal
    console.log('Navigate to subscription management');
    window.location.href = '/subscription';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-6 overflow-hidden">
        <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-10 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex items-center justify-center p-6 overflow-hidden">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 12rem)' }}>
        
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{t('settings:profile.title')}</h1>
              <p className="text-sm text-gray-500">{t('settings:profile.description', 'Manage your account information and preferences')}</p>
            </div>
            
            {!isEditing ? (
              <button
                onClick={handleEdit}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
{t('common:actions.edit')}
              </button>
            ) : (
              <div className="flex space-x-2">
                <button
                  onClick={handleCancel}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
{t('common:actions.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
{saving ? t('common:status.processing') : t('common:actions.save')}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profile.companyName')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="name"
                  value={editData.name}
                  onChange={handleInputChange}
                  placeholder={t('settings:profile.companyNamePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-gray-900 py-2">
                  {profileData.name || t('settings:profile.notProvided')}
                </p>
              )}
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profile.emailAddress')}
              </label>
              {isEditing ? (
                <input
                  type="email"
                  name="email"
                  value={editData.email}
                  onChange={handleInputChange}
                  placeholder={t('settings:profile.emailPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-gray-900 py-2">
                  {profileData.email || t('settings:profile.notProvided')}
                </p>
              )}
            </div>

            {/* Website */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profile.website')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="website"
                  value={editData.website}
                  onChange={handleInputChange}
                  placeholder={t('settings:profile.websitePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-gray-900 py-2">
                  {profileData.website ? (
                    <a href={profileData.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-500">
                      {profileData.website}
                    </a>
                  ) : (
                    t('settings:profile.notProvided')
                  )}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profile.phoneNumber')}
              </label>
              {isEditing ? (
                <input
                  type="text"
                  name="phone"
                  value={editData.phone}
                  onChange={handleInputChange}
                  placeholder={t('settings:profile.phonePlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                />
              ) : (
                <p className="text-gray-900 py-2">
                  {profileData.phone || t('settings:profile.notProvided')}
                </p>
              )}
            </div>

            {/* Industry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('settings:profile.industry')}
              </label>
              {isEditing ? (
                <select
                  name="industry"
                  value={editData.industry}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="">{t('settings:profile.industryPlaceholder')}</option>
                  <option value="saas">{t('settings:profile.industryOptions.saas')}</option>
                  <option value="ecommerce">{t('settings:profile.industryOptions.ecommerce')}</option>
                  <option value="healthcare">{t('settings:profile.industryOptions.healthcare')}</option>
                  <option value="finance">{t('settings:profile.industryOptions.finance')}</option>
                  <option value="education">{t('settings:profile.industryOptions.education')}</option>
                  <option value="consulting">{t('settings:profile.industryOptions.consulting')}</option>
                  <option value="realestate">{t('settings:profile.industryOptions.realestate')}</option>
                  <option value="other">{t('settings:profile.industryOptions.other')}</option>
                </select>
              ) : (
                <p className="text-gray-900 py-2">
                  {profileData.industry ? 
                    profileData.industry.charAt(0).toUpperCase() + profileData.industry.slice(1) : 
                    t('settings:profile.notSelected')
                  }
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Preferences & Actions */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="space-y-4">
            
            {/* Language Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('settings:language.selectLanguage')}
              </label>
              <select
                value={currentLanguage}
                onChange={handleLanguageChange}
                className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
              >
                {languages.map((language) => (
                  <option key={language.code} value={language.code}>
                    {language.flag} {language.nativeName}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleManageSubscription}
                className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {t('settings:profile.manageSubscription')}
              </button>
              
              <button
                onClick={handleLogout}
                className="inline-flex items-center justify-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {t('settings:profile.logOut')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;