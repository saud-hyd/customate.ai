import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Footer = () => {
  const location = useLocation();
  const currentYear = new Date().getFullYear();

  // Function to handle smooth scrolling to sections
  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerOffset = 80;
      const elementPosition = element.offsetTop;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  // Function to handle navigation clicks
  const handleNavClick = (href, e) => {
    if (href.startsWith('/#')) {
      e.preventDefault();
      const sectionId = href.replace('/#', '');
      
      if (location.pathname !== '/') {
        window.location.href = href;
      } else {
        scrollToSection(sectionId);
      }
    }
  };

  return (
    <footer className="bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-8">
          
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-3">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <h3 className="text-xl font-bold text-gray-900">Customate.ai</h3>
            </div>
            
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              AI-powered chatbots for businesses. Build intelligent customer support with industry-specific behaviors and custom knowledge bases.
            </p>
          </div>
          
          {/* Navigation Links - Two Clean Columns */}
          <div className="lg:col-span-2 grid grid-cols-2 gap-8">
            
            {/* Product & Resources */}
            <div>
              <h4 className="font-semibold text-orange-500 mb-4">Product</h4>
              <ul className="space-y-3">
                <li>
                  <button
                    onClick={(e) => handleNavClick('/#features', e)}
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <Link
                    to="/pricing"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Blog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/contact"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company & Legal */}
            <div>
              <h4 className="font-semibold text-orange-500 mb-4">Company</h4>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/about"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    About Us
                  </Link>
                </li>
                <li>
                  <Link
                    to="/terms"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Terms of Service
                  </Link>
                </li>
                <li>
                  <Link
                    to="/privacy"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link
                    to="/cookies"
                    className="text-gray-600 hover:text-orange-600 text-sm transition-colors"
                  >
                    Cookie Policy
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-100 pt-6 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-500 text-sm mb-4 md:mb-0">
            © {currentYear} Customated S&A UG. All rights reserved.
          </p>
          
          <div className="flex items-center space-x-6 text-sm text-gray-500">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
              System Online
            </span>
            <span>Made in Germany 🇩🇪</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;