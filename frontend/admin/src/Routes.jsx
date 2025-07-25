import React from 'react';
import { Route, Routes as RouterRoutes, Navigate } from 'react-router-dom';
import DashboardLayout from './components/layout/DashboardLayout';

// Dashboard
import DashboardPage from './pages/dashboard/DashboardPage';

// Clients
import ClientsPage from './pages/clients/ClientsPage';
import ClientDetailPage from './pages/clients/ClientDetailPage';

// Payments
import PaymentsPage from './pages/payments/PaymentsPage';
import PaymentHistoryPage from './pages/payments/PaymentHistoryPage';

// System
import SystemStatsPage from './pages/system/SystemStatsPage';

export const Routes = () => {
  return (
    <RouterRoutes>
      <Route path="/" element={<DashboardLayout />}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        
        {/* Client Routes */}
        <Route path="clients">
          <Route index element={<ClientsPage />} />
          <Route path=":clientId" element={<ClientDetailPage />} />
        </Route>
        
        {/* Payment Routes */}
        <Route path="payments">
          <Route index element={<PaymentsPage />} />
          <Route path="history" element={<PaymentHistoryPage />} />
        </Route>
        
        {/* System Routes */}
        <Route path="system">
          <Route index element={<SystemStatsPage />} />
        </Route>
        
        {/* Catch all - redirect to dashboard */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </RouterRoutes>
  );
};