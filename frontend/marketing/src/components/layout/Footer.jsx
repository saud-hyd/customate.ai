import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t, i18n } = useTranslation('common');
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
      
      // Check if we're on the homepage
      if (window.location.pathname !== '/') {
        window.location.href = href;
      } else {
        scrollToSection(sectionId);
      }
    }
  };

  return (
    <footer className="bg-gradient-to-br from-gray-50 via-white to-gray-50 border-t border-gray-200">
      <div className="max-w-7xl mx-auto px-6 py-16">
        
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 mb-12">
          
          {/* Company Info */}
          <div className="lg:col-span-1">
            <div className="flex items-center mb-6">
              {/* Header Logo */}
              <div className="relative mr-3">
                <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
                  </svg>
                </div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                Customate.ai
              </span>
            </div>
            
            <p className="text-gray-700 mb-6 leading-relaxed">
              {t('footer.description')}
            </p>
            
            {/* Social Links */}
            <div className="flex space-x-4">
              <a 
                href="https://twitter.com" 
                className="w-10 h-10 bg-gray-200 hover:bg-orange-500 rounded-full flex items-center justify-center transition-all duration-200 group"
                aria-label="Twitter"
              >
                <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
                </svg>
              </a>
              <a 
                href="https://linkedin.com" 
                className="w-10 h-10 bg-gray-200 hover:bg-orange-500 rounded-full flex items-center justify-center transition-all duration-200 group"
                aria-label="LinkedIn"
              >
                <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition-colors" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </a>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Product Column */}
            <div>
              <h4 className="font-bold text-gray-900 text-lg mb-6 uppercase tracking-wider">
                {t('footer.product.title')}
              </h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="/"
                    onClick={(e) => handleNavClick('/#hero', e)}
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('header.features')}
                  </a>
                </li>
                <li>
                  <a
                    href="/pricing"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('header.pricing')}
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.product.useCases')}
                  </a>
                </li>
                <li>
                  <a
                    href="/blog"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.product.roadmap')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources Column */}
            <div>
              <h4 className="font-bold text-gray-900 text-lg mb-6 uppercase tracking-wider">
                {t('footer.resources.title')}
              </h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="/blog"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('header.blog')}
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.resources.documentation')}
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.resources.apiReference')}
                  </a>
                </li>
              </ul>
            </div>

            {/* Company Column */}
            <div>
              <h4 className="font-bold text-gray-900 text-lg mb-6 uppercase tracking-wider">
                {t('footer.company.title')}
              </h4>
              <ul className="space-y-4">
                <li>
                  <a
                    href="/about"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.company.about')}
                  </a>
                </li>
                <li>
                  <a
                    href="/contact"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('header.contact')}
                  </a>
                </li>
                <li>
                  <a
                    href="/terms"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.terms')}
                  </a>
                </li>
                <li>
                  <a
                    href="/privacy"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.privacy')}
                  </a>
                </li>
                <li>
                  <a
                    href="/cookies"
                    className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:translate-x-1 inline-block"
                  >
                    {t('footer.cookies')}
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Bottom Bar */}
        <div className="border-t border-gray-200 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-600 font-medium">
              {t('footer.rights', { year: currentYear })}
            </p>
            
            <div className="flex items-center space-x-8 text-gray-600">
              <span className="flex items-center font-medium">
                <span className="relative mr-3">
                  <span className="w-2 h-2 bg-green-500 rounded-full block"></span>
                  <span className="absolute inset-0 w-2 h-2 bg-green-400 rounded-full animate-ping"></span>
                </span>
                {t('ui:status.online')}
              </span>
              <span className="font-medium">🇩🇪 Made in Germany</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;