import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { useToast } from '../../context/ToastContext';

const OAuthCallbackPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { handleOAuthCallback } = useAuth();
  const toast = useToast();

  useEffect(() => {
    console.log('OAuth callback page loaded with search params:', location.search);
    
    const processCallback = async () => {
      try {
        // Get the query parameters
        const queryParams = new URLSearchParams(location.search);
        
        // Check for error parameter
        if (queryParams.get('error')) {
          const errorDescription = queryParams.get('error_description') || 'Authentication failed';
          console.error('OAuth error from provider:', errorDescription);
          throw new Error(errorDescription);
        }
        
        // Check if code parameter exists
        if (!queryParams.get('code')) {
          console.error('No authorization code found in callback');
          throw new Error('Missing authorization code');
        }
        
        console.log('Processing OAuth callback with code:', queryParams.get('code'));
        
        // Process the callback
        const result = await handleOAuthCallback(queryParams);
        console.log('OAuth callback processed successfully:', result);
        
        // Show success message
        toast.success('Successfully authenticated!');
        
        // Navigate to dashboard or onboarding based on whether this is a new user
        const destination = result.is_new_user ? '/onboarding' : '/dashboard';
        console.log(`Redirecting to ${destination}`);
        navigate(destination);
      } catch (err) {
        console.error('OAuth callback error:', err);
        setError(err.message || 'Authentication failed');
        
        // Redirect to login after a delay
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      } finally {
        setLoading(false);
      }
    };

    processCallback();
  }, [location, handleOAuthCallback, navigate, toast]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Authenticating...</h2>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Please wait while we complete your authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Error</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <p>Redirecting to login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <h2 className="text-2xl font-bold mb-4">Authentication Successful!</h2>
        <p className="text-green-600 mb-4">You are now logged in.</p>
        <p>Redirecting to dashboard...</p>
      </div>
    </div>
  );
};

export default OAuthCallbackPage;