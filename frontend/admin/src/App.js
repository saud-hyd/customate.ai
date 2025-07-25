import React from 'react';
import { Routes } from './Routes';
import { useAdmin } from './hooks/useAdmin';
import LoginPage from './pages/auth/LoginPage';

function App() {
  const { isAuthenticated, isLoading } = useAdmin();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <Routes />;
}

export default App;