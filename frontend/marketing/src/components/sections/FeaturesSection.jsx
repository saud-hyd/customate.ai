import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const FeaturesSection = () => {
  // State to track which cards are hovered
  const [hoveredCard, setHoveredCard] = useState(null);

  // Enhanced feature list with front and back content
  const features = [
    {
      title: "Knowledge Integration",
      description: "Our RAG implementation connects your documents, FAQs, and data directly to conversational AI for context-aware responses.",
      detailedInfo: "Seamlessly connect your knowledge base with our proprietary RAG system. Transform documents, databases, and support tickets into conversational intelligence with millisecond access time, reducing inaccuracies by 86% compared to standard LLMs.",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      title: "Industry Behaviors",
      description: "Pre-configured AI behaviors for different industries that understand specialized vocabulary specific to your business.",
      detailedInfo: "Industry-specific behaviors for healthcare, finance, legal, and more with domain terminology, compliance guardrails, and optimized conversation patterns that continuously adapt to industry-specific needs.",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Multi-channel Integration",
      description: "Deploy your AI agent across website, mobile app, SMS, social media, and all your customer engagement platforms.",
      detailedInfo: "Deploy across websites, mobile apps, SMS, WhatsApp, and more with our unified API. Maintain conversation context across channels with seamless transitions between platforms and customizable integrations.",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    },
    {
      title: "Semantic Understanding",
      description: "Our AI comprehends context, sentiment, and intent beyond keywords for truly human-like conversations.",
      detailedInfo: "Advanced NLU engine understands nuances, sentiment, and intent with 93% accuracy. Recognizes complex patterns including sarcasm and cultural references while maintaining conversation context for personalized experiences.",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      title: "Real-time Analytics",
      description: "Monitor conversations, track satisfaction, and identify optimization opportunities through our intuitive dashboard.",
      detailedInfo: "Track conversation volume, resolution rates, and satisfaction in real time. Identify knowledge gaps with AI-powered analytics and configure custom dashboards with automated alerts for critical KPIs.",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      )
    },
    {
      title: "Brand Customization",
      description: "Complete visual control with custom colors, logos, and conversation styles that match your brand identity.",
      detailedInfo: "Transform your AI into a brand ambassador with comprehensive customization. Define conversation style, tone, and personality traits aligned with your brand values, plus pixel-perfect UI elements that blend seamlessly with your digital properties.",
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
        </svg>
      )
    }
  ];

  const headingVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    }
  };
  
  const subheadingVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.6, delay: 0.2, ease: "easeOut" }
    }
  };
  
  const featureCardVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: (i) => ({
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        delay: i * 0.15,
        ease: "easeOut"
      }
    })
  };

  return (
    <section id="features" className="py-24 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <motion.h2 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={headingVariants}
            className="text-4xl font-bold text-gray-900 leading-tight"
          >
            Supercharging Business <span className="text-orange-500">Conversations</span>
          </motion.h2>
          <motion.p 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={subheadingVariants}
            className="mt-5 text-lg max-w-3xl mx-auto text-gray-600"
          >
            Customate.ai delivers intelligent, context-aware experiences
          </motion.p>
        </div>

        {/* Feature Cards Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              custom={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-50px" }}
              variants={featureCardVariants}
              className="h-72 perspective-1000 group"
              onHoverStart={() => setHoveredCard(index)}
              onHoverEnd={() => setHoveredCard(null)}
            >
              <AnimatePresence mode="wait" initial={false}>
                {hoveredCard !== index ? (
                  // Front of card
                  <motion.div
                    key={`front-${index}`}
                    initial={{ rotateY: 0, opacity: 1 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: -180, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-orange-50 shadow-xl hover:shadow-2xl border border-orange-100 transition-all duration-300 h-full backface-hidden flex flex-col"
                  >
                    <div className="absolute inset-0 overflow-hidden">
                      <div className="absolute -right-6 -top-6 w-32 h-32 bg-orange-100 rounded-full opacity-70"></div>
                      <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-orange-100 rounded-full opacity-50"></div>
                    </div>
                    
                    <div className="relative flex flex-col items-center justify-center text-center h-full p-6">
                      <div className="text-orange-500 mb-5 flex items-center justify-center bg-white shadow-md rounded-full w-20 h-20 transform group-hover:scale-110 transition-all duration-300">
                        {feature.icon}
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 tracking-tight">{feature.title}</h3>
                    </div>
                  </motion.div>
                ) : (
                  // Back of card
                  <motion.div
                    key={`back-${index}`}
                    initial={{ rotateY: 180, opacity: 0 }}
                    animate={{ rotateY: 0, opacity: 1 }}
                    exit={{ rotateY: 180, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 h-full backface-hidden flex flex-col"
                  >
                    {/* Dramatic background with unique color per feature */}
                    <div className="absolute inset-0 bg-gradient-to-br 
                      ${index === 0 ? 'from-orange-500 to-red-600' : 
                        index === 1 ? 'from-orange-400 to-amber-600' : 
                        index === 2 ? 'from-orange-500 to-pink-600' : 
                        index === 3 ? 'from-amber-500 to-orange-700' : 
                        index === 4 ? 'from-orange-500 to-rose-600' : 
                        'from-orange-400 to-orange-700'}">
                    </div>
                    
                    {/* Circular highlight */}
                    <div className="absolute w-60 h-60 rounded-full bg-white/10 blur-xl -top-20 -right-20"></div>
                    
                    {/* Decorative lines */}
                    <div className="absolute inset-0 opacity-20">
                      {index % 2 === 0 ? (
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <path d="M0,0 L100,0 L100,100 L0,100 Z" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="5,5" />
                          <line x1="0" y1="25" x2="100" y2="25" stroke="white" strokeWidth="0.5" />
                          <line x1="0" y1="50" x2="100" y2="50" stroke="white" strokeWidth="0.5" />
                          <line x1="0" y1="75" x2="100" y2="75" stroke="white" strokeWidth="0.5" />
                        </svg>
                      ) : (
                        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                          <circle cx="50" cy="50" r="40" fill="none" stroke="white" strokeWidth="0.5" />
                          <circle cx="50" cy="50" r="30" fill="none" stroke="white" strokeWidth="0.5" />
                          <circle cx="50" cy="50" r="20" fill="none" stroke="white" strokeWidth="0.5" />
                        </svg>
                      )}
                    </div>
                    
                    {/* Main content */}
                    <div className="relative flex flex-col h-full z-10 p-0">
                      {/* Top accent */}
                      <div className="h-1.5 bg-white/30 w-full"></div>
                      
                      {/* White card with feature info */}
                      <div className="bg-white/95 backdrop-blur-md m-4 rounded-xl shadow-lg flex-grow flex flex-col p-5">
                        {/* Feature specific icon */}
                        <div className={`rounded-full w-12 h-12 flex items-center justify-center mb-3
                          ${index === 0 ? 'bg-orange-100 text-orange-500' : 
                            index === 1 ? 'bg-amber-100 text-amber-600' : 
                            index === 2 ? 'bg-pink-100 text-pink-600' : 
                            index === 3 ? 'bg-orange-100 text-orange-700' : 
                            index === 4 ? 'bg-rose-100 text-rose-600' : 
                            'bg-orange-100 text-orange-600'}`}>
                          {index === 0 ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 3H4a2 2 0 00-2 2v5a2 2 0 002 2h5a2 2 0 002-2V5a2 2 0 00-2-2zM20 3h-5a2 2 0 00-2 2v5a2 2 0 002 2h5a2 2 0 002-2V5a2 2 0 00-2-2zM9 14H4a2 2 0 00-2 2v5a2 2 0 002 2h5a2 2 0 002-2v-5a2 2 0 00-2-2zM20 14h-5a2 2 0 00-2 2v5a2 2 0 002 2h5a2 2 0 002-2v-5a2 2 0 00-2-2z" />
                            </svg>
                          ) : index === 1 ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                            </svg>
                          ) : index === 2 ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          ) : index === 3 ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                            </svg>
                          ) : index === 4 ? (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          ) : (
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                            </svg>
                          )}
                        </div>
                        
                        {/* Feature heading and description */}
                        <h4 className={`text-lg font-bold mb-2
                          ${index === 0 ? 'text-orange-700' : 
                            index === 1 ? 'text-amber-700' : 
                            index === 2 ? 'text-pink-700' : 
                            index === 3 ? 'text-orange-800' : 
                            index === 4 ? 'text-rose-700' : 
                            'text-orange-700'}`}>
                          {index === 0 ? 'Unified Knowledge System' :
                           index === 1 ? 'Industry-Specific AI' :
                           index === 2 ? 'Omnichannel Experience' : 
                           index === 3 ? 'Conversational Intelligence' :
                           index === 4 ? 'Performance Insights' :
                           'Brand Personality'}
                        </h4>
                        
                        <p className="text-gray-600 text-sm leading-relaxed">
                          {index === 0 ? 'Connect business data sources for AI that delivers accurate, consistent answers across every customer touchpoint.' :
                           index === 1 ? 'Understands specialized terminology and follows industry-specific compliance requirements from day one.' :
                           index === 2 ? 'Create seamless experiences from web to mobile, SMS, WhatsApp and all your social platforms.' : 
                           index === 3 ? 'Detects intent, sentiment and context for truly human-like interactions that improve over time.' :
                           index === 4 ? 'Track KPIs and optimize customer interactions with real-time analytics and intelligent insights.' :
                           'Express your unique brand voice with custom visuals, conversation style and on-brand responses.'}
                        </p>
                        
                        {/* Decorative footer */}
                        <div className={`mt-auto pt-3 flex items-center
                          ${index === 0 ? 'text-orange-500' : 
                            index === 1 ? 'text-amber-500' : 
                            index === 2 ? 'text-pink-500' : 
                            index === 3 ? 'text-orange-600' : 
                            index === 4 ? 'text-rose-500' : 
                            'text-orange-500'}`}>
                          <div className="h-px flex-grow bg-gray-200 mr-2"></div>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
      
      {/* Custom styles for card flip effect */}
      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .backface-hidden {
          backface-visibility: hidden;
          transform-style: preserve-3d;
        }
        /* Enhance hover experience for devices with mouse */
        @media (hover: hover) and (pointer: fine) {
          .perspective-1000 {
            transition-property: transform;
            transition-duration: 150ms;
          }
          .perspective-1000:hover {
            transform: translateY(-8px);
          }
        }
      `}</style>
    </section>
  );
};

export default FeaturesSection;