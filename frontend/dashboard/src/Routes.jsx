// frontend/dashboard/src/Routes.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';

// Layout components
import DashboardLayout from './components/layout/DashboardLayout';

// Page components
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import DashboardPage from './pages/dashboard/DashboardPage';
import ChatPage from './pages/chat/ChatPage';
import KnowledgeListPage from './pages/knowledge/KnowledgeListPage';
import KnowledgeDetailPage from './pages/knowledge/KnowledgeDetailPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state when checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return children;
};

// Guest Route component (for routes that should only be accessible to guests, like login)
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state when checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary-600"></div>
      </div>
    );
  }
  
  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* Auth routes */}
      <Route 
        path="/login" 
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        } 
      />
      
      {/* Dashboard routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="knowledge" element={<KnowledgeListPage />} />
        <Route path="knowledge/:id" element={<KnowledgeDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        {/* Redirect root to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      {/* Catch all unmatched routes */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;