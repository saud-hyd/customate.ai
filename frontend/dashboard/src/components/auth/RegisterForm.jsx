import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import OTPVerification from './OTPVerification';

const RegisterForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    industry: 'e-commerce',
    website: '',
    password: ''
  });
  
  const [step, setStep] = useState(1); // 1: Register Form, 2: OTP Verification
  const [otp, setOtp] = useState('');
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear error when field is updated
    if (errors[name]) {
      setErrors({
        ...errors,
        [name]: null
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validate name
    if (!formData.name.trim()) {
      newErrors.name = 'Company name is required';
    }
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }
    
    // Validate website
    if (formData.website.trim()) {
      // Only validate if provided
      const urlRegex = /^(http:\/\/www\.|https:\/\/www\.|http:\/\/|https:\/\/)?[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,5}(:[0-9]{1,5})?(\/.*)?$/;
      if (!urlRegex.test(formData.website)) {
        newErrors.website = 'Invalid URL format';
      }
    }
    
    // Validate password
    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }
    
    return newErrors;
  };

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    
    // Validate form
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Request OTP
      await authService.requestOTP(formData.email);
      setStep(2); // Move to OTP verification step
    } catch (error) {
      console.error('Error requesting OTP:', error);
      setSubmitError(error.response?.data?.detail || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    
    try {
      // Verify OTP first
      await authService.verifyOTP(formData.email, otp);
      
      // Register user with OTP
      const response = await authService.register({
        ...formData,
        otp
      });
      
      console.log('Registration successful:', response);
      
      // Store tokens
      if (response.access_token) {
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('clientId', response.client_id);
        localStorage.setItem('apiKey', response.api_key);
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Verification/Registration error:', error);
      setSubmitError(error.response?.data?.detail || 'Verification failed. Please check your code and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOTP = async (email) => {
    try {
      await authService.requestOTP(email);
      setOtp('');
    } catch (error) {
      console.error('Error resending OTP:', error);
      setSubmitError('Failed to resend verification code. Please try again.');
    }
  };

  const industryOptions = [
    { value: 'e-commerce', label: 'E-commerce' },
    { value: 'saas', label: 'SaaS' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'retail', label: 'Retail' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className="bg-white shadow-lg rounded-lg p-8 max-w-md w-full mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
        {step === 1 ? 'Create Your Account' : 'Verify Your Email'}
      </h2>
      
      {submitError && (
        <div className="mb-4 p-3 bg-red-50 border-l-4 border-red-500 text-red-700">
          <p>{submitError}</p>
        </div>
      )}
      
      {step === 1 ? (
        <form onSubmit={handleRequestOTP} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border ${errors.name ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="Your company name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border ${errors.email ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          
          <div>
            <label htmlFor="industry" className="block text-sm font-medium text-gray-700 mb-1">
              Industry
            </label>
            <select
              id="industry"
              name="industry"
              value={formData.industry}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {industryOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="website" className="block text-sm font-medium text-gray-700 mb-1">
              Website (Optional)
            </label>
            <input
              id="website"
              name="website"
              type="text"
              value={formData.website}
              onChange={handleChange}
              className={`w-full px-4 py-2 border ${errors.website ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="https://example.com"
            />
            {errors.website && <p className="mt-1 text-sm text-red-600">{errors.website}</p>}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-2 border ${errors.password ? 'border-red-500' : 'border-gray-300'} rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500`}
              placeholder="Create a secure password"
            />
            {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
          </div>
          
          <div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200 flex justify-center items-center"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Verification...
                </>
              ) : (
                'Continue to Verification'
              )}
            </button>
          </div>
        </form>
      ) : (
        <OTPVerification
          email={formData.email}
          otp={otp}
          setOtp={setOtp}
          onVerify={handleVerifyOTP}
          resendOTP={resendOTP}
        />
      )}
    </div>
  );
};

export default RegisterForm;