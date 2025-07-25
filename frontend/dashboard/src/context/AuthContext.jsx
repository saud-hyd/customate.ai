// Path: frontend/dashboard/src/context/AuthContext.jsx
// Usage: Core authentication context with proper Google OAuth support and state management

import React, { createContext, useState, useEffect, useRef } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Prevent multiple auth checks and infinite loops
  const authCheckInProgress = useRef(false);
  const retryCount = useRef(0);
  const maxRetries = 3;

  useEffect(() => {
    const checkAuth = async () => {
      if (authCheckInProgress.current) {
        return;
      }

      if (token || apiKey) {
        authCheckInProgress.current = true;
        
        try {
          console.log('Checking authentication status...');
          const userInfo = await authService.getCurrentClient();
          console.log('Authentication verified:', userInfo);
          setUser(userInfo);
          setIsAuthenticated(true);
          retryCount.current = 0; // Reset retry count on success
        } catch (error) {
          console.error('Auth verification failed:', error);
          
          // FIXED: Only clear tokens on actual auth errors (401/403), not on other API failures
          const isAuthError = error.response?.status === 401 || error.response?.status === 403;
          const hasReachedMaxRetries = retryCount.current >= maxRetries;
          
          if (isAuthError && hasReachedMaxRetries) {
            console.log('Authentication failed after retries, clearing tokens');
            clearAuthData();
          } else if (isAuthError) {
            console.log(`Auth check failed, retry ${retryCount.current + 1}/${maxRetries}`);
            retryCount.current++;
            // Retry after a short delay
            setTimeout(() => {
              authCheckInProgress.current = false;
              checkAuth();
            }, 1000);
            return;
          } else {
            // Not an auth error - probably API endpoint issue, don't clear tokens
            console.log('Non-auth API error, keeping user logged in');
            setIsAuthenticated(true);
          }
        } finally {
          authCheckInProgress.current = false;
        }
      } else {
        console.log('No tokens found, user not authenticated');
      }
      setLoading(false);
    };

    checkAuth();
  }, [token, apiKey]);

  const clearAuthData = () => {
    console.log('Clearing authentication data...');
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    localStorage.removeItem('clientId');
    setToken(null);
    setApiKey(null);
    setIsAuthenticated(false);
    setUser(null);
    retryCount.current = 0;
  };

  const handleAuthResponse = (response) => {
    console.log('Processing auth response:', { 
      hasAccessToken: !!response.access_token,
      hasApiKey: !!response.api_key,
      hasClientId: !!response.client_id,
      email: response.email
    });

    if (response.access_token) {
      const newToken = response.access_token;
      const newApiKey = response.api_key;
      const clientId = response.client_id;

      // Store in localStorage
      localStorage.setItem('token', newToken);
      if (newApiKey) localStorage.setItem('apiKey', newApiKey);
      if (clientId) localStorage.setItem('clientId', clientId);

      // Update state
      setToken(newToken);
      setApiKey(newApiKey);
      setIsAuthenticated(true);
      setUser({
        client_id: clientId,
        email: response.email,
        name: response.name,
        api_key: newApiKey
      });

      retryCount.current = 0;
      console.log('Authentication successful, user logged in');
    } else {
      console.warn('Auth response missing access_token');
    }
  };

  // FIXED: Add missing refreshAuthState function
  const refreshAuthState = async () => {
    console.log('Refreshing authentication state...');
    if (authCheckInProgress.current) {
      console.log('Auth check already in progress, skipping refresh');
      return;
    }

    try {
      authCheckInProgress.current = true;
      const userInfo = await authService.getCurrentClient();
      console.log('Auth state refreshed successfully:', userInfo);
      setUser(userInfo);
      setIsAuthenticated(true);
      return userInfo;
    } catch (error) {
      console.error('Failed to refresh auth state:', error);
      throw error;
    } finally {
      authCheckInProgress.current = false;
    }
  };

  // FIXED: Add missing handleOAuthCallback function
  const handleOAuthCallback = async (queryParams) => {
    console.log('Handling OAuth callback...');
    
    const code = queryParams.get('code');
    const state = queryParams.get('state');
    const error = queryParams.get('error');

    if (error) {
      const errorDescription = queryParams.get('error_description') || 'OAuth authentication failed';
      throw new Error(errorDescription);
    }

    if (!code) {
      throw new Error('Missing authorization code');
    }

    try {
      // Call the backend OAuth callback endpoint
      const response = await authService.handleOAuthCallback(code, state);
      
      // Process the auth response
      handleAuthResponse(response);
      
      console.log('OAuth callback processed successfully');
      return response;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  };

  // Email/Password login
  const loginWithEmailPassword = async (email, password) => {
    try {
      console.log('Attempting email/password login for:', email);
      const response = await authService.login(email, password);
      handleAuthResponse(response);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Email/Password registration - NO IMMEDIATE LOGIN
  const registerWithEmailPassword = async (email, password, name, industry, website) => {
    try {
      console.log('Attempting registration for:', email);
      const response = await authService.register({ email, password, name, industry, website });
      console.log('Registration successful, verification email sent');
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      
      // Fix the error object before throwing it back
      if (error.response?.data?.detail && Array.isArray(error.response.data.detail)) {
        const fixedError = new Error(error.response.data.detail[0]?.msg || 'Registration failed');
        fixedError.response = error.response;
        throw fixedError;
      }
      
      throw error;
    }
  };

  // Google OAuth registration/login - NOW ENABLED
  const loginWithGoogle = async (isRegistration = false) => {
    try {
      console.log('Google OAuth is handled by GoogleOAuthButton component');
      // This method is mainly for compatibility - actual OAuth is handled by the button component
      return Promise.resolve();
    } catch (error) {
      console.error('Google OAuth error:', error);
      throw error;
    }
  };

  // Email verification - NO AUTO-LOGIN
  const verifyEmail = async (token) => {
    try {
      console.log('Attempting email verification...');
      const response = await authService.verifyEmail(token);
      console.log('Email verification successful, no auto-login');
      return response;
    } catch (error) {
      console.error('Email verification error:', error);
      throw error;
    }
  };

  // Password reset request
  const requestPasswordReset = async (email) => {
    try {
      console.log('Requesting password reset for:', email);
      const response = await authService.requestPasswordReset(email);
      console.log('Password reset request sent');
      return response;
    } catch (error) {
      console.error('Password reset request error:', error);
      throw error;
    }
  };

  // Reset password
  const resetPassword = async (token, newPassword) => {
    try {
      console.log('Resetting password...');
      const response = await authService.resetPassword(token, newPassword);
      handleAuthResponse(response);
      console.log('Password reset successful');
      return response;
    } catch (error) {
      console.error('Password reset error:', error);
      throw error;
    }
  };

  // Logout
  const logout = () => {
    console.log('Logging out user...');
    authService.logout();
    clearAuthData();
  };

  const value = {
    user,
    token,
    apiKey,
    isAuthenticated,
    loading,
    loginWithEmailPassword,
    registerWithEmailPassword,
    loginWithGoogle,
    verifyEmail,
    requestPasswordReset,
    resetPassword,
    logout,
    refreshAuthState,        // FIXED: Added missing function
    handleOAuthCallback,     // FIXED: Added missing function
    handleAuthResponse       // FIXED: Exposed for Google OAuth
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};