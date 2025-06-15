import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import SectionContainer from '../ui/SectionContainer';

const FAQSection = () => {
  const { t } = useTranslation('faq');
  const [openFaq, setOpenFaq] = useState(null);
  
  // Get FAQ data from translations
  const faqData = t('questions', { returnObjects: true });
  
  const toggleFaq = (id) => {
    setOpenFaq(openFaq === id ? null : id);
  };

  return (
    <SectionContainer className="py-20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {t('title')}
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            {t('subtitle')}
          </p>
        </div>
        
        <div className="space-y-4">
          {faqData.map((faq) => (
            <motion.div
              key={faq.id}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: faq.id * 0.1 }}
            >
              <button
                className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 transition-colors"
                onClick={() => toggleFaq(faq.id)}
              >
                <span className="font-semibold text-gray-900">{faq.question}</span>
                <motion.span
                  className="text-orange-500 text-xl"
                  animate={{ rotate: openFaq === faq.id ? 45 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  +
                </motion.span>
              </button>
              
              <AnimatePresence>
                {openFaq === faq.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-4 text-gray-700 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionContainer>
  );
};

export default FAQSection;