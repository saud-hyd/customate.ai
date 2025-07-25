import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-200 py-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <div className="text-sm text-gray-500">
            &copy; {new Date().getFullYear()} Customate.ai. All rights reserved.
          </div>
          <div className="text-sm text-gray-500">
            <a href="#" className="text-primary-600 hover:text-primary-800">Help</a>
            <span className="mx-2">|</span>
            <a href="#" className="text-primary-600 hover:text-primary-800">Privacy</a>
            <span className="mx-2">|</span>
            <a href="#" className="text-primary-600 hover:text-primary-800">Terms</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;