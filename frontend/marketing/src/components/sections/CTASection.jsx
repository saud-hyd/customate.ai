import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Button from '../ui/Button';
import SectionContainer from '../ui/SectionContainer';

const CTASection = () => {
  return (
    <SectionContainer background="primary" paddingY="py-12 md:py-16">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-3xl mx-auto text-center"
      >
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          Ready to transform your customer conversations?
        </h2>
        <p className="mt-4 text-xl text-primary-100">
          Get started with Customate.ai today and see the difference intelligent chatbots can make for your business.
        </p>
        <div className="mt-8 flex justify-center">
          <div className="inline-flex rounded-md shadow">
            <Button
              as={Link}
              to="https://app.customate.ai/register"
              variant="secondary"
              size="lg"
              className="bg-white text-primary-600 hover:bg-gray-50"
            >
              Start Free Trial
            </Button>
          </div>
          <div className="ml-4 inline-flex">
            <Button
              as={Link}
              to="/demo"
              variant="outline"
              size="lg"
              className="border-white text-white hover:bg-primary-500"
            >
              Request Demo
            </Button>
          </div>
        </div>
        <p className="mt-4 text-sm text-primary-200">
          No credit card required · Free for 14 days · Cancel anytime
        </p>
      </motion.div>
    </SectionContainer>
  );
};

export default CTASection;