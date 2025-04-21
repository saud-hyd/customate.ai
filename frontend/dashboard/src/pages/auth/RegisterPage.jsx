// frontend/dashboard/src/pages/auth/RegisterPage.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useToast } from '../../context/ToastContext';
import useAuth from '../../hooks/useAuth';
import authService from '../../services/authService';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '' 
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isVerificationSent, setIsVerificationSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { registerWithEmailPassword } = useAuth();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Unified registration handler
  const handleRegister = async (e) => {
    e.preventDefault();
    
    const { email, password, confirmPassword, name, industry, website } = formData;
    
    // Validate
    if (!email || !password) {
      toast.error('Email and password are required');
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Create form data properly
      const formDataObj = new FormData();
      formDataObj.append('email', email);
      formDataObj.append('password', password);
      formDataObj.append('name', name || email.split('@')[0]); // Use part of email if no name
      formDataObj.append('industry', industry || 'other');
      if (website) formDataObj.append('website', website);
      
      // Send request directly with axios to ensure proper form data handling
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL || 'http://localhost:8000'}/api/auth/register`, 
        formDataObj
      );
      
      // Handle success
      toast.success('Registration successful! You can now log in.');
      
      // Store API key or redirect to login page
      if (response.data.api_key) {
        localStorage.setItem('tempApiKey', response.data.api_key); // Store temporarily
      }
      
      // Navigate to login page
      navigate('/login', { 
        state: { 
          message: 'Account created successfully! Please log in with your email and password.' 
        } 
      });
      
    } catch (error) {
      console.error('Registration error:', error);
      
      // Handle different error types
      if (error.response) {
        // Extract the error message from the response
        const errorDetail = error.response.data?.detail;
        
        if (typeof errorDetail === 'string') {
          toast.error(errorDetail);
        } else if (error.response.status === 422) {
          toast.error('Invalid input data. Please check the form and try again.');
        } else {
          toast.error('Registration failed. Please try again.');
        }
      } else {
        toast.error('Network error. Please check your connection and try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };
  // Google OAuth registration
  const handleGoogleLogin = () => {
    console.log('Initiating Google registration...');
    authService.initiateGoogleAuth(true); // true = registration mode
  };

  // Show email sent screen if verification was sent
  if (isVerificationSent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Check Your Email</h2>
          <p className="mb-6 text-center text-gray-600">
            We've sent a verification link to <strong>{formData.email}</strong>. 
            Click the link in the email to activate your account.
          </p>
          <button
            onClick={() => setIsVerificationSent(false)}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Sign Up
          </button>
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
          <h1 className="text-2xl font-bold text-center">Get started for free</h1>
        </div>
        
        {/* Unified registration form */}
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
              Company Name (Optional)
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Your Company"
            />
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
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="e-commerce">E-commerce</option>
              <option value="saas">SaaS</option>
              <option value="healthcare">Healthcare</option>
              <option value="finance">Finance</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          {/* Single unified registration button */}
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">OR CONTINUE WITH</span>
            </div>
          </div>
          
          <button
            onClick={handleGoogleLogin}
            className="mt-4 w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FcGoogle className="h-5 w-5 mr-2" />
            Google
          </button>
        </div>
        
        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign in
          </Link>
        </p>
        
        <p className="mt-4 text-center text-xs text-gray-500">
          By continuing, you agree to our{' '}
          <a href="/terms" className="text-indigo-600 hover:text-indigo-500">
            Terms of Service
          </a>
          {' '}and{' '}
          <a href="/privacy" className="text-indigo-600 hover:text-indigo-500">
            Privacy Policy
          </a>.
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;