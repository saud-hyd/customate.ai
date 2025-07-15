import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

const EmailVerificationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyEmail } = useAuth();
  const toast = useToast();
  
  const [verificationStatus, setVerificationStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [isAlreadyVerified, setIsAlreadyVerified] = useState(false);
  
  // Prevent multiple verification attempts
  const verificationAttemptedRef = useRef(false);
  const tokenRef = useRef(null);

  useEffect(() => {
    const handleEmailVerification = async () => {
      const token = searchParams.get('token');
      
      // Prevent multiple verification attempts for the same token
      if (verificationAttemptedRef.current && tokenRef.current === token) {
        console.log('Verification already attempted for this token, skipping...');
        return;
      }
      
      if (!token) {
        setVerificationStatus('error');
        setMessage('Invalid verification link. No token provided.');
        toast.error('Invalid verification link - missing token');
        return;
      }

      // Mark as attempted IMMEDIATELY to prevent duplicates
      verificationAttemptedRef.current = true;
      tokenRef.current = token;
      
      // Add small delay to prevent race conditions
      await new Promise(resolve => setTimeout(resolve, 100));

      try {
        console.log('Starting email verification process...');
        const response = await verifyEmail(token);
        
        if (response.already_verified) {
          setIsAlreadyVerified(true);
          setVerificationStatus('success');
          setMessage('Your email is already verified. You can now log in to your account.');
          toast.success('Email already verified');
        } else if (response.verified) {
          setVerificationStatus('success');
          setMessage('Email verification successful! Your account is now active. You can now log in with your credentials.');
          toast.success('Email verified successfully! Please log in.');
          
          // Redirect to login page after successful verification (no auto-login)
          setTimeout(() => {
            navigate('/login', { 
              replace: true,
              state: { 
                message: 'Email successfully verified! Please log in with your credentials.',
                verified: true 
              }
            });
          }, 3000);
        } else {
          // Handle unexpected response format
          setVerificationStatus('error');
          setMessage('Unexpected response from server. Please try again.');
          toast.error('Verification failed');
        }
      } catch (error) {
        console.error('Email verification failed:', error);
        setVerificationStatus('error');
        
        const errorDetail = error.response?.data?.detail || error.message;
        
        if (errorDetail.includes('Invalid or expired')) {
          setMessage('This verification link is invalid or has expired. Please request a new verification email.');
          toast.error('Verification link expired');
        } else if (errorDetail.includes('not found')) {
          setMessage('Account not found. Please register for a new account.');
          toast.error('Account not found');
        } else if (errorDetail.includes('Client not found')) {
          setMessage('Account not found. Please register for a new account.');
          toast.error('Account not found');
        } else {
          setMessage(errorDetail || 'Email verification failed. Please try again.');
          toast.error('Email verification failed');
        }
      }
    };

    handleEmailVerification();
  }, [searchParams]); // Only depend on searchParams

  const handleGoToLogin = () => {
    navigate('/login', {
      state: { 
        message: 'Your email has been verified! Please log in with your credentials.',
        verified: true 
      }
    });
  };

  const handleResendVerification = () => {
    // Redirect to login page with instruction to request new verification
    navigate('/login', {
      state: { 
        message: 'Please log in to request a new verification email.'
      }
    });
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-6">Email Verification</h2>
          
          {verificationStatus === 'verifying' && (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mb-4"></div>
              <p className="text-gray-600">Verifying your email address...</p>
            </div>
          )}
          
          {verificationStatus === 'success' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                </svg>
              </div>
              <p className="text-green-600 font-medium mb-4">{message}</p>
              
              <div className="space-y-3">
                <button
                  onClick={handleGoToLogin}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Go to Login
                </button>
                
                <p className="text-sm text-gray-500">
                  {isAlreadyVerified ? 'Your account was already verified.' : 'Redirecting to login in 3 seconds...'}
                </p>
              </div>
            </div>
          )}
          
          {verificationStatus === 'error' && (
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </div>
              <p className="text-red-600 font-medium mb-4">{message}</p>
              
              <div className="space-y-3">
                <button
                  onClick={handleResendVerification}
                  className="w-full bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Request New Verification Email
                </button>
                
                <Link 
                  to="/register"
                  className="block w-full text-center text-orange-600 py-2 px-4 border border-orange-600 rounded-md hover:bg-orange-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
                >
                  Register New Account
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;