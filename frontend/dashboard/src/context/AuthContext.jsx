// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios'; // Make sure this import is at the top!

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [apiKey, setApiKey] = useState(localStorage.getItem('apiKey'));
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      if (apiKey) {
        try {
          const response = await axios.get('http://localhost:8000/api/client', {
            headers: {
              'X-API-Key': apiKey
            }
          });
          setUser(response.data);
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Auth verification failed:', error);
          localStorage.removeItem('apiKey');
          setApiKey(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [apiKey]);

  const login = async (email, password) => {
    try {
      // Use email as username and password as API key
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      
      const response = await axios.post(
        'http://localhost:8000/api/auth/token', 
        formData.toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );
      
      const { api_key } = response.data;
      
      if (api_key) {
        localStorage.setItem('apiKey', api_key);
        setApiKey(api_key);
        
        // Fetch user info with the API key
        const clientResponse = await axios.get('http://localhost:8000/api/client', {
          headers: {
            'X-API-Key': api_key
          }
        });
        
        setUser(clientResponse.data);
        setIsAuthenticated(true);
        
        return clientResponse.data;
      } else {
        throw new Error('No API key received from server');
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('apiKey');
    setApiKey(null);
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        apiKey,
        isAuthenticated,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};