// Path: frontend/dashboard/src/Routes.jsx
// Usage: Fixed routing configuration that allows unauthenticated access to email verification

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import useAuth from './hooks/useAuth';

// Layout components
import DashboardLayout from './components/layout/DashboardLayout';

// Page components
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import VerifyMagicLinkPage from './pages/auth/VerifyMagicLinkPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import EmailVerificationPage from './pages/auth/EmailVerificationPage';  // Import moved up
import DashboardPage from './pages/dashboard/DashboardPage';
import ChatPage from './pages/chat/ChatPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import TestChatbotPage from './pages/TestChatbotPage';
import ConversationsPage from './pages/chat/ConversationsPage';
import IntegrationsPage from './pages/integrations/IntegrationsPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';
import ChannelsPage from './pages/channels/ChannelsPage';
import KnowledgeListPage from './pages/knowledge/KnowledgeListPage';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state when checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

// Guest Route component - only accessible when NOT authenticated
const GuestRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state when checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500"></div>
      </div>
    );
  }
  
  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return children;
};

const AppRoutes = () => {
  return (
    <Routes>
      {/* PUBLIC AUTHENTICATION ROUTES - No authentication required */}
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
      <Route 
        path="/verify-magic-link" 
        element={
          <GuestRoute>
            <VerifyMagicLinkPage />
          </GuestRoute>
        } 
      />
      <Route 
        path="/forgot-password" 
        element={
          <GuestRoute>
            <ForgotPasswordPage />
          </GuestRoute>
        } 
      />
      <Route 
        path="/reset-password" 
        element={
          <GuestRoute>
            <ResetPasswordPage />
          </GuestRoute>
        } 
      />
      
      {/* EMAIL VERIFICATION - CRITICAL: Must be accessible without authentication */}
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      
      {/* OAuth callback - May need to handle both authenticated and unauthenticated states */}
      <Route path="/auth/callback" element={<OAuthCallbackPage />} />
      
      {/* PROTECTED DASHBOARD ROUTES - Authentication required */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="chat" element={<ChatPage />} />
        
        {/* Knowledge management routes */}
        <Route path="knowledge" element={<KnowledgeListPage />} />
        
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="channels" element={<ChannelsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="test" element={<TestChatbotPage />} />
        
        {/* Redirect root to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;