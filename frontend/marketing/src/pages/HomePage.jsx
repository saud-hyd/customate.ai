import React from 'react';
import Header from '../components/layout/Header';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/sections/HeroSection';
import FeaturesSection from '../components/sections/FeaturesSection';
import IntegrationsSection from '../components/sections/IntegrationsSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import CTASection from '../components/sections/CTASection';

const HomePage = () => {
  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FeaturesSection />
        <IntegrationsSection />
        <HowItWorksSection />
        <CTASection />
      </main>
    </>
  );
};

export default HomePage;