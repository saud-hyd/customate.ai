import React from 'react';
import { motion } from 'framer-motion';
import { useInView } from 'react-intersection-observer';
import SectionContainer from '../ui/SectionContainer';

const HowItWorksSection = () => {
  const steps = [
    {
      id: 1,
      title: 'Sign up and create your account',
      description: 'Create your Customate.ai account in seconds. No credit card required for the free plan.',
      image: '/images/step-1-signup.png',
    },
    {
      id: 2,
      title: 'Upload your knowledge base',
      description: 'Upload documents, FAQs, product information, or any content that your chatbot should know about.',
      image: '/images/step-2-knowledge.png',
    },
    {
      id: 3,
      title: 'Customize your chatbot',
      description: 'Personalize your chatbots behavior, appearance, and responses to match your brand and industry.',
      image: '/images/step-3-customize.png',
    },
    {
      id: 4,
      title: 'Embed on your website',
      description: 'Add the widget to your site with a simple code snippet. Start engaging with your visitors right away.',
      image: '/images/step-4-embed.png',
    },
  ];

  const StepCard = ({ step, index, isEven }) => {
    const [ref, inView] = useInView({
      triggerOnce: true,
      threshold: 0.1,
    });

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 30 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, delay: index * 0.1 }}
        className={`flex flex-col md:items-center md:flex-row ${
          isEven ? 'md:flex-row-reverse' : ''
        } mb-16 last:mb-0`}
      >
        {/* Image side */}
        <div className="w-full md:w-1/2 mb-6 md:mb-0">
          <div className="rounded-xl overflow-hidden shadow-lg">
            <img
              src={step.image || 'https://via.placeholder.com/600x400'}
              alt={`Step ${step.id}: ${step.title}`}
              className="w-full h-auto object-cover"
            />
          </div>
        </div>

        {/* Text side */}
        <div className={`w-full md:w-1/2 ${isEven ? 'md:pr-12' : 'md:pl-12'}`}>
          <div className="flex items-center mb-4">
            <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-primary-100 text-primary-600 text-xl font-bold">
              {step.id}
            </div>
            <h3 className="ml-4 text-2xl font-bold text-gray-900">{step.title}</h3>
          </div>
          <p className="text-lg text-gray-600">{step.description}</p>
        </div>
      </motion.div>
    );
  };

  return (
    <SectionContainer background="light" id="how-it-works">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            How Customate.ai Works
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Get up and running with your custom AI chatbot in just a few simple steps
          </p>
        </motion.div>
      </div>

      <div className="mt-16">
        {steps.map((step, index) => (
          <StepCard 
            key={step.id} 
            step={step} 
            index={index} 
            isEven={index % 2 !== 0} 
          />
        ))}
      </div>
    </SectionContainer>
  );
};

export default HowItWorksSection;