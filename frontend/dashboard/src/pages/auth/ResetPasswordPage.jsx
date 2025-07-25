// Path: frontend/dashboard/src/pages/auth/ResetPasswordPage.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../services/api'; // Add this import for direct API calls
import { useToast } from '../../context/ToastContext';

const ResetPasswordPage = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isResetting, setIsResetting] = useState(false);
  const [isTokenValid, setIsTokenValid] = useState(true);
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();
  const toast = useToast();

  // Validate token is present
  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      toast.error('Invalid password reset link. Please request a new one.');
    }
  }, [token, toast]);

  const handleResetPassword = async (e) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }
    
    setIsResetting(true);
    
    try {
      console.log('Starting password reset with token:', token);
      
      // Check that token exists
      if (!token) {
        throw new Error('Missing reset token');
      }
      
      // Prepare form data
      const formData = new URLSearchParams();
      formData.append('token', token);
      formData.append('new_password', password);
      
      console.log('Making API call to verify reset token and set password');
      
      const response = await api.post('/api/auth/password-reset/verify', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log('Reset password response:', response.data);
      
      // Store tokens for automatic login
      if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('apiKey', response.data.api_key);
        localStorage.setItem('clientId', response.data.client_id || '');
        console.log('Stored authentication data from response');
      }
      
      toast.success('Password reset successful! Redirecting to dashboard...');
      
      // Redirect after a short delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
      
    } catch (error) {
      console.error('Error resetting password:', error);
      
      // Extract error message if available
      const errorMsg = error.response?.data?.detail || 
                       error.message || 
                       'Failed to reset password. The link may be expired or invalid.';
      
      // Show specific error message
      toast.error(errorMsg);
      
      // If it's an authentication or token issue, mark token as invalid
      if (error.response?.status === 401 || error.response?.status === 400 || errorMsg.includes('token')) {
        setIsTokenValid(false);
      }
    } finally {
      setIsResetting(false);
    }
  };

  if (!isTokenValid) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-6">Invalid or Expired Link</h2>
          <p className="mb-6 text-gray-600">
            The password reset link is invalid or has expired. Please request a new password reset link.
          </p>
          <button
            onClick={() => navigate('/forgot-password')}
            className="bg-orange-600 text-white py-2 px-4 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
          >
            Request New Link
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
          <h1 className="text-2xl font-bold text-center">Set New Password</h1>
          <p className="mt-2 text-center text-gray-600">
            Please create a new password for your account.
          </p>
        </div>
        
        <form onSubmit={handleResetPassword} className="space-y-6">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border rounded focus:ring-orange-500 focus:border-orange-500"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-orange-600 text-white py-2 rounded hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            disabled={isResetting}
          >
            {isResetting ? 'Resetting Password...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPasswordPage;