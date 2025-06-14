import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../ui/Button';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isLangOpen, setIsLangOpen] = React.useState(false);
  const { t, i18n } = useTranslation();
  const location = useLocation();

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Language options with flags
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴' }

  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setIsLangOpen(false);
  };

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

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
    setIsMenuOpen(false);
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

  // Language/Globe Icon Component
  const LanguageIcon = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-white/95 shadow-lg border-b border-gray-100' 
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
{/* Logo Section */}
<Link to="/" className="flex items-center space-x-3 group">
  <div className="relative">
    <div className="w-10 h-10 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-orange-200 transition-all duration-300 group-hover:scale-105">
      {/* Add your chosen logo SVG here */}
<svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
  <path d="M12 1c-4.97 0-9 4.03-9 9v7c0 1.66 1.34 3 3 3h3v-8H5v-2c0-3.87 3.13-7 7-7s7 3.13 7 7v2h-4v8h3c1.66 0 3-1.34 3-3v-7c0-4.97-4.03-9-9-9z"/>
  <circle cx="17" cy="6" r="1"/>
  <circle cx="19" cy="4" r="0.5"/>
  <circle cx="21" cy="6" r="0.5"/>
  <path d="M15 7l1-1 1 1-1 1z"/>
</svg>
    </div>
    {/* Removed blur class from this line */}
    <div className="absolute -inset-1 bg-gradient-to-r from-orange-600 to-orange-500 rounded-xl opacity-30 group-hover:opacity-60 transition-all duration-300"></div>
  </div>
  <span className="text-xl font-bold text-gray-900 group-hover:text-orange-600 transition-colors duration-300">
    Customate.ai
  </span>
</Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-1">
            {/* Navigation Links */}
            <nav className="flex items-center space-x-1">
              <button
                onClick={(e) => handleNavClick('/#features', e)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 relative group"
              >
                {t('header.features')}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-orange-600 transition-all duration-300 group-hover:w-8 transform -translate-x-1/2"></span>
              </button>
              <Link
                to="/pricing"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 relative group"
              >
                {t('header.pricing')}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-orange-600 transition-all duration-300 group-hover:w-8 transform -translate-x-1/2"></span>
              </Link> 
               <Link
                to="/blog"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 relative group"
              >
                {t('header.blog')}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-orange-600 transition-all duration-300 group-hover:w-8 transform -translate-x-1/2"></span>
              </Link>
              <Link
                to="/contact"
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200 relative group"
              >
                {t('header.contact')}
                <span className="absolute bottom-0 left-1/2 w-0 h-0.5 bg-orange-600 transition-all duration-300 group-hover:w-8 transform -translate-x-1/2"></span>
              </Link>
            </nav>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-300 mx-4"></div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm" 
                as={Link} 
                to="/login"
                className="text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium"
              >
                {t('header.login')}
              </Button>
              <Button 
                variant="primary" 
                size="sm" 
                as={Link} 
                to="/register"
                className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-lg hover:shadow-orange-200 font-medium"
              >
                {t('header.signup')}
              </Button>
            </div>

            {/* Divider */}
            <div className="w-px h-6 bg-gray-300 mx-4"></div>

            {/* Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all duration-200 bg-white shadow-sm group"
                aria-label="Select language"
              >
                <LanguageIcon className="w-5 h-5 text-gray-600 group-hover:text-orange-600 transition-colors duration-200" />
                <span className="text-sm font-medium text-gray-700 hidden xl:block group-hover:text-orange-600 transition-colors duration-200">
                  {currentLanguage.code.toUpperCase()}
                </span>
                <svg
                  className={`w-4 h-4 text-gray-500 group-hover:text-orange-600 transition-all duration-200 ${
                    isLangOpen ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Language Dropdown */}
              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50"
                  >
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => changeLanguage(language.code)}
                        className={`w-full flex items-center space-x-3 px-4 py-3 text-sm hover:bg-orange-50 transition-colors duration-150 ${
                          currentLanguage.code === language.code
                            ? 'bg-orange-50 text-orange-700 font-medium'
                            : 'text-gray-700'
                        }`}
                      >
                        <span className="text-lg">{language.flag}</span>
                        <span className="flex-grow text-left">{language.name}</span>
                        {currentLanguage.code === language.code && (
                          <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Mobile menu button and language selector */}
          <div className="lg:hidden flex items-center space-x-3">
            {/* Mobile Language Selector */}
            <div className="relative">
              <button
                onClick={() => setIsLangOpen(!isLangOpen)}
                className="flex items-center space-x-1 px-2 py-1 rounded-lg border border-gray-200 hover:border-orange-300 bg-white shadow-sm"
              >
                <LanguageIcon className="w-4 h-4 text-gray-600" />
                <svg className={`w-3 h-3 text-gray-500 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <AnimatePresence>
                {isLangOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                    className="absolute top-full right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-50"
                  >
                    {languages.map((language) => (
                      <button
                        key={language.code}
                        onClick={() => changeLanguage(language.code)}
                        className="w-full flex items-center space-x-2 px-3 py-2 text-sm hover:bg-orange-50"
                      >
                        <span>{language.flag}</span>
                        <span className="text-xs">{language.name}</span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-lg text-gray-700 hover:text-orange-600 hover:bg-orange-50 focus:outline-none transition-colors duration-200"
              aria-expanded={isMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              <motion.div
                animate={{ rotate: isMenuOpen ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isMenuOpen ? (
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                ) : (
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                )}
              </motion.div>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="lg:hidden border-t border-gray-200 bg-white/95 backdrop-blur-lg shadow-lg"
          >
            <div className="px-4 py-6 space-y-4">
              {/* Mobile Navigation Links */}
              <div className="space-y-2">
                <button
                  onClick={(e) => handleNavClick('/#features', e)}
                  className="block w-full text-left px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                >
                  {t('header.features')}
                </button>
                <Link
                  to="/pricing"
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.pricing')}
                </Link>
                <Link
                  to="/blog"
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.blog')}
                </Link>
                <Link
                  to="/contact"
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.contact')}
                </Link>
              </div>

              {/* Mobile Action Buttons */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <Button 
                  variant="outline" 
                  size="md" 
                  fullWidth 
                  as={Link} 
                  to="/login"
                  className="text-gray-700 border-gray-300 hover:border-orange-600 hover:text-orange-600"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.login')}
                </Button>
                <Button 
                  variant="primary" 
                  size="md" 
                  fullWidth 
                  as={Link} 
                  to="/register"
                  className="bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 text-white shadow-lg"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {t('header.signup')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close language dropdown */}
      {isLangOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsLangOpen(false)}
        />
      )}
    </header>
  );
};

export default Header;