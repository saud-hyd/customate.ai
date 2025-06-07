import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';

// Page components
import HomePage from './pages/HomePage';
import PricingPage from './pages/PricingPage';
import ContactPage from './pages/ContactPage';
import FeaturesPage from './pages/FeaturesPage';
import BlogPage from './pages/BlogPage';

// Policy and About pages
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import AboutPage from './pages/AboutPage';
import CookiesPage from './pages/CookiesPage';

// Individual Blog Posts
import SavingsBlogPost from './pages/blog/SavingsBlogPost';
import TraditionalVsAIBlogPost from './pages/blog/TraditionalVsAIBlogPost';
import ChooseChatbotBlogPost from './pages/blog/ChooseChatbotBlogPost';

// Checkout pages (if they exist)
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';

// CSS
import './App.css';

// ScrollToTop component to ensure page scrolls to top on route change
const ScrollToTop = () => {
  const { pathname } = useLocation();

  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

// Redirect component for external links
const RedirectPage = ({ url }) => {
  React.useEffect(() => {
    window.location.href = url;
  }, [url]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting...</p>
      </div>
    </div>
  );
};

// 404 Page component
const NotFoundPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you're looking for doesn't exist.</p>
        <Link 
          to="/" 
          className="bg-orange-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-600 transition-colors"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
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
              {/* Main pages */}
              <Route path="/" element={<HomePage />} />
              <Route path="/features" element={<FeaturesPage />} />
              <Route path="/pricing" element={<PricingPage />} />
              <Route path="/contact" element={<ContactPage />} />
              
              {/* Blog pages */}
              <Route path="/blog" element={<BlogPage />} />
              <Route path="/blog/savings-calculator" element={<SavingsBlogPost />} />
              <Route path="/blog/traditional-vs-ai" element={<TraditionalVsAIBlogPost />} />
              <Route path="/blog/choose-chatbot" element={<ChooseChatbotBlogPost />} />
              
              {/* Policy and About pages */}
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/cookies" element={<CookiesPage />} />
              
              {/* Checkout pages (if they exist) */}
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
              
              {/* Redirect to dashboard app for these routes */}
              <Route 
                path="/login" 
                element={<RedirectPage url="https://app.customate.ai/login" />}
              />
              <Route 
                path="/register" 
                element={<RedirectPage url="https://app.customate.ai/register" />}
              />
              <Route 
                path="/dashboard" 
                element={<RedirectPage url="https://app.customate.ai/dashboard" />}
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

export default App;