// Path: frontend/dashboard/src/pages/auth/VerifyMagicLinkPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

const VerifyMagicLinkPage = () => {
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState(null);
  const { verifyMagicLink } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const toast = useToast();

  // Get the token from the URL
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setError('Invalid magic link. No token provided.');
        setIsVerifying(false);
        return;
      }

      try {
        // Verify the magic link token
        await verifyMagicLink(token);
        
        // Success - show a toast and redirect to dashboard
        toast.success('Successfully verified! Redirecting to dashboard...');
        
        // Add a small delay for the toast to be visible
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      } catch (err) {
        console.error('Token verification error:', err);
        setError('Invalid or expired link. Please request a new magic link.');
        setIsVerifying(false);
      }
    };

    verifyToken();
  }, [token, verifyMagicLink, navigate, toast]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-6">
          {isVerifying ? 'Verifying Magic Link...' : 'Verification Failed'}
        </h2>
        
        {isVerifying ? (
          <div className="flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
            <p className="text-gray-600">Please wait while we verify your magic link...</p>
          </div>
        ) : (
          <div>
            <div className="text-red-600 mb-4">{error}</div>
            <button
              onClick={() => navigate('/login')}
              className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VerifyMagicLinkPage;