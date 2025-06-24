// src/components/sections/PricingSection.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SectionContainer from '../ui/SectionContainer';
import Button from '../ui/Button';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const PricingSection = () => {
  const { t } = useTranslation('pricing');
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: t('plans.free.name'),
      description: t('plans.free.description'),
      price: { monthly: '$0', annually: '$0' },
      features: t('plans.free.features', { returnObjects: true }),
      cta: t('plans.free.cta'),
      highlighted: false,
    },
    {
      name: t('plans.basic.name'),
      description: t('plans.basic.description'),
      price: { monthly: '$25', annually: '$19' },
      features: t('plans.basic.features', { returnObjects: true }),
      cta: t('plans.basic.cta'),
      highlighted: true,
    },
    {
      name: t('plans.standard.name'),
      description: t('plans.standard.description'),
      price: { monthly: '$75', annually: '$59' },
      features: t('plans.standard.features', { returnObjects: true }),
      cta: t('plans.standard.cta'),
      highlighted: false,
    },
    {
      name: t('plans.professional.name'),
      description: t('plans.professional.description'),
      price: { monthly: '$225', annually: '$199' },
      features: t('plans.professional.features', { returnObjects: true }),
      cta: t('plans.professional.cta'),
      highlighted: false,
    },
  ];

  return (
    <SectionContainer background="light" id="pricing" paddingY="py-10 md:py-16">
      <div className="text-center mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            {t('title')}
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            {t('subtitle')}
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="mt-10 flex justify-center">
          <div className="relative bg-gradient-to-r from-primary-50 to-primary-100 rounded-lg p-1 flex shadow-sm">
            <button
              type="button"
              className={`${
                !isAnnual
                  ? 'bg-white shadow-md'
                  : 'bg-transparent hover:bg-primary-100'
              } relative py-2 px-6 rounded-md text-sm font-medium focus:outline-none transition-colors duration-200`}
              onClick={() => setIsAnnual(false)}
            >
              {t('billing.monthly')}
            </button>
            <button
              type="button"
              className={`${
                isAnnual
                  ? 'bg-white shadow-md'
                  : 'bg-transparent hover:bg-primary-100'
              } relative py-2 px-6 rounded-md text-sm font-medium focus:outline-none transition-colors duration-200`}
              onClick={() => setIsAnnual(true)}
            >
              {t('billing.annual')} <span className="text-primary-600 font-bold">{t('billing.annualSave')}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`flex flex-col rounded-xl shadow-md overflow-hidden transform hover:-translate-y-1 transition-all duration-300 ${
                plan.highlighted
                  ? 'border-2 border-primary-500 relative z-10 scale-105'
                  : 'border border-gray-200'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 right-0 bg-primary-500 text-white px-4 py-1 text-xs font-bold uppercase tracking-wider transform translate-x-2 -translate-y-0 rotate-3 shadow-lg rounded-bl-xl rounded-tr-xl">
                  {t('badges.popular')}
                </div>
              )}
              <div className={`px-6 py-8 ${plan.highlighted ? 'bg-gradient-to-br from-primary-50 to-primary-100' : 'bg-white'}`}>
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <p className="mt-2 text-gray-600">{plan.description}</p>
                  <p className="mt-8">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {isAnnual ? plan.price.annually : plan.price.monthly}
                    </span>
                    <span className="text-base font-medium text-gray-500 ml-1">
                      {plan.name === t('plans.free.name') ? '' : '/month'}
                    </span>
                  </p>
                  {isAnnual && plan.price.annually !== '$0' && (
                    <p className="mt-1 text-sm text-primary-600 font-medium">{t('billedAnnually')}</p>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col justify-between px-6 pt-4 pb-8 bg-white">
                <div>
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start">
                        <div className="flex-shrink-0 w-5 h-5 bg-primary-100 rounded-full flex items-center justify-center">
                          <svg
                            className="h-3.5 w-3.5 text-primary-600"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                        <span className="ml-3 text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="mt-8">
                  {plan.name === t('plans.free.name') ? (
                    <Button
                      variant={plan.highlighted ? 'primary' : 'outline'}
                      size="lg"
                      fullWidth
                      as="a"
                      href="https://app.customate.ai/register"
                      className={`${plan.highlighted ? 'shadow-lg shadow-primary-200' : ''}`}
                    >
                      {plan.cta}
                    </Button>
                  ) : plan.name === t('plans.enterprise.name') ? (
                    <Button
                      variant={plan.highlighted ? 'primary' : 'outline'}
                      size="lg"
                      fullWidth
                      as={Link}
                      to="/contact"
                      className={`${plan.highlighted ? 'shadow-lg shadow-primary-200' : ''}`}
                    >
                      {plan.cta}
                    </Button>
                  ) : (
                    <Button
                      variant={plan.highlighted ? 'primary' : 'outline'}
                      size="lg"
                      fullWidth
                      as={Link}
                      to={`/checkout?plan=${plan.name.toLowerCase()}&billing=${isAnnual ? 'annual' : 'monthly'}`}
                      className={`${plan.highlighted ? 'shadow-lg shadow-primary-200' : ''}`}
                    >
                      {plan.cta}
                    </Button>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

    </SectionContainer>
  );
};

export default PricingSection;