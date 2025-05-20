import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import './landingpage.css';


// Pages
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';

// CSS
import './App.css';

// ScrollToTop component to ensure page scrolls to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

function App() {
  return (
    <HelmetProvider>
      <Router>
        <ScrollToTop />
        <div className="flex flex-col min-h-screen">
          <Header />
          <main className="flex-grow">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/blog" element={<BlogPage />}/>
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
              
              {/* Redirect to dashboard app for these routes */}
              <Route 
                path="/login" 
                element={
                  <RedirectPage url="https://app.customate.ai/login" />
                }
              />
              <Route 
                path="/register" 
                element={
                  <RedirectPage url="https://app.customate.ai/register" />
                } 
              />
              <Route 
                path="/dashboard" 
                element={
                  <RedirectPage url="https://app.customate.ai/dashboard" />
                } 
              />
              
              {/* Fallback route - 404 */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </Router>
    </HelmetProvider>
  );
}

// Simple redirect component
const RedirectPage = ({ url }) => {
  useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
        <p className="text-gray-600">You are being redirected to Customate.ai application.</p>
        <div className="mt-4">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    </div>
  );
};

// 404 page
const NotFoundPage = () => {
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center max-w-lg px-4">
        <h1 className="text-6xl font-bold text-primary-600">404</h1>
        <h2 className="text-3xl font-semibold mt-4 mb-2">Page Not Found</h2>
        <p className="text-gray-600 mb-8">
          The page you are looking for might have been removed, had its name changed, 
          or is temporarily unavailable.
        </p>
        <a 
          href="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          Back to Home
        </a>
      </div>
    </div>
  );
};

export default App;