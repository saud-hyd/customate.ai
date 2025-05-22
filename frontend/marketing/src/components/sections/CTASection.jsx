import React from 'react';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import { useTranslation } from 'react-i18next';

const CTASection = () => {
  const { t } = useTranslation('home');
  
  return (
    <section id="cta" className="relative py-20 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-orange-600 via-orange-500 to-orange-600"></div>
      
      {/* Radial Accent */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-yellow-400 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3"></div>
        <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-orange-800 rounded-full blur-3xl transform -translate-x-1/3 translate-y-1/3"></div>
      </div>
      
      {/* Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <pattern id="grid-pattern" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M0 0 L40 0 L40 40 L0 40 Z" fill="none" stroke="white" strokeWidth="1" />
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid-pattern)" />
        </svg>
      </div>
      
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center text-white"
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-6">
            {t('cta.title')}
          </h2>
          <p className="text-xl mb-8 text-orange-50">
            {t('cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button
              as="a"
              href="/register"
              variant="custom"
              size="lg"
              className="bg-white text-orange-600 hover:bg-yellow-100 focus:ring-orange-600"
            >
              {t('cta.getStarted', { ns: 'common' })}
            </Button>
            
            <Button
              as="a"
              href="https://youtu.be/sW2XR_rTfi0"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-white/10"
            >
              {t('cta.watchDemo', { ns: 'common' })}
            </Button>
          </div>
          <p className="mt-6 text-sm text-orange-100">
             Free plan available · Set up in minutes
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default CTASection;