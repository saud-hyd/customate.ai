import React, { useState, useEffect, Suspense } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { LanguageProvider } from './context/LanguageContext';
import AppRoutes from './Routes';
import UsageAlertNotification from './components/notifications/UsageAlertNotification';
import './i18n';
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
      <LanguageProvider>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={
              <div className="flex items-center justify-center h-screen">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-orange-600"></div>
              </div>
            }>
              <div className="app">
                <AppRoutes />
                <UsageAlertNotification />
              </div>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;