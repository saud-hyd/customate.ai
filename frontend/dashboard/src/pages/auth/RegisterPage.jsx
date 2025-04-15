// Path: frontend/dashboard/src/pages/auth/RegisterPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FcGoogle } from 'react-icons/fc';
import { useToast } from '../../context/ToastContext';
import useAuth from '../../hooks/useAuth';
import api from '../../services/api'; // Add direct API import

// Use environment variable with fallback to the production URL
const API_URL = process.env.REACT_APP_API_URL || 'https://customate-ai-1.onrender.com';

const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { registerWithEmailPassword, loginWithGoogle } = useAuth();

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithEmailPassword(email, password);
      navigate('/onboarding');
    } catch (error) {
      toast.error('Registration failed. Please try again.');
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMagicLinkRequest = async (e) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email address');
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('Requesting magic link for registration:', email);
      
      // Create form data
      const formData = new URLSearchParams();
      formData.append('email', email);
      formData.append('is_registration', true);
      
      // Make the API call directly for better error handling
      const response = await api.post('/api/auth/magic-link/request', 
        formData,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      console.log('Magic link response:', response.data);
      
      setIsMagicLinkSent(true);
      toast.success('Magic link sent to your email!');
      
      // Check if this was treated as a login instead of registration
      if (response.data.is_registration === false) {
        toast.info('An account already exists with this email. We sent a login link instead.');
      }
    } catch (error) {
      console.error('Magic link error:', error);
      
      // Extract the error message
      const errorMessage = error.response?.data?.detail || 
                           error.message || 
                           'Failed to send magic link. Please try again.';
      
      // Handle specific error cases
      if (errorMessage.includes('already exists')) {
        toast.error('An account with this email already exists. Try logging in instead.');
      } else if (error.response?.status === 404) {
        toast.error('No account found with this email.');
      } else if (error.response?.status === 429) {
        toast.error('Too many requests. Please try again later.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Initiating Google login...');
    const redirectUri = `${window.location.origin}/auth/callback`;
    // FIXED: Use API_URL instead of hardcoded localhost URL and set is_registration to true
    const authUrl = `${API_URL}/api/auth/google/login?redirect_uri=${encodeURIComponent(redirectUri)}&is_registration=true`;
    console.log('Redirecting to:', authUrl);
    window.location.href = authUrl;
  };

  if (isMagicLinkSent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Check Your Email</h2>
          <p className="mb-6 text-center text-gray-600">
            We've sent a magic link to <strong>{email}</strong>. 
            Click the link in the email to create your account.
          </p>
          <button
            onClick={() => setIsMagicLinkSent(false)}
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
        
        <form onSubmit={handleRegister} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="name@example.com"
              required
            />
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <button
            type="submit"
            onClick={handleMagicLinkRequest}
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? 'Signing up...' : 'Sign up'}
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