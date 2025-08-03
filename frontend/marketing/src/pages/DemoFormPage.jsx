// Create this new file: src/pages/DemoFormPage.jsx

import React from 'react';
import { Helmet } from 'react-helmet-async';
import DemoSection from '../components/sections/DemoSection';
import SectionContainer from '../components/ui/SectionContainer';

const DemoFormPage = () => {
  // Scroll to top when page loads
  React.useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Helmet>
        <title>Try Demo - Customate.ai | Test Our AI Chatbot on Your Website</title>
        <meta 
          name="description" 
          content="See how Customate.ai's chatbot works with your actual website content in under 30 seconds. No signup required." 
        />
        <meta name="keywords" content="AI chatbot demo, website chatbot test, customate demo" />
      </Helmet>

      {/* Hero Section for Demo Page */}
      <SectionContainer background="light" paddingY="py-16 md:py-20">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-4">
            Try Our AI Chatbot Demo
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Experience how Customate.ai transforms your website visitors into engaged customers. 
            Simply enter your website URL and see our AI chatbot in action within seconds.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              No signup required
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Ready in 30 seconds
            </span>
            <span className="flex items-center">
              <svg className="w-4 h-4 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Up to 5 pages crawled
            </span>
          </div>
        </div>
      </SectionContainer>

      {/* Demo Section */}
      <DemoSection />

      {/* Additional Information Section */}
      <SectionContainer background="white" paddingY="py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            What happens during the demo?
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 font-bold text-xl">1</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Website Analysis</h3>
              <p className="text-gray-600">
                We crawl your website to understand your content, products, and services
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 font-bold text-xl">2</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Training</h3>
              <p className="text-gray-600">
                Our AI learns about your business to provide accurate, contextual responses
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-orange-600 font-bold text-xl">3</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Interactive Demo</h3>
              <p className="text-gray-600">
                Test the chatbot with real questions and see how it performs on your site
              </p>
            </div>
          </div>
        </div>
      </SectionContainer>
    </>
  );
};

export default DemoFormPage;