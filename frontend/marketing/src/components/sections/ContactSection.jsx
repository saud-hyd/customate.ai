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
    <SectionContainer background="gray-50" id="contact" paddingY="py-20 md:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl md:text-5xl font-bold text-gray-900 mb-6"
          >
            {t('form.title')}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed"
          >
            {t('form.subtitle')}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16">
          {/* Contact Form - Takes 2/3 of the space */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-12 border border-gray-100">
              {formState.submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-12"
                >
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                    <svg
                      className="h-10 w-10 text-green-600"
                      xmlns="http://www.w3.org/2000/svg"
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
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">
                    {t('form.success.title')}
                  </h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    {t('form.success.message')}
                  </p>
                  <Button
                    onClick={() => setFormState((prev) => ({ ...prev, submitted: false }))}
                    variant="outline"
                    size="lg"
                  >
                    {t('form.success.sendAnother')}
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label htmlFor="name" className="block text-sm font-semibold text-gray-700">
                        {t('form.fields.name')} *
                      </label>
                      <input
                        type="text"
                        name="name"
                        id="name"
                        autoComplete="name"
                        required
                        className="w-full py-4 px-5 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 focus:bg-white placeholder-gray-400"
                        placeholder="Enter your full name"
                        value={formState.name}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="email" className="block text-sm font-semibold text-gray-700">
                        {t('form.fields.email')} *
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        className="w-full py-4 px-5 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 focus:bg-white placeholder-gray-400"
                        placeholder="your.email@company.com"
                        value={formState.email}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="company" className="block text-sm font-semibold text-gray-700">
                      {t('form.fields.company')}
                    </label>
                    <input
                      type="text"
                      name="company"
                      id="company"
                      autoComplete="organization"
                      className="w-full py-4 px-5 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 focus:bg-white placeholder-gray-400"
                      placeholder="Your company name (optional)"
                      value={formState.company}
                      onChange={handleChange}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="message" className="block text-sm font-semibold text-gray-700">
                      {t('form.fields.message')} *
                    </label>
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      required
                      className="w-full py-4 px-5 text-lg border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200 bg-gray-50 focus:bg-white placeholder-gray-400 resize-none"
                      placeholder="Tell us about your project, questions, or how we can help you..."
                      value={formState.message}
                      onChange={handleChange}
                    />
                  </div>

                  {formState.error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl bg-red-50 p-4 border border-red-200"
                    >
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <svg
                            className="h-5 w-5 text-red-400"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 20 20"
                            fill="currentColor"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-red-800">
                            {formState.error}
                          </h3>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div className="pt-6">
                    <Button
                      type="submit"
                      size="lg"
                      disabled={formState.loading}
                      className="w-full md:w-auto min-w-[200px] relative text-lg py-5 px-10 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200"
                    >
                      {formState.loading ? (
                        <>
                          <svg
                            className="animate-spin -ml-1 mr-3 h-6 w-6 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          {t('form.sending')}
                        </>
                      ) : (
                        <>
                          {t('form.submit')}
                          <svg
                            className="ml-3 h-5 w-5"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                          </svg>
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </motion.div>

          {/* Support Information - Takes 1/3 of the space */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-1 space-y-8"
          >
            {/* Direct Support Card */}
            <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-3xl shadow-2xl p-8 text-white">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-white/20 backdrop-blur-sm mb-6">
                  <svg
                    className="h-8 w-8 text-white"
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
                <h3 className="text-xl font-bold mb-4">
                  Need Direct Support?
                </h3>
                <p className="text-primary-100 mb-6 leading-relaxed">
                  For immediate assistance or specific technical questions, reach our support team directly.
                </p>
                <a
                  href="mailto:support@customate.ai"
                  className="inline-flex items-center justify-center px-6 py-3 border-2 border-white text-white font-semibold rounded-xl hover:bg-white hover:text-primary-600 transition-all duration-200 shadow-lg"
                >
                  <svg
                    className="mr-2 h-5 w-5"
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
                  support@customate.ai
                </a>
              </div>
            </div>

            {/* Quick Info Cards */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
                    <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900">Quick Response</h4>
                    <p className="text-gray-600">We typically respond within 24 hours</p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h4 className="text-lg font-semibold text-gray-900">Available 24/7</h4>
                    <p className="text-gray-600">Round-the-clock support for urgent issues</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </SectionContainer>
  );
};

export default ContactSection;