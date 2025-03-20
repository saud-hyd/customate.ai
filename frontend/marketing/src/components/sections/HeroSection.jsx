import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../ui/Button';
import { motion } from 'framer-motion';

const HeroSection = () => {
  return (
    <div className="relative bg-white overflow-hidden">
      {/* Background decorative elements */}
      <div className="hidden lg:block lg:absolute lg:inset-0">
        <svg
          className="absolute right-0 top-0 transform translate-x-64 translate-y-8"
          width="640"
          height="784"
          fill="none"
          viewBox="0 0 640 784"
        >
          <defs>
            <pattern
              id="9ebea6f4-a1f5-4d96-8c4e-4c2abf658047"
              x="118"
              y="0"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <rect x="0" y="0" width="4" height="4" className="text-primary-100" fill="currentColor" />
            </pattern>
          </defs>
          <rect
            y="72"
            width="640"
            height="640"
            className="text-primary-50"
            fill="currentColor"
          />
          <rect
            x="118"
            width="404"
            height="784"
            fill="url(#9ebea6f4-a1f5-4d96-8c4e-4c2abf658047)"
          />
        </svg>
      </div>

      <div className="relative pt-6 pb-16 md:pb-20 lg:pb-24 xl:pb-32">
        <main className="mt-8 mx-auto max-w-screen-xl px-4 sm:mt-12 sm:px-6 md:mt-20 xl:mt-24">
          <div className="lg:grid lg:grid-cols-12 lg:gap-8">
            <motion.div
              className="sm:text-center md:max-w-2xl md:mx-auto lg:col-span-6 lg:text-left"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-4xl tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                <span className="block">Build AI chatbots</span>
                <span className="block text-primary-600">tailored to your business</span>
              </h1>
              <p className="mt-3 text-base text-gray-600 sm:mt-5 sm:text-xl lg:text-lg xl:text-xl">
                Customate.ai helps businesses create, customize, and deploy AI-powered chatbots with industry-specific behaviors and knowledge bases. Enhance customer support, increase conversions, and save time with intelligent automation.
              </p>
              <div className="mt-8 sm:mt-10 flex justify-start">
                <div className="rounded-md shadow">
                  <Button
                    as={Link}
                    to="http://localhost:3001/api/auth/register"
                    variant="primary"
                    size="lg"
                  >
                    Get Started for Free
                  </Button>
                </div>
                <div className="ml-3">
                  <Button
                    as={Link}
                    to="/features"
                    variant="outline"
                    size="lg"
                  >
                    Learn More
                  </Button>
                </div>
              </div>
              <div className="mt-6 sm:mt-8">
                <p className="text-sm text-gray-500">
                  No credit card required · Free plan available · Set up in minutes
                </p>
              </div>
            </motion.div>
            <motion.div
              className="mt-12 relative sm:max-w-lg sm:mx-auto lg:mt-0 lg:max-w-none lg:mx-0 lg:col-span-6 lg:flex lg:items-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="relative mx-auto w-full rounded-lg shadow-lg lg:max-w-md">
                <div className="relative block w-full bg-white rounded-lg overflow-hidden">
                  <img
                    className="w-full"
                    src="/images/chatbot-dashboard.png"
                    alt="Customate.ai dashboard preview"
                  />
                  <div className="absolute inset-0 w-full h-full flex items-center justify-center">
                    <Button
                      as="a"
                      href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      aria-label="Watch demo video"
                      className="flex items-center justify-center h-16 w-16 rounded-full bg-white shadow-md hover:shadow-lg transform transition-all duration-300 hover:scale-110"
                    >
                      <svg className="h-6 w-6 text-primary-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default HeroSection;