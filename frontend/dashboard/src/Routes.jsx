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
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import SettingsPage from './pages/settings/SettingsPage';
import TestChatbotPage from './pages/TestChatbotPage';
import ConversationsPage from './pages/chat/ConversationsPage';
import IntegrationsPage from './pages/integrations/IntegrationsPage';
import SubscriptionPage from './pages/subscription/SubscriptionPage';
import OAuthCallbackPage from './pages/auth/OAuthCallbackPage';


// Enhanced Knowledge pages
import EnhancedKnowledgeListPage from './pages/knowledge/EnhancedKnowledgeListPage';
import EnhancedDocumentListPage from './pages/knowledge/EnhancedDocumentListPage';
import KnowledgeDetailPage from './pages/knowledge/KnowledgeDetailPage';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  // Show loading state when checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
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
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-600"></div>
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
        <Route path="/auth/callback" element={<OAuthCallbackPage />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="conversations" element={<ConversationsPage />} />
        <Route path="chat" element={<ChatPage />} />
        
        {/* Enhanced Knowledge Routes */}
        <Route path="knowledge" element={<EnhancedKnowledgeListPage />} />
        <Route path="knowledge/documents" element={<EnhancedDocumentListPage />} />
        <Route path="knowledge/:id" element={<KnowledgeDetailPage />} />
        
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="subscription" element={<SubscriptionPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="test" element={<TestChatbotPage />} />
        
        {/* Redirect root to dashboard */}
        <Route index element={<Navigate to="/dashboard" replace />} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default AppRoutes;