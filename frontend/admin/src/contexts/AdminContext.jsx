import React, { createContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const AdminContext = createContext(null);

export const AdminProvider = ({ children }) => {
  const [adminUser, setAdminUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if there's a stored admin session
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const storedUser = localStorage.getItem('adminUser');
        const storedToken = localStorage.getItem('adminToken');
        
        if (storedUser && storedToken) {
          // Validate the token by making a request to the API
          const user = await authService.validateToken();
          setAdminUser(user);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth validation failed:', error);
        // Clear invalid auth data
        localStorage.removeItem('adminUser');
        localStorage.removeItem('adminToken');
        setAdminUser(null);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (username, apiKey) => {
    try {
      const user = await authService.login(username, apiKey);
      setAdminUser(user);
      setIsAuthenticated(true);
      
      // Store auth data in localStorage
      localStorage.setItem('adminUser', JSON.stringify(user));
      localStorage.setItem('adminToken', apiKey);
      
      return user;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('adminToken');
    setAdminUser(null);
    setIsAuthenticated(false);
  };

  const value = {
    adminUser,
    isAuthenticated,
    isLoading,
    login,
    logout
  };

  return (
    <AdminContext.Provider value={value}>
      {children}
    </AdminContext.Provider>
  );
};