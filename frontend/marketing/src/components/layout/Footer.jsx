import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation(['common', 'ui']);
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
              {t('footer.description')}
            </p>
          </div>
          
          {/* Navigation Links */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              
              {/* Product Column */}
              <div>
                <h4 className="text-gray-900 font-semibold mb-4 uppercase tracking-wider text-sm">
                  {t('footer.product.title')}
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link 
                      to="/features" 
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('header.features')}
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/pricing" 
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('header.pricing')}
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="/#use-cases" 
                      onClick={(e) => handleNavClick('/#use-cases', e)}
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm cursor-pointer"
                    >
                      {t('footer.product.useCases')}
                    </a>
                  </li>
                  <li>
                    <a 
                      href="/#roadmap" 
                      onClick={(e) => handleNavClick('/#roadmap', e)}
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm cursor-pointer"
                    >
                      {t('footer.product.roadmap')}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources Column */}
              <div>
                <h4 className="text-gray-900 font-semibold mb-4 uppercase tracking-wider text-sm">
                  {t('footer.resources.title')}
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link 
                      to="/blog" 
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('header.blog')}
                    </Link>
                  </li>
                  <li>
                    <a 
                      href="https://docs.customate.ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('footer.resources.documentation')}
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://api.customate.ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('footer.resources.apiReference')}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Company Column */}
              <div>
                <h4 className="text-gray-900 font-semibold mb-4 uppercase tracking-wider text-sm">
                  {t('footer.company.title')}
                </h4>
                <ul className="space-y-3">
                  <li>
                    <Link 
                      to="/contact" 
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('header.contact')}
                    </Link>
                  </li>
                  <li>
                    <Link 
                      to="/about" 
                      className="text-gray-600 hover:text-orange-500 transition-colors text-sm"
                    >
                      {t('footer.company.about')}
                    </Link>
                  </li>
                </ul>
              </div>
              
            </div>
          </div>
          
        </div>
        
        {/* Bottom Section */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-200 space-y-4 md:space-y-0">
          
          {/* Copyright */}
          <div className="flex items-center space-x-4">
            <p className="text-gray-500 text-sm">
              {t('footer.rights', { year: currentYear })}
            </p>
            <div className="flex items-center">
              <span className="inline-block w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              <span className="text-gray-500 text-sm">{t('ui:status.online')}</span>
            </div>
          </div>
          
          {/* Legal Links */}
          <div className="flex items-center space-x-6">
            <Link 
              to="/privacy" 
              className="text-gray-500 hover:text-orange-500 transition-colors text-sm"
            >
              {t('footer.privacy')}
            </Link>
            <Link 
              to="/terms" 
              className="text-gray-500 hover:text-orange-500 transition-colors text-sm"
            >
              {t('footer.terms')}
            </Link>
            <Link 
              to="/cookies" 
              className="text-gray-500 hover:text-orange-500 transition-colors text-sm"
            >
              {t('footer.cookies')}
            </Link>
          </div>
          
        </div>
        
      </div>
    </footer>
  );
};

export default Footer;