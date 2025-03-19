import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import SectionContainer from '../ui/SectionContainer';
import Button from '../ui/Button';
import { motion } from 'framer-motion';

const PricingSection = () => {
  const [isAnnual, setIsAnnual] = useState(true);

  const plans = [
    {
      name: 'Free',
      description: 'Perfect for trying out Customate.ai',
      price: { monthly: '$0', annually: '$0' },
      features: [
        '500 messages per month',
        '5 active users',
        '50 MB storage',
        '3 knowledge collections',
        'Basic chatbot customization',
        'Community support',
      ],
      cta: 'Start for Free',
      highlighted: false,
    },
    {
      name: 'Basic',
      description: 'For small businesses and startups',
      price: { monthly: '$39', annually: '$29' },
      features: [
        '5,000 messages per month',
        '25 active users',
        '500 MB storage',
        '10 knowledge collections',
        'Custom branding',
        'Email support',
        'Analytics dashboard',
        'API access',
      ],
      cta: 'Start with Basic',
      highlighted: true,
    },
    {
      name: 'Professional',
      description: 'For growing businesses with advanced needs',
      price: { monthly: '$129', annually: '$99' },
      features: [
        '20,000 messages per month',
        '100 active users',
        '2 GB storage',
        '50 knowledge collections',
        'Advanced chatbot customization',
        'Priority email support',
        'Advanced analytics',
        'Custom domain',
        'Team collaboration',
      ],
      cta: 'Start with Professional',
      highlighted: false,
    },
    {
      name: 'Enterprise',
      description: 'For organizations with complex requirements',
      price: { monthly: '$449', annually: '$349' },
      features: [
        '100,000 messages per month',
        '500 active users',
        '10 GB storage',
        '250 knowledge collections',
        'Custom deployment options',
        'Dedicated account manager',
        'Phone & email support',
        'SLA guarantees',
        'Advanced security features',
        'Custom integrations',
      ],
      cta: 'Contact Sales',
      highlighted: false,
    },
  ];

  return (
    <SectionContainer background="white" id="pricing">
      <div className="text-center mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 max-w-2xl text-xl text-gray-600 mx-auto">
            Choose the plan that's right for your business
          </p>
        </motion.div>

        {/* Billing toggle */}
        <div className="mt-12 flex justify-center">
          <div className="relative bg-gray-100 rounded-lg p-1 flex">
            <button
              type="button"
              className={`${
                !isAnnual
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent'
              } relative py-2 px-6 rounded-md text-sm font-medium focus:outline-none transition-colors duration-200`}
              onClick={() => setIsAnnual(false)}
            >
              Monthly
            </button>
            <button
              type="button"
              className={`${
                isAnnual
                  ? 'bg-white shadow-sm'
                  : 'bg-transparent'
              } relative py-2 px-6 rounded-md text-sm font-medium focus:outline-none transition-colors duration-200`}
              onClick={() => setIsAnnual(true)}
            >
              Annual <span className="text-primary-600 font-bold">(Save 20%)</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4 lg:gap-8">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className={`flex flex-col rounded-lg shadow-sm overflow-hidden ${
              plan.highlighted
                ? 'border-2 border-primary-500 relative'
                : 'border border-gray-200'
            }`}
          >
            {plan.highlighted && (
              <div className="absolute top-0 right-0 -mt-3 -mr-3 px-4 py-1 bg-primary-500 text-white text-xs font-semibold rounded-full shadow-lg">
                Popular
              </div>
            )}
            <div className={`px-6 py-8 ${plan.highlighted ? 'bg-primary-50' : 'bg-white'}`}>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-2 text-gray-600">{plan.description}</p>
                <p className="mt-6">
                  <span className="text-5xl font-extrabold text-gray-900">
                    {isAnnual ? plan.price.annually : plan.price.monthly}
                  </span>
                  <span className="text-base font-medium text-gray-500">
                    {plan.name === 'Free' ? '' : '/month'}
                  </span>
                </p>
                {isAnnual && plan.name !== 'Free' && (
                  <p className="mt-1 text-sm text-primary-600">Billed annually</p>
                )}
              </div>
            </div>
            <div className="flex-1 flex flex-col justify-between px-6 pt-6 pb-8 bg-white">
              <div>
                <ul className="space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <svg
                        className="h-5 w-5 text-green-500 mt-1 flex-shrink-0"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-8">
                {plan.name === 'Free' ? (
                  <Button
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    size="lg"
                    fullWidth
                    as="a"
                    href="https://app.customate.ai/register"
                  >
                    {plan.cta}
                  </Button>
                ) : plan.name === 'Enterprise' ? (
                  <Button
                    variant={plan.highlighted ? 'primary' : 'outline'}
                    size="lg"
                    fullWidth
                    as={Link}
                    to="/contact"
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
                  >
                    {plan.cta}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-16 text-center">
        <p className="text-base text-gray-600">
          Looking for a custom plan? <a href="/contact" className="text-primary-600 font-medium">Contact us</a> for a tailored solution.
        </p>
      </div>
    </SectionContainer>
  );
};

export default PricingSection;