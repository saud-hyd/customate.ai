import React from 'react';
import { motion } from 'framer-motion';
import SectionContainer from '../ui/SectionContainer';

const ClientsSection = () => {
  const clients = [
    {
      name: 'TechCorp',
      logo: '/images/clients/techcorp.svg',
      industry: 'Technology'
    },
    {
      name: 'HealthFirst',
      logo: '/images/clients/healthfirst.svg',
      industry: 'Healthcare'
    },
    {
      name: 'EduLearn',
      logo: '/images/clients/edulearn.svg',
      industry: 'Education'
    },
    {
      name: 'ShopEasy',
      logo: '/images/clients/shopeasy.svg',
      industry: 'E-commerce'
    },
    {
      name: 'FinanceHub',
      logo: '/images/clients/financehub.svg',
      industry: 'Finance'
    },
    {
      name: 'TravelWise',
      logo: '/images/clients/travelwise.svg',
      industry: 'Travel'
    },
    {
      name: 'MediaPro',
      logo: '/images/clients/mediapro.svg',
      industry: 'Media'
    },
    {
      name: 'GreenEnergy',
      logo: '/images/clients/greenenergy.svg',
      industry: 'Energy'
    }
  ];

  return (
    <SectionContainer background="white" paddingY="py-12 md:py-16">
      <div className="text-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-2xl font-bold text-gray-900">
            Trusted by innovative companies across industries
          </h2>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="grid grid-cols-2 gap-8 md:grid-cols-4"
      >
        {clients.map((client, index) => (
          <div
            key={index}
            className="flex items-center justify-center col-span-1 px-8 py-8"
          >
            {client.logo ? (
              <img
                src={client.logo}
                alt={client.name}
                className="max-h-12 filter grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all duration-200"
              />
            ) : (
              <div className="text-xl font-semibold text-gray-400 hover:text-primary-600 transition-colors duration-200">
                {client.name}
              </div>
            )}
          </div>
        ))}
      </motion.div>

      <div className="mt-12 text-center">
        <p className="text-sm text-gray-500">
          Join hundreds of companies already using Customate.ai to enhance their customer experience
        </p>
      </div>
    </SectionContainer>
  );
};

export default ClientsSection;