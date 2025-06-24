// frontend/dashboard/src/pages/auth/LoginPage.jsx
import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { useToast } from '../../context/ToastContext';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkSent, setIsMagicLinkSent] = useState(false);
  const { loginWithEmailPassword, loginWithGoogle, sendMagicLink } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();

  // Get any message passed during navigation
  const message = location.state?.message || '';

  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      console.log('Attempting password login for:', email);
      await loginWithEmailPassword(email, password);
      console.log('Login successful, redirecting to dashboard');
      navigate('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      
      // Check for verification required error
      if (error.message && error.message.includes('verification required')) {
        toast.error('Please verify your email address. Check your inbox for a verification link.');
      } else {
        toast.error('Login failed. Please check your credentials.');
      }
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
      console.log('Requesting magic link for:', email);
      await sendMagicLink(email);
      setIsMagicLinkSent(true);
      toast.success('Magic link sent to your email!');
    } catch (error) {
      console.error('Magic link error:', error);
      toast.error('Failed to send magic link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    console.log('Initiating Google login...');
    loginWithGoogle(false); // false indicates this is not for registration
  };

  if (isMagicLinkSent) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
          {/* Logo Section - Consistent with Header/Footer */}
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

          <h2 className="text-2xl font-bold mb-6 text-center">Check Your Email</h2>
          <p className="mb-6 text-center text-gray-600">
            We've sent a magic link to <strong>{email}</strong>. 
            Click the link in the email to sign in.
          </p>
          <div className="text-center">
            <button
              onClick={() => setIsMagicLinkSent(false)}
              className="text-orange-600 hover:text-orange-500 font-medium"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        {/* Logo Section - Consistent with Header/Footer */}
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
        
        {/* Display success message if any */}
        {message && (
          <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
        
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
              className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
              placeholder="your@email.com"
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
              className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        
        <div className="mt-4 text-center">

        </div>
        
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
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-orange-600 hover:text-orange-500">
            Sign up
          </Link>
        </p>
        
        <p className="mt-2 text-center text-sm text-gray-600">
          <Link to="/forgot-password" className="text-orange-600 hover:text-orange-500">
            Forgot your password?
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;