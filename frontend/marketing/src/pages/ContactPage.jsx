import React from 'react';
import { Helmet } from 'react-helmet';
import SectionContainer from '../components/ui/SectionContainer';
import ContactSection from '../components/sections/ContactSection';

const ContactPage = () => {
  return (
    <>
      <Helmet>
        <title>Contact Us - Customate.ai | AI Chatbot Platform</title>
        <meta 
          name="description" 
          content="Get in touch with the Customate.ai team. We're here to answer your questions and help you build the perfect AI chatbot solution for your business." 
        />
      </Helmet>
      
      <SectionContainer background="primary-50" paddingY="py-16 md:py-20">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Get in Touch
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            We'd love to hear from you. Reach out with any questions, feedback, or inquiries about Customate.ai.
          </p>
        </div>
      </SectionContainer>
      
      <ContactSection />
    </>
  );
};

export default ContactPage;