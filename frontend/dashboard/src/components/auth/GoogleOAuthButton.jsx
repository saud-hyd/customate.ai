import React, { useEffect, useRef, useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import authService from '../../services/authService';
import { useToast } from '../../context/ToastContext';
import { useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';

const GoogleOAuthButton = ({ isRegistration = false }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);
  const buttonRef = useRef(null);
  const toast = useToast();
  const navigate = useNavigate();
  const { handleAuthResponse, refreshAuthState } = useAuth();

  useEffect(() => {
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Google Client ID exists:', !!process.env.REACT_APP_GOOGLE_CLIENT_ID);
    console.log('Google Client ID length:', process.env.REACT_APP_GOOGLE_CLIENT_ID?.length || 0);

    // Proceed with Google setup if we have the client ID
    const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
    if (googleClientId && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID' && googleClientId.length > 10) {
      loadGoogleScript();
    } else {
      console.warn('Google Client ID not configured properly');
    }
  }, []);

  const loadGoogleScript = () => {
    if (window.google && window.google.accounts) {
      initializeGoogle();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initializeGoogle;
    script.onerror = () => {
      console.error('Failed to load Google OAuth script');
      toast.error('Failed to load Google Sign-In');
    };
    document.head.appendChild(script);
  };

  const initializeGoogle = () => {
    if (!window.google || !window.google.accounts) {
      console.error('Google accounts not available');
      return;
    }

    try {
      const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
      console.log('Initializing Google OAuth with client ID:', clientId?.substring(0, 15) + '...');
      
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCallback,
        auto_select: false,
        cancel_on_tap_outside: true
      });

      setGoogleLoaded(true);

      if (buttonRef.current) {
        window.google.accounts.id.renderButton(buttonRef.current, {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          text: isRegistration ? 'signup_with' : 'signin_with',
          width: buttonRef.current.offsetWidth || 320,
          logo_alignment: 'left'
        });
      }
    } catch (error) {
      console.error('Error initializing Google OAuth:', error);
      toast.error('Failed to initialize Google Sign-In');
    }
  };

  const handleGoogleCallback = async (response) => {
    if (isLoading) return;

    setIsLoading(true);
    
    try {
      console.log('Google OAuth callback received');
      const idToken = response.credential;
      
      if (!idToken) {
        throw new Error('No credential received from Google');
      }

      toast.info('Signing in with Google...');
      
      // Call the Google auth service
      const result = await authService.googleAuth(idToken, 'other', '', isRegistration);
      
      console.log('Google authentication successful:', result);
      
      // FIXED: Update authentication state before navigation
      if (handleAuthResponse) {
        handleAuthResponse(result);
      }
      
      // FIXED: Wait for auth state to be updated
      if (refreshAuthState) {
        await refreshAuthState();
      }
      
      // Show success message
      if (result.is_new_user) {
        toast.success('Account created successfully! Welcome to Customate.ai!');
      } else {
        toast.success('Successfully signed in with Google!');
      }
      
      // FIXED: Add delay to ensure auth state is properly set before navigation
      setTimeout(() => {
        console.log('Navigating to dashboard after successful Google auth');
        navigate('/dashboard');
      }, 1500); // Increased delay to ensure state is set
      
    } catch (error) {
      console.error('Google OAuth error:', error);
      const errorMessage = error.response?.data?.detail || error.message || 'Google authentication failed';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualGoogleAuth = () => {
    if (!googleLoaded || !window.google || !window.google.accounts) {
      toast.error('Google Sign-In not available. Please refresh the page and try again.');
      return;
    }

    try {
      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
          console.log('Google One Tap not displayed, user needs to click button');
        }
      });
    } catch (error) {
      console.error('Error triggering Google prompt:', error);
      toast.error('Failed to start Google Sign-In');
    }
  };

  const googleClientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;

  return (
    <div className="w-full">

      {/* Conditional rendering based on client ID */}
      {!googleClientId || googleClientId === 'YOUR_GOOGLE_CLIENT_ID' || googleClientId.length < 10 ? (
        <div className="w-full p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="text-center">
            <p className="text-sm font-medium text-yellow-800 mb-2">
              🔧 Google OAuth Configuration Required
            </p>
            <div className="text-xs text-yellow-700 space-y-1">
              <p>Add REACT_APP_GOOGLE_CLIENT_ID to .env.development</p>
              <p>Restart dev server after adding the variable</p>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Google's official button container */}
          <div ref={buttonRef} className="w-full mb-2"></div>
          
          {/* Fallback button */}
          {!googleLoaded && (
            <button
              type="button"
              onClick={handleManualGoogleAuth}
              disabled={isLoading}
              className="w-full flex justify-center items-center py-3 px-4 border border-gray-300 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50"
            >
              <FcGoogle className="h-5 w-5 mr-2" />
              {isLoading ? 'Signing in...' : (isRegistration ? 'Sign up with Google' : 'Sign in with Google')}
            </button>
          )}
          
          {/* Loading state */}
          {isLoading && (
            <div className="text-center mt-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
                <p className="text-sm text-gray-600">Authenticating with Google...</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default GoogleOAuthButton;