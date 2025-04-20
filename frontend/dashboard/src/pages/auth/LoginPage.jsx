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
          <h2 className="text-2xl font-bold mb-6 text-center">Check Your Email</h2>
          <p className="mb-6 text-center text-gray-600">
            We've sent a magic link to <strong>{email}</strong>. 
            Click the link in the email to sign in.
          </p>
          <button
            onClick={() => setIsMagicLinkSent(false)}
            className="w-full py-2 px-4 bg-gray-200 text-gray-800 rounded hover:bg-gray-300"
          >
            Back to Sign In
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
          <h1 className="text-2xl font-bold text-center">Welcome Back</h1>
        </div>
        
        {message && (
          <div className="mb-4 p-3 bg-blue-50 border-l-4 border-blue-500 text-blue-700">
            <p>{message}</p>
          </div>
        )}
        
        <form onSubmit={handlePasswordLogin} className="space-y-6">
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
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-indigo-500 focus:border-indigo-500"
              required
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 rounded hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            disabled={isLoading}
          >
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          
          <div className="text-center">
            <button
              type="button"
              onClick={handleMagicLinkRequest}
              className="text-indigo-600 hover:text-indigo-500 text-sm font-medium"
              disabled={isLoading}
            >
              Sign in with magic link instead
            </button>
          </div>
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
          Don't have an account?{' '}
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;