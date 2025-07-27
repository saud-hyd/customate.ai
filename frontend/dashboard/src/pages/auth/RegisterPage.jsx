// Path: frontend/dashboard/src/pages/auth/RegisterPage.jsx
// Usage: Register page with working Google OAuth integration

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import useAuth from '../../hooks/useAuth';
import GoogleOAuthButton from '../../components/auth/GoogleOAuthButton';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [showVerificationScreen, setShowVerificationScreen] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const toast = useToast();
  const { registerWithEmailPassword } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validatePassword = (password) => {
    if (password.length < 8) return 'Password must be at least 8 characters long';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
    if (!/[\W_]/.test(password)) return 'Password must contain at least one special character';
    return null;
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.email.trim() || !formData.password.trim()) {
      toast.error('Email and password are required');
      return;
    }

    // Email format validation
    const emailRegex = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    // Password validation
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      return;
    }

    // Confirm password validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Attempting registration for:', formData.email);
      
      // Register with minimal data - just email and password
      await registerWithEmailPassword(
        formData.email, 
        formData.password, 
        formData.email.split('@')[0], // Use email prefix as name
        'other', // Default industry
        '' // No website
      );
      
      // Show verification screen
      setRegisteredEmail(formData.email);
      setShowVerificationScreen(true);
      toast.success('Registration successful! Please check your email for verification.');
      
    } catch (error) {
      console.error('Registration error:', error);
      const errorMessage = Array.isArray(error.response?.data?.detail) 
        ? error.response.data.detail[0]?.msg || 'Registration failed'
        : error.response?.data?.detail || error.message || 'Registration failed';
      
      if (errorMessage.includes('already exists')) {
        toast.error('An account with this email already exists. Please log in instead.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Show verification screen after successful registration
  if (showVerificationScreen) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
          <p className="text-gray-600 mb-6">
            We've sent a verification link to <strong>{registeredEmail}</strong>. 
            Please click the link in your email to activate your account.
          </p>
          <Link 
            to="/login"
            className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 inline-block"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
              <img 
                src="/assets/customate-logo.svg" 
                alt="Customate.ai Logo" 
                className="w-8 h-8 object-contain"
              />
            </div>
            <span className="text-xl font-bold text-gray-900">
              Customate.ai
            </span>
          </div>
        </div>

        <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>
        
        {/* Google OAuth Button First */}
        <div className="mb-4">
          <GoogleOAuthButton isRegistration={true} />
        </div>

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or register with email</span>
          </div>
        </div>
        
        <form onSubmit={handleRegister} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter your email"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password *
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              required
              minLength={8}
            />
            <p className="text-xs text-gray-500 mt-1">
              Must be 8+ characters with uppercase, lowercase, and special character
            </p>
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password *
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>
          
<button
            type="submit"
            className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-orange-600 hover:text-orange-500">
            Sign in
          </Link>
        </p>
        
        <p className="mt-3 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <Link to="https://www.customate.ai/terms" className="text-orange-600 hover:text-orange-500 underline">
            Terms of Service
          </Link>
          {' '}and{' '}
          <Link to="https://www.customate.ai/privacy" className="text-orange-600 hover:text-orange-500 underline">
            Privacy Policy
          </Link>
          .
        </p>
        

      </div>
    </div>
  );
};

export default RegisterPage;