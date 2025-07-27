import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';

// i18n setup
import './i18n'; // Import i18n configuration
import { LanguageProvider } from './contexts/LanguageContext';

// Layout components
import Header from './components/layout/Header';
import Footer from './components/layout/Footer';
import CookieConsent from './components/ui/CookieConsent'; // ADD THIS LINE
import './landingpage.css';

// Pages
import HomePage from './pages/HomePage';
import FeaturesPage from './pages/FeaturesPage';
import PricingPage from './pages/PricingPage';
import BlogPage from './pages/BlogPage';
import ContactPage from './pages/ContactPage';
import CheckoutPage from './pages/CheckoutPage';
import CheckoutSuccessPage from './pages/CheckoutSuccessPage';

// Individual blog posts - ADD THESE IMPORTS
import SavingsBlogPost from './pages/blog/SavingsBlogPost';
import TraditionalVsAIBlogPost from './pages/blog/TraditionalVsAIBlogPost';
import ChooseChatbotBlogPost from './pages/blog/ChooseChatbotBlogPost';
import BuildVsBuyBlogPost from './pages/blog/BuildVsBuyBlogPost';
import ChatWidgetBlogPost from './pages/blog/ChatWidgetBlogPost';
import CompetitiveAdvantageBlogPost from './pages/blog/CompetitiveAdvantageBlogPost';

// New pages that were missing
import AboutPage from './pages/AboutPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import CookiesPage from './pages/CookiesPage';
import DemoPage from './pages/DemoPage';

import FeedbackButton from './components/ui/FeedbackButton';

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

// Redirect component for external links
const RedirectPage = ({ url }) => {
  useEffect(() => {
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

function App() {
  return (
    <HelmetProvider>
      <LanguageProvider>
        <Router>
          <ScrollToTop />
          <div className="flex flex-col min-h-screen">
            <Header />
            
            {/* Cookie Consent Popup - ADD THIS LINE */}
            <CookieConsent />
            
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/features" element={<FeaturesPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/blog" element={<BlogPage />}/>
                <Route path="/demo/:demoId" element={<DemoPage />} />
                
                {/* ADD THESE BLOG POST ROUTES */}
                <Route path="/blog/savings-calculator" element={<SavingsBlogPost />} />
                <Route path="/blog/traditional-vs-ai" element={<TraditionalVsAIBlogPost />} />
                <Route path="/blog/choose-chatbot" element={<ChooseChatbotBlogPost />} />
                <Route path="/blog/build-vs-buy" element={<BuildVsBuyBlogPost />} />
                <Route path="/blog/chat-widget" element={<ChatWidgetBlogPost />} />
                <Route path="/blog/competitive-advantage" element={<CompetitiveAdvantageBlogPost />} />
                
                <Route path="/contact" element={<ContactPage />} />
                <Route path="/checkout" element={<CheckoutPage />} />
                <Route path="/checkout/success" element={<CheckoutSuccessPage />} />
                
                {/* New routes for missing pages */}
                <Route path="/about" element={<AboutPage />} />
                <Route path="/terms" element={<TermsPage />} />
                <Route path="/privacy" element={<PrivacyPage />} />
                <Route path="/cookies" element={<CookiesPage />} />
                
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
              </Routes>
            </main>
            <Footer />
            <FeedbackButton /> 
          </div>
        </Router>
      </LanguageProvider>
    </HelmetProvider>
  );
}

export default App;