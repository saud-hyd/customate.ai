import React, { createContext, useState, useEffect } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (token || apiKey) {
        try {
          const userInfo = await authService.getCurrentClient();
          setUser(userInfo);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('apiKey');
          setToken(null);
          setApiKey(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token, apiKey]);

  // Email/Password login
  const loginWithEmailPassword = async (email, password) => {
    try {
      const response = await authService.login(email, password);
      handleAuthResponse(response);
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  // Magic Link authentication
  const sendMagicLink = async (email, isRegistration = false) => {
    try {
      await authService.requestMagicLink(email, isRegistration);
      // No need to set auth state here as the user will authenticate via the link
      return true;
    } catch (error) {
      console.error('Magic link error:', error);
      throw error;
    }
  };

  // Verify magic link token
  const verifyMagicLink = async (token) => {
    try {
      const response = await authService.verifyMagicLink(token);
      handleAuthResponse(response);
      return response;
    } catch (error) {
      console.error('Magic link verification error:', error);
      throw error;
    }
  };

  // Google authentication
  const loginWithGoogle = async (isRegistration = false) => {
    try {
      // This will redirect to Google's OAuth page
      await authService.initiateGoogleAuth(isRegistration);
      // The response will be handled by a callback route
      return true;
    } catch (error) {
      console.error('Google auth error:', error);
      throw error;
    }
  };

  // Handle OAuth callback
  const handleOAuthCallback = async (params) => {
    try {
      const response = await authService.handleOAuthCallback(params);
      handleAuthResponse(response);
      return response;
    } catch (error) {
      console.error('OAuth callback error:', error);
      throw error;
    }
  };

  // Register with email/password
  const registerWithEmailPassword = async (email, password) => {
    try {
      const response = await authService.register({ email, password });
      handleAuthResponse(response);
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  // Helper to handle auth response
  const handleAuthResponse = (response) => {
    if (response.access_token) {
      localStorage.setItem('token', response.access_token);
      setToken(response.access_token);
    }
    
    if (response.api_key) {
      localStorage.setItem('apiKey', response.api_key);
      setApiKey(response.api_key);
    }
    
    setUser(response);
    setIsAuthenticated(true);
  };

  // Logout
  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
    setToken(null);
    setApiKey(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        apiKey,
        isAuthenticated,
        loading,
        loginWithEmailPassword,
        sendMagicLink,
        verifyMagicLink,
        loginWithGoogle,
        handleOAuthCallback,
        registerWithEmailPassword,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};