// src/components/sections/ContactSection.jsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SectionContainer from '../ui/SectionContainer';
import Button from '../ui/Button';

const ContactSection = () => {
  const { t } = useTranslation('contact');
  const [formState, setFormState] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
    submitted: false,
    loading: false,
    error: null,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormState((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // In a real implementation, you would send the form data to your API
      // await fetch('/api/contact', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({
      //     name: formState.name,
      //     email: formState.email,
      //     company: formState.company,
      //     message: formState.message,
      //   }),
      // });

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setFormState((prev) => ({
        ...prev,
        submitted: true,
        loading: false,
        name: '',
        email: '',
        company: '',
        message: '',
      }));
    } catch (error) {
      console.error('Error submitting form:', error);
      setFormState((prev) => ({
        ...prev,
        loading: false,
        error: t('form.error'),
      }));
    }
  };

  return (
    <SectionContainer background="light" id="contact" paddingY="py-16 md:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative">
          {/* Background decoration */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-40 -right-40 h-80 w-80 rounded-full bg-primary-100 opacity-50"></div>
            <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-primary-100 opacity-40"></div>
          </div>
          
          <div className="lg:grid lg:grid-cols-2 lg:gap-10 items-start">
            {/* Left column - Contact form */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary-100">
                <div className="bg-gradient-to-r from-primary-600 to-primary-500 py-6 px-8">
                  <h2 className="text-2xl font-bold text-white">
                    {t('form.title')}
                  </h2>
                  <p className="mt-2 text-primary-100">
                    {t('form.subtitle')}
                  </p>
                </div>

                <div className="p-8">
                  {formState.submitted ? (
                    <div className="bg-green-50 p-6 rounded-xl border border-green-200">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 bg-green-100 rounded-full p-2">
                          <svg
                            className="h-6 w-6 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-green-800">
                            {t('form.success.title')}
                          </h3>
                          <p className="mt-2 text-green-700">
                            {t('form.success.message')}
                          </p>
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              onClick={() => setFormState((prev) => ({ ...prev, submitted: false }))}
                            >
                              {t('form.success.sendAnother')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-y-5">
                      {formState.error && (
                        <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                          <div className="flex">
                            <div className="flex-shrink-0">
                              <svg
                                className="h-5 w-5 text-red-400"
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                aria-hidden="true"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </div>
                            <div className="ml-3">
                              <p className="text-sm text-red-700">{formState.error}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                          {t('form.fields.name')}
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            name="name"
                            id="name"
                            autoComplete="name"
                            required
                            className="py-3 px-4 block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 border-2 border-gray-400 bg-white text-gray-900 rounded-lg"
                            value={formState.name}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          {t('form.fields.email')}
                        </label>
                        <div className="mt-1">
                          <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            className="py-3 px-4 block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 border-2 border-gray-400 bg-white text-gray-900 rounded-lg"
                            value={formState.email}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                          {t('form.fields.company')}
                        </label>
                        <div className="mt-1">
                          <input
                            type="text"
                            name="company"
                            id="company"
                            autoComplete="organization"
                            className="py-3 px-4 block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 border-2 border-gray-400 bg-white text-gray-900 rounded-lg"
                            value={formState.company}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <label htmlFor="message" className="block text-sm font-medium text-gray-700">
                          {t('form.fields.message')}
                        </label>
                        <div className="mt-1">
                          <textarea
                            id="message"
                            name="message"
                            rows={4}
                            required
                            className="py-3 px-4 block w-full shadow-sm focus:ring-primary-500 focus:border-primary-500 border-2 border-gray-400 bg-white text-gray-900 rounded-lg"
                            value={formState.message}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div>
                        <Button
                          type="submit"
                          variant="primary"
                          size="lg"
                          disabled={formState.loading}
                          className="w-full shadow-md hover:shadow-lg transition-shadow duration-300"
                        >
                          {formState.loading ? (
                            <span className="flex items-center justify-center">
                              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              {t('form.sending')}
                            </span>
                          ) : (
                            t('form.submit')
                          )}
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Right column - Contact info */}
            <motion.div
              className="mt-12 lg:mt-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="space-y-6">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-primary-100">
                  <div className="bg-gradient-to-r from-primary-600 to-primary-500 py-6 px-8">
                    <h3 className="text-2xl font-bold text-white">{t('info.title')}</h3>
                  </div>
                  <div className="p-8">
                    <div className="space-y-6">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                          <svg
                            className="h-6 w-6 text-primary-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-medium text-gray-900">{t('info.email.title')}</h4>
                          <p className="mt-2 text-gray-600">
                            <a
                              href={`mailto:${t('info.email.value')}`}
                              className="text-primary-600 hover:text-primary-500 hover:underline transition-colors duration-200"
                            >
                              {t('info.email.value')}
                            </a>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                          <svg
                            className="h-6 w-6 text-primary-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-medium text-gray-900">{t('info.phone.title')}</h4>
                          <p className="mt-2 text-gray-600">
                            <a
                              href={`tel:${t('info.phone.value')}`}
                              className="text-primary-600 hover:text-primary-500 hover:underline transition-colors duration-200"
                            >
                              {t('info.phone.value')}
                            </a>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start">
                        <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                          <svg
                            className="h-6 w-6 text-primary-600"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                          </svg>
                        </div>
                        <div className="ml-4">
                          <h4 className="text-lg font-medium text-gray-900">{t('info.office.title')}</h4>
                          <p className="mt-2 text-gray-600 whitespace-pre-line">
                            {t('info.office.address')}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200">
                      <h4 className="text-lg font-medium text-gray-900">{t('info.followUs')}</h4>
                      <div className="mt-4 flex space-x-5">
                        <a href="#" className="bg-gray-100 text-gray-500 hover:text-primary-600 hover:bg-primary-50 p-3 rounded-full transition-colors duration-200">
                          <span className="sr-only">{t('info.social.twitter')}</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                          </svg>
                        </a>
                        <a href="#" className="bg-gray-100 text-gray-500 hover:text-primary-600 hover:bg-primary-50 p-3 rounded-full transition-colors duration-200">
                          <span className="sr-only">{t('info.social.linkedin')}</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                          </svg>
                        </a>
                        <a href="#" className="bg-gray-100 text-gray-500 hover:text-primary-600 hover:bg-primary-50 p-3 rounded-full transition-colors duration-200">
                          <span className="sr-only">{t('info.social.github')}</span>
                          <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                            <path
                              fillRule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Quick Support Card */}
                <div className="bg-gradient-to-br from-primary-50 to-white rounded-2xl shadow-lg p-6 border border-primary-100">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 bg-primary-100 rounded-lg p-3">
                      <svg className="h-6 w-6 text-primary-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h4 className="text-lg font-medium text-gray-900">{t('quickSupport.title')}</h4>
                      <p className="mt-2 text-gray-600">
                        {t('quickSupport.message')} <a href="/faq" className="text-primary-600 hover:text-primary-500 font-medium hover:underline">{t('quickSupport.faq')}</a> {t('quickSupport.or')} <a href={`mailto:${t('quickSupport.supportEmail')}`} className="text-primary-600 hover:text-primary-500 font-medium hover:underline">{t('quickSupport.supportEmail')}</a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </SectionContainer>
  );
};

export default ContactSection;