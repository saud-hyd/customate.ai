// Path: frontend/dashboard/src/pages/auth/ForgotPasswordPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import authService from '../../services/authService';
import { useToast } from '../../context/ToastContext';

const ForgotPasswordPage = () => {
  const { t } = useTranslation(['auth', 'common']);
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestSent, setIsRequestSent] = useState(false);
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      toast.error(t('auth:errors.emailRequired'));
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Use authService instead of direct API call
      await authService.requestPasswordReset(email);
      setIsRequestSent(true);
      toast.success(t('auth:forgotPassword.checkEmail'));
    } catch (error) {
      console.error('Error requesting password reset:', error);
      // Don't reveal if the email exists or not for security
      // Still show success message to prevent enumeration attacks
      setIsRequestSent(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isRequestSent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">{t('auth:errors.checkEmail')}</h2>
          <p className="mb-6 text-center text-gray-600">
            If an account exists for <strong>{email}</strong>, we've sent a password reset link.
            Please check your email and follow the instructions to reset your password.
          </p>
          <div className="flex justify-center">
            <Link
              to="/login"
              className="inline-block bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              {t('auth:forgotPassword.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="mb-6">
          <img
            src="/logo.svg"
            alt="Customate.ai"
            className="h-8 mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold text-center">{t('auth:forgotPassword.title')}</h1>
          <p className="mt-2 text-center text-gray-600">
            {t('auth:forgotPassword.subtitle')}
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('auth:forgotPassword.email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Sending...' : t('auth:forgotPassword.sendInstructions')}
          </button>
        </form>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
            {t('auth:forgotPassword.backToLogin')}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;