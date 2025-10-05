import React from 'react';

const ComingSoonPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center px-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Logo/Brand Section */}
        <div className="mb-8">
          <h1 className="text-6xl md:text-7xl font-bold text-white mb-4">
            Customate<span className="text-orange-500">.ai</span>
          </h1>
        </div>

        {/* Main Message */}
        <div className="space-y-6">
          <h2 className="text-3xl md:text-4xl font-semibold text-gray-100">
            We'll Be Right Back
          </h2>

          <p className="text-xl text-gray-400 max-w-lg mx-auto">
            We're currently making some improvements to bring you an even better experience.
          </p>

          {/* Animated dots */}
          <div className="flex justify-center space-x-2 pt-4">
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-3 h-3 bg-orange-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="mt-12 pt-8 border-t border-gray-700">
          <p className="text-gray-500 text-sm">
            For inquiries, please contact us at{' '}
            <a
              href="mailto:info@customate.ai"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              info@customate.ai
            </a>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8">
          <p className="text-gray-600 text-xs">
            &copy; {new Date().getFullYear()} Customate.ai. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ComingSoonPage;
