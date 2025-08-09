// Path: frontend/dashboard/src/components/auth/RegisterForm.jsx
// Usage: Registration form component with integrated logo for new user signup

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import Logo from '../common/Logo';

const RegisterForm = () => {
  const { t } = useTranslation(['auth', 'common']);
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    industry: '',
    website: '',
    agreeToTerms: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Get pre-selected plan from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const plan = urlParams.get('plan');
    if (plan) {
      setFormData(prev => ({ ...prev, selectedPlan: plan }));
    }
  }, [location]);

  const industryOptions = [
    { value: '', label: t('auth:register.selectIndustry') },
    { value: 'ecommerce', label: t('auth:industries.ecommerce') },
    { value: 'saas', label: t('auth:industries.saas') },
    { value: 'healthcare', label: t('auth:industries.healthcare') },
    { value: 'finance', label: t('auth:industries.finance') },
    { value: 'education', label: t('auth:industries.education') },
    { value: 'consulting', label: t('auth:industries.consulting') },
    { value: 'realestate', label: t('auth:industries.realestate') },
    { value: 'other', label: t('auth:industries.other') }
  ];

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name.trim() || !formData.email.trim() || !formData.password.trim()) {
      setError(t('auth:register.requiredFields'));
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth:errors.passwordsDoNotMatch'));
      return;
    }

    if (formData.password.length < 8) {
      setError(t('auth:register.passwordRequirement'));
      return;
    }

    if (!formData.agreeToTerms) {
      setError(t('auth:register.agreeTerms'));
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      const userData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        industry: formData.industry,
        website: formData.website
      };

      console.log('Attempting registration with:', userData);
      const data = await authService.register(userData);
      console.log('Registration response:', data);
      
      // If registration includes immediate login
      if (data.access_token) {
        localStorage.setItem('token', data.access_token);
        localStorage.setItem('clientId', data.client_id);
        localStorage.setItem('apiKey', data.api_key);
        navigate('/dashboard');
      } else {
        // Redirect to login with success message
        navigate('/login', {
          state: { message: t('auth:register.accountCreatedSuccess') }
        });
      }
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.response?.data?.detail || t('auth:errors.registrationFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          {/* Logo Section */}
          <div className="flex justify-center mb-8">
            <Logo size="large" showText={true} variant="auth" />
          </div>
          
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            {t('auth:register.title')}
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {t('auth:register.or')}{' '}
            <Link
              to="/login"
              className="font-medium text-orange-600 hover:text-orange-500"
            >
              {t('auth:register.signInExisting')}
            </Link>
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                {t('auth:register.fullName')}
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder={t('auth:register.fullNamePlaceholder')}
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                {t('auth:register.emailAddress')}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder={t('auth:register.emailPlaceholder')}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            {/* Industry */}
            <div>
              <label htmlFor="industry" className="block text-sm font-medium text-gray-700">
                {t('auth:register.industryOptional')}
              </label>
              <select
                id="industry"
                name="industry"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                value={formData.industry}
                onChange={handleChange}
              >
                {industryOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Website */}
            <div>
              <label htmlFor="website" className="block text-sm font-medium text-gray-700">
                {t('auth:register.websiteOptional')}
              </label>
              <input
                id="website"
                name="website"
                type="url"
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder={t('auth:register.websitePlaceholder')}
                value={formData.website}
                onChange={handleChange}
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                {t('auth:register.password')}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder={t('auth:register.passwordPlaceholder')}
                value={formData.password}
                onChange={handleChange}
              />
              <p className="mt-1 text-xs text-gray-500">
                {t('auth:register.passwordHint')}
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                {t('auth:register.confirmPassword')}
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-orange-500 focus:border-orange-500 sm:text-sm"
                placeholder={t('auth:register.confirmPasswordPlaceholder')}
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            {/* Terms Agreement */}
            <div className="flex items-center">
              <input
                id="agreeToTerms"
                name="agreeToTerms"
                type="checkbox"
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                checked={formData.agreeToTerms}
                onChange={handleChange}
              />
              <label htmlFor="agreeToTerms" className="ml-2 block text-sm text-gray-900">
                {t('auth:register.agreeToThe')}{' '}
                <Link to="/terms" className="text-orange-600 hover:text-orange-500">
                  {t('auth:register.termsOfService')}
                </Link>{' '}
                {t('auth:register.and')}{' '}
                <Link to="/privacy" className="text-orange-600 hover:text-orange-500">
                  {t('auth:register.privacyPolicy')}
                </Link>
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  {t('auth:register.creatingAccount')}
                </div>
              ) : (
                t('auth:register.createAccount')
              )}
            </button>
          </div>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-gray-50 text-gray-500">{t('auth:register.orRegisterWith')}</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                onClick={() => window.location.href = '/auth/google'}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="ml-2">Google</span>
              </button>

              <button
                type="button"
                className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
                onClick={() => window.location.href = '/auth/github'}
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
                </svg>
                <span className="ml-2">GitHub</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterForm;