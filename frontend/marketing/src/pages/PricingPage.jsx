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
      
      <SectionContainer background="gradient" paddingY="py-20 md:py-24">
        <div className="text-center relative z-10">
          {/* Background decorations */}
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute top-10 right-1/4 h-64 w-64 rounded-full bg-primary-300 mix-blend-multiply opacity-20 blur-3xl"></div>
            <div className="absolute bottom-10 left-1/4 h-64 w-64 rounded-full bg-primary-400 mix-blend-multiply opacity-20 blur-3xl"></div>
          </div>
          
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl mb-6">
            Flexible Pricing for Every Business
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Choose the perfect plan for your business needs. All plans include core features with additional capabilities as you scale.
          </p>
        </div>
      </SectionContainer>
      
      <PricingSection />
      
      <SectionContainer background="light" paddingY="py-16 md:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-primary-100">
            <div className="p-8 sm:p-10">
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Enterprise Solutions
                </h2>
                <p className="mt-4 text-lg text-gray-600">
                  Need a custom solution for your organization?
                </p>
              </div>
              
              <div className="mt-10 grid gap-8 md:grid-cols-2">
                <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-6 shadow-md border border-primary-100">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="h-6 w-6 text-primary-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Enterprise Features
                  </h3>
                  <ul className="mt-6 space-y-4">
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3 text-gray-700">Custom deployment options</span>
                    </li>
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3 text-gray-700">Advanced security & compliance</span>
                    </li>
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3 text-gray-700">Custom integration development</span>
                    </li>
                    <li className="flex">
                      <div className="flex-shrink-0 h-6 w-6 bg-primary-100 rounded-full flex items-center justify-center">
                        <svg className="h-4 w-4 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="ml-3 text-gray-700">Dedicated account manager</span>
                    </li>
                  </ul>
                </div>
                
                <div className="bg-gradient-to-br from-primary-50 to-white rounded-xl p-6 shadow-md border border-primary-100">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <svg className="h-6 w-6 text-primary-500 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Contact Our Sales Team
                  </h3>
                  <p className="mt-4 text-gray-600">
                    Let us build a custom package tailored to your specific needs and business requirements.
                  </p>
                  <div className="mt-8">
                    <a 
                      href="/contact" 
                      className="block w-full py-3 px-4 bg-primary-600 text-white text-center font-medium rounded-lg shadow-md hover:shadow-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-all duration-200"
                    >
                      Contact Sales
                    </a>
                  </div>

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