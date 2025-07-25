import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';
import contactService from '../../services/contactService';

const NewsletterSection = () => {
  const { t } = useTranslation(['ui']);
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({
    submitted: false,
    loading: false,
    error: null,
    success: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      setStatus({
        ...status,
        error: t('newsletter.invalidEmail')
      });
      return;
    }
    
    setStatus({
      submitted: false,
      loading: true,
      error: null,
      success: false
    });
    
    try {
      await contactService.subscribeNewsletter(email);
      
      setStatus({
        submitted: true,
        loading: false,
        error: null,
        success: true
      });
      
      // Clear the form after successful submission
      setEmail('');
    } catch (error) {
      setStatus({
        submitted: true,
        loading: false,
        error: t('newsletter.error'),
        success: false
      });
    }
  };

  return (
    <div className="bg-primary-700">
      <div className="container mx-auto px-4 py-12 sm:px-6 lg:py-16 lg:px-8">
        <div className="rounded-3xl bg-primary-600 py-10 px-6 sm:py-12 sm:px-12 lg:flex lg:items-center lg:p-16">
          <div className="lg:w-0 lg:flex-1">
            <h2 className="text-3xl font-extrabold tracking-tight text-white">
              {t('newsletter.title')}
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-primary-100">
              {t('newsletter.subtitle')}
            </p>
          </div>
          
          <div className="mt-8 lg:mt-0 lg:ml-8">
            <form className="sm:flex" onSubmit={handleSubmit}>
              <label htmlFor="email-address" className="sr-only">
                {t('newsletter.placeholder')}
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-5 py-3 border-white placeholder-gray-500 focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-700 focus:ring-white focus:border-white sm:max-w-xs rounded-lg"
                placeholder={t('newsletter.placeholder')}
              />
              
              <div className="mt-3 rounded-lg shadow sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                <Button
                  type="submit"
                  disabled={status.loading}
                  className="w-full flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-500 hover:bg-primary-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-primary-700 focus:ring-white"
                >
                  {status.loading ? t('newsletter.subscribing') : t('newsletter.subscribe')}
                </Button>
              </div>
            </form>
            
            {status.success && (
              <p className="mt-3 text-sm text-green-300">
                {t('newsletter.success')}
              </p>
            )}
            
            {status.error && (
              <p className="mt-3 text-sm text-red-300">
                {status.error}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterSection;