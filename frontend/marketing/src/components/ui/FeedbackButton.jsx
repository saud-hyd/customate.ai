import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FeedbackButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    feedback: '',
    type: 'general',
    allowContact: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [contactRequested, setContactRequested] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    // Validate that if allowContact is checked, at least email is provided
    if (formData.allowContact && !formData.email.trim()) {
      setError('Please provide your email if you want us to contact you about this feedback.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Using your Formspree endpoint
      const response = await fetch('https://formspree.io/f/manbolqd', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name || 'Anonymous',
          email: formData.email || 'Not provided',
          feedback: formData.feedback,
          type: formData.type,
          allowContact: formData.allowContact,
          page: window.location.href,
          timestamp: new Date().toISOString()
        }),
      });

      if (response.ok) {
        setContactRequested(formData.allowContact && formData.email);
        setIsSubmitted(true);
        setTimeout(() => {
          setIsSubmitted(false);
          setContactRequested(false);
          setIsOpen(false);
          setFormData({
            name: '',
            email: '',
            feedback: '',
            type: 'general',
            allowContact: false
          });
        }, 2000);
      } else {
        throw new Error('Failed to send feedback');
      }

    } catch (error) {
      console.error('Error sending feedback:', error);
      setError('Failed to send feedback. Please try again or email us directly at admin@customate.ai');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fallback to mailto if form service fails
  const handleMailtoFallback = () => {
    const emailBody = `
Type: ${formData.type.charAt(0).toUpperCase() + formData.type.slice(1)}
Name: ${formData.name || 'Anonymous'}
Email: ${formData.email || 'Not provided'}
Contact me about this: ${formData.allowContact ? 'Yes' : 'No'}

Feedback:
${formData.feedback}

Page: ${window.location.href}
    `.trim();

    const mailtoLink = `mailto:admin@customate.ai?subject=Website Feedback - ${formData.type}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoLink;
  };

  const feedbackTypes = [
    { value: 'general', label: 'General Feedback', icon: '💭' },
    { value: 'bug', label: 'Bug Report', icon: '🐛' },
    { value: 'feature', label: 'Feature Request', icon: '💡' },
    { value: 'improvement', label: 'Improvement Suggestion', icon: '⚡' },
    { value: 'complaint', label: 'Complaint', icon: '😔' },
    { value: 'compliment', label: 'Compliment', icon: '🎉' }
  ];

  return (
    <>
      {/* Floating Feedback Button - Positioned to avoid chat widget */}
      <motion.div
        className="fixed bottom-0 right-20 z-40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: "spring", stiffness: 260, damping: 20 }}
      >
        <motion.button
          onClick={() => setIsOpen(true)}
          className="bg-gradient-to-r from-teal-500 to-teal-600 text-white px-3 py-2 rounded-t-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300 flex items-center space-x-1.5 group text-xs"
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
        >
          <motion.svg 
            className="w-3.5 h-3.5" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </motion.svg>
          <span>Feedback</span>
        </motion.button>
      </motion.div>

      {/* Feedback Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl"
              initial={{ scale: 0.9, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 50 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-teal-500 to-teal-600 text-white p-6 rounded-t-2xl">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold">Share Your Feedback</h2>
                    <p className="text-teal-100 mt-1">Help us improve Customate.ai</p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-white hover:text-teal-200 transition-colors p-2"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Modal Content */}
              <div className="p-6">
                {isSubmitted ? (
                  <motion.div
                    className="text-center py-8"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">Thank You!</h3>
                    <p className="text-gray-600">Your feedback has been sent to our team.</p>
                    {contactRequested ? (
                      <p className="text-sm text-gray-500 mt-2">We'll get back to you within 24 hours.</p>
                    ) : (
                      <p className="text-sm text-gray-500 mt-2">Your anonymous feedback helps us improve!</p>
                    )}
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex">
                          <svg className="w-5 h-5 text-red-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <div>
                            <p className="text-sm text-red-800">{error}</p>
                            <button
                              type="button"
                              onClick={handleMailtoFallback}
                              className="text-sm text-red-600 underline hover:text-red-800 mt-1"
                            >
                              Send via email instead
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Feedback Type */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        What type of feedback do you have?
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {feedbackTypes.map(type => (
                          <label
                            key={type.value}
                            className={`cursor-pointer border-2 rounded-lg p-3 text-center transition-all ${
                              formData.type === type.value
                                ? 'border-teal-500 bg-teal-50 text-teal-700'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <input
                              type="radio"
                              name="type"
                              value={type.value}
                              checked={formData.type === type.value}
                              onChange={handleInputChange}
                              className="sr-only"
                            />
                            <div className="text-lg">{type.icon}</div>
                            <div className="text-xs font-medium mt-1">{type.label}</div>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Feedback */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Your Feedback
                      </label>
                      <textarea
                        name="feedback"
                        value={formData.feedback}
                        onChange={handleInputChange}
                        placeholder="Tell us what you think, what could be improved, or report any issues..."
                        rows={4}
                        className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email {formData.allowContact ? (
                          <span className="text-teal-600 font-normal">(required for follow-up)</span>
                        ) : (
                          <span className="text-gray-400 font-normal">(optional)</span>
                        )}
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="your@email.com"
                        className={`w-full border rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                          formData.allowContact 
                            ? 'border-teal-300 bg-teal-50' 
                            : 'border-gray-300'
                        }`}
                      />
                    </div>

                    {/* Contact Permission Checkbox */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          id="allowContact"
                          name="allowContact"
                          checked={formData.allowContact}
                          onChange={handleInputChange}
                          className="mt-1 w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                        />
                        <label htmlFor="allowContact" className="text-sm text-gray-700 cursor-pointer flex-1">
                          <span className="font-medium">You can contact me about this feedback</span>
                          <p className="text-xs text-gray-500 mt-1">
                            {formData.allowContact 
                              ? "We may follow up with you about your feedback (email required)" 
                              : "Your feedback will be anonymous"}
                          </p>
                        </label>
                      </div>
                    </div>



                    {/* Submit Button */}
                    <div className="flex space-x-3">
                      <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-600 hover:to-teal-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isSubmitting ? (
                          <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Sending...
                          </>
                        ) : (
                          'Send Feedback'
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackButton;