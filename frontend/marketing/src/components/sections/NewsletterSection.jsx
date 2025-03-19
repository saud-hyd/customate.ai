import React, { useState } from 'react';
import Button from '../ui/Button';
import contactService from '../../services/contactService';

const NewsletterSection = () => {
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
        error: 'Please enter a valid email address'
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
        error: 'Failed to subscribe. Please try again later.',
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
              Stay up to date with AI chatbot news
            </h2>
            <p className="mt-4 max-w-3xl text-lg text-primary-100">
              Subscribe to our newsletter to get the latest updates, tips, and best practices for AI chatbots.
            </p>
            
            {status.success && (
              <div className="mt-6 rounded-md bg-green-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Thanks for subscribing!</p>
                  </div>
                </div>
              </div>
            )}
            
            {status.error && (
              <div className="mt-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-600" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{status.error}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <div className="mt-8 lg:mt-0 lg:ml-8">
            <form className="sm:flex" onSubmit={handleSubmit}>
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="w-full rounded-md border-white px-5 py-3 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-primary-700"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status.loading || status.success}
              />
              <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3 sm:flex-shrink-0">
                <Button
                  type="submit"
                  variant="secondary"
                  className="w-full bg-white text-primary-600 hover:bg-gray-50"
                  disabled={status.loading || status.success}
                >
                  {status.loading ? 'Subscribing...' : 'Subscribe'}
                </Button>
              </div>
            </form>
            <p className="mt-3 text-sm text-primary-100">
              We care about your data. Read our{' '}
              <a href="/privacy" className="font-medium text-white underline">
                Privacy Policy
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewsletterSection;