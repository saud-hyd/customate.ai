import React from 'react';
import { Helmet } from 'react-helmet';
import HeroSection from '../components/sections/HeroSection';
import ClientsSection from '../components/sections/ClientsSection';
import FeaturesSection from '../components/sections/FeaturesSection';
import HowItWorksSection from '../components/sections/HowItWorksSection';
import TestimonialsSection from '../components/sections/TestimonialsSection';
import PricingSection from '../components/sections/PricingSection';
import FAQSection from '../components/sections/FAQSection';
import NewsletterSection from '../components/sections/NewsletterSection';
import ContactSection from '../components/sections/ContactSection';
import CTASection from '../components/sections/CTASection';

const HomePage = () => {
  return (
    <>
      <Helmet>
        <title>Customate.ai | AI Chatbot Platform for Business</title>
        <meta 
          name="description" 
          content="Build, customize, and deploy AI-powered chatbots with industry-specific behaviors and custom knowledge bases. Enhance customer support and increase conversions."
        />
        <meta 
          name="keywords" 
          content="AI chatbot, custom chatbot, business chatbot, DeepSeek, RAG, knowledge base, customer support"
        />
      </Helmet>
      <div>
        <HeroSection />
        <ClientsSection />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <PricingSection />
        <FAQSection />
        <NewsletterSection />
        <ContactSection />
        <CTASection />
      </div>
    </>
  );
};

export default HomePage;