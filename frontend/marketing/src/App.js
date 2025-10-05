// Updated App.js - Temporary maintenance mode
// To restore the full site, replace this file with the backup

import React from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Coming Soon Page
import ComingSoonPage from './pages/ComingSoonPage';

// CSS
import './App.css';

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ComingSoonPage />
      </Router>
    </HelmetProvider>
  );
}

export default App;