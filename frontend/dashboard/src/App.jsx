import React, { useState, useEffect } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext'; // ✅ Import ToastProvider
import AppRoutes from './Routes';
import UsageAlertNotification from './components/notifications/UsageAlertNotification';
import './styles/global.css';

function App() {
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    // Initialize any global services or configurations here
    setInitialized(true);
  }, []);
  
  // Show a loading state while initializing
  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-600"></div>
      </div>
    );
  }
  
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider> {/* ✅ Wrap the app with ToastProvider */}
          <div className="app">
            <AppRoutes />
            <UsageAlertNotification />
          </div>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;