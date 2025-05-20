import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';

const HowItWorksSection = () => {
  const steps = [
    {
      title: "Sign up & create an account",
      description: "Create your account in seconds. No credit card required for the basic plan.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      title: "Upload your knowledge base",
      description: "Import your documents, FAQs, or connect to your existing content repositories.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      )
    },
    {
      title: "Customize your AI agent",
      description: "Configure behavior, appearance, and conversation flows to match your brand.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    {
      title: "Deploy across channels",
      description: "Add to your website, mobile app, or integrate with your existing platforms.",
      icon: (
        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  // Enhanced animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.4
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -50 },
    visible: { 
      opacity: 1, 
      x: 0,
      transition: { 
        type: "spring",
        stiffness: 100,
        damping: 15
      }
    }
  };

  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1
  });

  return (
    <section id="how-it-works" className="py-24 bg-gradient-to-b from-orange-50 to-orange-100 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Dot pattern */}
        <div className="absolute inset-0 opacity-30">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="dotPattern" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1" fill="rgba(234, 88, 12, 0.1)" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dotPattern)" />
          </svg>
        </div>
        
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-1/2 h-1/2 bg-orange-300 rounded-full opacity-10 blur-3xl transform -translate-x-1/4 -translate-y-1/4"></div>
        <div className="absolute bottom-0 right-0 w-1/2 h-1/2 bg-orange-400 rounded-full opacity-10 blur-3xl transform translate-x-1/4 translate-y-1/4"></div>
        <div className="absolute top-1/3 right-1/4 w-64 h-64 bg-orange-500 rounded-full opacity-5 blur-3xl"></div>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          >
            <span className="inline-block py-1.5 px-4 rounded-full bg-orange-100 text-orange-600 font-medium mb-4 border border-orange-200">
              4 Simple Steps
            </span>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              How Customate.ai <span className="text-orange-500">Works</span>
            </h2>
            <p className="text-xl text-gray-700 max-w-2xl mx-auto">
              Get up and running with your personalized AI assistant in minutes
            </p>
          </motion.div>
        </div>
        
        <motion.div 
          ref={ref}
          variants={containerVariants}
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          className="relative max-w-5xl mx-auto"
        >
          {/* Connection Line */}
          <div className="absolute left-1/2 top-24 bottom-0 w-1 bg-gradient-to-b from-orange-300 to-orange-500 hidden md:block transform -translate-x-1/2" />
          
          {/* Steps */}
          {steps.map((step, index) => (
            <motion.div 
              key={index}
              variants={itemVariants}
              className="mb-20 last:mb-0 relative"
              whileHover={{ scale: 1.02 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <div className="flex flex-col md:flex-row items-center">
                {/* Step Number Circle with pulsing animation */}
                <div className="relative mb-6 md:mb-0">
                  <motion.div 
                    className="w-20 h-20 rounded-full bg-white flex items-center justify-center z-20 shadow-lg border-2 border-orange-300"
                    whileHover={{ scale: 1.1, borderColor: "#f97316" }}
                    transition={{ type: "spring", stiffness: 300 }}
                    animate={{ 
                      boxShadow: ["0px 0px 0px rgba(249, 115, 22, 0.2)", "0px 0px 20px rgba(249, 115, 22, 0.4)", "0px 0px 0px rgba(249, 115, 22, 0.2)"]
                    }}
                    transition={{
                      repeat: Infinity,
                      duration: 3
                    }}
                  >
                    <span className="text-2xl font-bold text-orange-500">
                      {index + 1}
                    </span>
                  </motion.div>
                </div>
                
                {/* Content Card */}
                <div className="md:ml-10 w-full">
                  <motion.div 
                    className="p-8 bg-white rounded-2xl shadow-xl border border-orange-100"
                    whileHover={{ boxShadow: "0 10px 25px -5px rgba(249, 115, 22, 0.1), 0 8px 10px -6px rgba(249, 115, 22, 0.1)" }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex flex-col md:flex-row md:items-start gap-6">
                      {/* Icon with pop animation */}
                      <motion.div 
                        className="flex-shrink-0 p-4 rounded-xl bg-orange-50 text-orange-500 self-center md:self-start"
                        whileHover={{ 
                          scale: 1.1,
                          rotate: [0, -5, 5, -5, 0],
                          transition: { duration: 0.5 }
                        }}
                      >
                        {step.icon}
                      </motion.div>
                      
                      {/* Text Content */}
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">{step.title}</h3>
                        <p className="text-lg text-gray-600">{step.description}</p>
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
              
              {/* Arrow animation between steps */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute left-1/2 bottom-0 transform -translate-x-1/2 translate-y-12 z-10">
                  <motion.div
                    animate={{ 
                      y: [0, 10, 0],
                      opacity: [0.5, 1, 0.5]
                    }}
                    transition={{ 
                      repeat: Infinity, 
                      duration: 2,
                      ease: "easeInOut"
                    }}
                  >
                    <svg className="w-10 h-10 text-orange-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 5V19M12 19L5 12M12 19L19 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </motion.div>
                </div>
              )}
            </motion.div>
          ))}
        </motion.div>
        
        {/* Call to Action with attention-grabbing animation */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1, duration: 0.7 }}
          className="text-center mt-16"
        >
          <motion.a 
            href="/register" 
            className="inline-flex items-center px-8 py-4 rounded-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-medium text-lg shadow-lg"
            whileHover={{ 
              scale: 1.05,
              boxShadow: "0 15px 25px -5px rgba(249, 115, 22, 0.4)"
            }}
            whileTap={{ scale: 0.98 }}
            animate={{ 
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 10px 15px -3px rgba(249, 115, 22, 0.3)",
                "0 15px 25px -5px rgba(249, 115, 22, 0.4)",
                "0 10px 15px -3px rgba(249, 115, 22, 0.3)"
              ]
            }}
            transition={{
              repeat: Infinity,
              repeatDelay: 4,
              duration: 2
            }}
          >
            Get Started Today
            <svg className="ml-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </motion.a>
        </motion.div>
      </div>
    </section>
  );
};

export default HowItWorksSection;