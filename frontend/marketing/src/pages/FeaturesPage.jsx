import React from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import SectionContainer from '../components/ui/SectionContainer';
import FeaturesSection from '../components/sections/FeaturesSection';
import CTASection from '../components/sections/CTASection';

const FeaturesPage = () => {
  const detailedFeatures = [
    {
      title: "Retrieval-Augmented Generation (RAG)",
      description: "Customate.ai uses advanced RAG technology to provide highly accurate responses based on your specific knowledge base.",
      details: [
        "Automatically processes and indexes uploaded documents",
        "Semantically searches your content to find the most relevant information",
        "Generates natural language responses using retrieved content",
        "Cites sources for information transparency",
        "Continuously improves with usage"
      ],
      image: "/images/feature-rag.png",
      background: "bg-blue-50"
    },
    {
      title: "Industry-Specific Behaviors",
      description: "Our chatbots come pre-configured with behaviors optimized for specific industries to meet your unique business needs.",
      details: [
        "E-commerce: product recommendations, order tracking, inventory queries",
        "Healthcare: appointment scheduling, symptom checking, medication reminders",
        "SaaS: feature explanations, troubleshooting, upgrade guidance",
        "Finance: account inquiries, transaction support, financial advice",
        "Education: course information, enrollment assistance, learning resources"
      ],
      image: "/images/feature-industry.png",
      background: "bg-green-50"
    },
    {
      title: "Multi-tenant Architecture",
      description: "Built with enterprise-grade security and scalability to ensure data isolation and optimal performance.",
      details: [
        "Complete data isolation between clients",
        "Scalable infrastructure that grows with your needs",
        "Robust authentication and authorization",
        "Role-based access control",
        "Comprehensive audit logging"
      ],
      image: "/images/feature-security.png",
      background: "bg-yellow-50"
    },
    {
      title: "White-labeling & Customization",
      description: "Make the chatbot your own with extensive customization options that match your brand identity.",
      details: [
        "Custom colors, logos, and typography",
        "Personalized greeting messages and chat behavior",
        "Flexible widget positioning and appearance",
        "Custom domain support",
        "Tailored conversation flows"
      ],
      image: "/images/feature-customize.png",
      background: "bg-indigo-50"
    },
    {
      title: "Document Processing",
      description: "Upload and process various document types to automatically build your knowledge base.",
      details: [
        "Support for PDFs, DOCs, PPTs, spreadsheets, and more",
        "Intelligent content extraction and structuring",
        "Automatic categorization and tagging",
        "Image and table recognition",
        "Regular re-indexing to keep content fresh"
      ],
      image: "/images/feature-docs.png",
      background: "bg-purple-50"
    },
    {
      title: "Analytics Dashboard",
      description: "Gain valuable insights into how users interact with your chatbot and continuously improve performance.",
      details: [
        "Conversation volume and user engagement metrics",
        "Common questions and topic analysis",
        "Satisfaction scores and feedback tracking",
        "Conversion and goal completion rates",
        "Custom reports and data export"
      ],
      image: "/images/feature-analytics.png",
      background: "bg-red-50"
    }
  ];

  return (
    <>
      <Helmet>
        <title>Features - Customate.ai | AI Chatbot Platform</title>
        <meta 
          name="description" 
          content="Explore Customate.ai's powerful features including RAG implementation, industry-specific behaviors, multi-tenant storage, white-labeling, and more." 
        />
      </Helmet>
      
      <SectionContainer background="light" paddingY="py-20 md:py-28">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Powerful Features for Intelligent Chatbots
          </h1>
          <p className="mt-4 text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how Customate.ai's comprehensive feature set helps you build, deploy, and optimize AI chatbots for your business.
          </p>
        </div>
      </SectionContainer>
      
      <FeaturesSection />
      
      {/* Detailed features section */}
      <SectionContainer background="white" paddingY="py-16 md:py-24">
        <div className="mb-16 text-center">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Dive Deeper Into Our Features
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Everything you need to create intelligent, responsive chatbots that deliver real business value.
          </p>
        </div>
        
        <div className="space-y-24">
          {detailedFeatures.map((feature, index) => (
            <div key={index} className="relative">
              <div className={`absolute inset-0 ${feature.background} rounded-3xl transform -rotate-1 scale-105 -z-10`}></div>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="lg:flex">
                  <div className="lg:w-1/2 p-8 lg:p-12">
                    <h3 className="text-2xl font-bold text-gray-900">
                      {feature.title}
                    </h3>
                    <p className="mt-4 text-lg text-gray-600">
                      {feature.description}
                    </p>
                    <ul className="mt-6 space-y-3">
                      {feature.details.map((detail, i) => (
                        <motion.li 
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: i * 0.1 }}
                          viewport={{ once: true }}
                          className="flex items-start"
                        >
                          <svg className="h-6 w-6 text-primary-500 mt-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          <span className="ml-3 text-gray-700">{detail}</span>
                        </motion.li>
                      ))}
                    </ul>
                  </div>
                  <div className="lg:w-1/2 bg-gray-50 flex items-center justify-center p-8">
                    <img 
                      src={feature.image || "https://via.placeholder.com/600x400"} 
                      alt={feature.title} 
                      className="rounded-lg shadow-md max-h-80 object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionContainer>
      
      {/* Integrations section */}
      <SectionContainer background="light" paddingY="py-16 md:py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Seamless Integrations
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Connect Customate.ai with your favorite tools and platforms
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {[
            'Salesforce', 'Hubspot', 'Zendesk', 'Shopify', 
            'Slack', 'Microsoft Teams', 'Google Analytics', 'Zapier',
            'Intercom', 'Mailchimp', 'WordPress', 'Stripe'
          ].map((integration, i) => (
            <div key={i} className="flex items-center justify-center p-4 bg-white rounded-lg shadow-sm border border-gray-100">
              <span className="text-gray-900 font-medium">{integration}</span>
            </div>
          ))}
        </div>
      </SectionContainer>
      
      <CTASection />
    </>
  );
};

export default FeaturesPage;