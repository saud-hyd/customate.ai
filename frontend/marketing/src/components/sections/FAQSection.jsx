import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SectionContainer from '../ui/SectionContainer';

const FAQSection = () => {
  const faqs = [
    {
      id: 1,
      question: 'What is Customate.ai?',
      answer:
        'Customate.ai is a multi-tenant chatbot platform that enables businesses to create, customize, and deploy AI-powered chatbots with industry-specific behaviors and custom knowledge bases. Our solution helps businesses provide better customer support, increase conversions, and save time through intelligent automation.',
    },
    {
      id: 2,
      question: 'How does the knowledge base work?',
      answer:
        'Our platform uses Retrieval-Augmented Generation (RAG) to provide accurate responses from your knowledge base. You can upload documents (PDFs, DOCs, etc.), FAQs, or product information, and our system will automatically extract, process, and vectorize the content. When a user asks a question, our AI searches your knowledge base for the most relevant information and generates a contextually appropriate response.',
    },
    {
      id: 3,
      question: 'Can I customize the chatbots appearance?',
      answer:
        'Yes! Customate.ai offers extensive white-labeling options. You can customize the chatbots colors, logo, greeting messages, fonts, and more to match your brand identity. You can also position the chat widget wherever you want on your website.',
    },
    {
      id: 4,
      question: 'What industries do you support?',
      answer:
        'Our platform supports multiple industries with specialized behavior patterns. Currently, we offer optimized settings for e-commerce, healthcare, SaaS, education, finance, and general business. Each industry configuration comes with pre-built intents, responses, and workflows tailored to common use cases in that sector.',
    },
    {
      id: 5,
      question: 'How do I add the chatbot to my website?',
      answer:
        'Adding the chatbot to your website is simple. After configuring your chatbot in our dashboard, you will receive a JavaScript snippet to copy and paste into your websites HTML. This typically goes just before the closing </body> tag. Once added, the chat widget will appear on your site within minutes.',
    },
    {
      id: 6,
      question: 'What languages does the chatbot support?',
      answer:
        'Our chatbot supports multiple languages including English, Spanish, French, German, Portuguese, Italian, Dutch, Chinese, Japanese, and Korean. You can configure different language models for different markets or have a single chatbot that can detect and respond in multiple languages.',
    },
    {
      id: 7,
      question: 'Is there a limit to the number of messages?',
      answer:
        'Yes, each pricing plan comes with a monthly message limit. The Free plan includes 500 messages per month, Basic includes 5,000, Professional includes 20,000, and Enterprise includes 100,000. If you need more messages, you can upgrade your plan or contact us for a custom solution.',
    },
    {
      id: 8,
      question: 'How secure is my data?',
      answer:
        'We take security very seriously. All data is encrypted both in transit and at rest. Our multi-tenant architecture ensures complete data isolation between clients. We comply with GDPR, CCPA, and other privacy regulations. Additionally, you maintain full ownership of your data, and we never use your data to train our AI models without explicit permission.',
    },
    {
      id: 9,
      question: 'Can I integrate with my existing tools?',
      answer:
        'Yes, Customate.ai offers integrations with popular CRM systems, helpdesk software, and other business tools. We provide APIs for custom integrations and webhooks for event-driven workflows. Our Professional and Enterprise plans include advanced integration options for seamless connection with your tech stack.',
    },
    {
      id: 10,
      question: 'What kind of analytics do you provide?',
      answer:
        'Our analytics dashboard provides comprehensive insights into your chatbots performance. You can track metrics like conversation volume, user satisfaction, common questions, resolution rates, and conversation duration. You can also identify trends, peak usage times, and opportunities for improvement.',
    },
  ];

  const [openIndex, setOpenIndex] = useState(null);

  const toggleFAQ = (index) => {
    if (openIndex === index) {
      setOpenIndex(null);
    } else {
      setOpenIndex(index);
    }
  };

  return (
    <SectionContainer background="white" id="faq" paddingY="py-16 md:py-20">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Everything you need to know about Customate.ai
          </p>
        </motion.div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 divide-y divide-gray-200">
        {faqs.map((faq, index) => (
          <div key={faq.id} className="py-5">
            <button
              onClick={() => toggleFAQ(index)}
              className="flex justify-between items-center w-full text-left focus:outline-none group"
            >
              <h3 className="text-lg font-medium text-gray-900 group-hover:text-primary-600 transition-colors duration-200">{faq.question}</h3>
              <span className="ml-6 flex-shrink-0">
                <svg
                  className={`h-6 w-6 text-primary-500 transform ${
                    openIndex === index ? 'rotate-180' : 'rotate-0'
                  } transition-transform duration-200 ease-in-out`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </span>
            </button>
            <AnimatePresence>
              {openIndex === index && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-hidden"
                >
                  <p className="mt-4 text-base text-gray-600">{faq.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>

      <div className="mt-12 text-center">
        <p className="text-base text-gray-600">
          Still have questions?{' '}
          <a href="/contact" className="font-medium text-primary-600 hover:text-primary-500 transition-colors duration-200">
            Contact our support team
          </a>
        </p>
      </div>
    </SectionContainer>
  );
};

export default FAQSection;