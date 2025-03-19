import React from 'react';
import { Helmet } from 'react-helmet';
import PricingSection from '../components/sections/PricingSection';
import FAQSection from '../components/sections/FAQSection';
import CTASection from '../components/sections/CTASection';
import SectionContainer from '../components/ui/SectionContainer';

const PricingPage = () => {
  return (
    <>
      <Helmet>
        <title>Pricing - Customate.ai | AI Chatbot Platform</title>
        <meta 
          name="description" 
          content="Explore Customate.ai's flexible pricing plans for businesses of all sizes. From startups to enterprises, find the right plan for your AI chatbot needs." 
        />
      </Helmet>
      
      <SectionContainer background="light" paddingY="py-20 md:py-28">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Flexible Pricing for Every Business
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your business needs. All plans include core features with additional capabilities as you scale.
          </p>
        </div>
      </SectionContainer>
      
      <PricingSection />
      
      <SectionContainer background="gradient" paddingY="py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-xl overflow-hidden">
            <div className="px-6 py-8 sm:p-10">
              <h2 className="text-3xl font-bold text-center text-gray-900">
                Enterprise Solutions
              </h2>
              <p className="mt-4 text-lg text-center text-gray-600">
                Need a custom solution for your organization?
              </p>
              
              <div className="mt-8 grid gap-8 md:grid-cols-2">
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Enterprise Features
                  </h3>
                  <ul className="mt-4 space-y-3">
                    <li className="flex">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-700">Custom deployment options</span>
                    </li>
                    <li className="flex">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-700">Advanced security & compliance</span>
                    </li>
                    <li className="flex">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-700">Custom integration development</span>
                    </li>
                    <li className="flex">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-700">Dedicated account manager</span>
                    </li>
                    <li className="flex">
                      <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="ml-3 text-gray-700">Service level agreements (SLAs)</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-xl font-semibold text-gray-900">
                    Contact Our Sales Team
                  </h3>
                  <p className="mt-2 text-gray-600">
                    Let us build a custom package tailored to your specific needs.
                  </p>
                  <div className="mt-6">
                    <a 
                      href="/contact" 
                      className="block w-full py-3 px-4 bg-primary-600 text-white text-center font-medium rounded-md shadow-sm hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                    >
                      Contact Sales
                    </a>
                  </div>
                  <p className="mt-4 text-sm text-gray-500">
                    Or call us directly: <a href="tel:+15551234567" className="text-primary-600">+1 (555) 123-4567</a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
      
      <FAQSection />
      <CTASection />
    </>
  );
};

export default PricingPage;