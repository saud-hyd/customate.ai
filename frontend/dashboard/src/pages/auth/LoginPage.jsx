// Path: frontend/dashboard/src/pages/auth/LoginPage.jsx
// Usage: Login page with working Google OAuth integration

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import useAuth from '../../hooks/useAuth';
import GoogleOAuthButton from '../../components/auth/GoogleOAuthButton';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithEmailPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  
  // Use ref to track if message has been shown
  const messageShownRef = useRef(false);
  const currentLocationKey = useRef(location.key);

  // Handle success message from location state - ONLY ONCE
  useEffect(() => {
    const hasNewLocation = currentLocationKey.current !== location.key;
    const hasMessage = location.state?.message;
    
    if (hasNewLocation && hasMessage && !messageShownRef.current) {
      toast.success(location.state.message);
      messageShownRef.current = true;
      currentLocationKey.current = location.key;
      
      // Clear the message from history to prevent re-showing
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location, toast, navigate]);

  // Reset message shown flag when location key changes
  useEffect(() => {
    if (currentLocationKey.current !== location.key) {
      messageShownRef.current = false;
      currentLocationKey.current = location.key;
    }
  }, [location.key]);

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required');
      return;
    }
    
    setIsLoading(true);
    
    try {
      console.log('Attempting password login for:', email);
      await loginWithEmailPassword(email, password);
      console.log('Login successful, redirecting to dashboard');
      toast.success('Login successful!');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Login failed';
      
      if (errorMessage.includes('not verified') || errorMessage.includes('verification')) {
        toast.error('Please verify your email address first. Check your inbox for a verification link.');
      } else if (errorMessage.includes('Incorrect email or password')) {
        toast.error('Incorrect email or password. Please try again.');
      } else {
        toast.error(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg border border-gray-100">
              <img 
                src="/assets/customate-logo.svg" 
                alt="Customate.ai Logo" 
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="text-2xl font-bold text-gray-900">
              Customate.ai
            </span>
          </div>
        </div>

        <h2 className="text-3xl font-bold mb-6 text-center">Welcome Back</h2>
        
        {/* Google OAuth Button First */}
        <div className="mb-6">
          <GoogleOAuthButton isRegistration={false} />
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or continue with email</span>
          </div>
        </div>
        
        <form onSubmit={handlePasswordLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter your email"
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
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
              placeholder="Enter your password"
              required
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
            </div>

            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-orange-600 hover:text-orange-500"
              >
                Forgot password?
              </Link>
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-orange-600 text-white py-3 rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 font-medium"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
           <p className="mt-6 text-center text-sm text-gray-600">
                  Don't have an account?{' '}
                  <Link to="/register" className="font-medium text-orange-600 hover:text-orange-500">
                    Create account
                  </Link>
                </p> 
                <p className="mt-4 text-center text-xs text-gray-500">
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

export default LoginPage;