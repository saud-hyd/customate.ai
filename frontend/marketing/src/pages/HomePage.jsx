// Replace your HomePage.jsx with this:

import React from 'react';
import HeroSection from '../components/sections/HeroSection';
import FeaturesSection from '../components/sections/FeaturesSection';
import IntegrationsSection from '../components/sections/IntegrationsSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import CTASection from '../components/sections/CTASection';
import ProcurementBanner from '../components/sections/ProcurementBanner';
import DemoSection from '../components/sections/DemoSection';

const HomePage = () => {
  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);
  
  return (
    <>
      <HeroSection />
      <DemoSection />
      <HowItWorksSection />
      <FeaturesSection />
      <IntegrationsSection />
      <CTASection />
      <ProcurementBanner />
      {/* Add any additional sections or components here */}
    </>
  );
};

export default HomePage;