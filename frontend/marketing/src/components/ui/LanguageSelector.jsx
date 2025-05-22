import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

const LanguageSelector = ({ className = '', mobile = false }) => {
  const { currentLanguage, changeLanguage, languages } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  
  const currentLang = languages.find(lang => lang.code === currentLanguage);
  
  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [dropdownRef]);
  
  const handleLanguageChange = (code) => {
    changeLanguage(code);
    setIsOpen(false);
  };
  
  // Mobile version
  if (mobile) {
    return (
      <div className="py-2 px-4">
        <div className="text-sm font-medium text-gray-700 mb-2">Language</div>
        <div className="grid grid-cols-1 gap-1">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`flex items-center px-3 py-2 text-sm rounded-md ${
                currentLanguage === language.code
                ? 'bg-orange-100 text-orange-600' 
                : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{language.flag}</span>
              {language.name}
              {currentLanguage === language.code && (
                <svg className="ml-auto h-4 w-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  }
  
  // Desktop version
  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center text-sm font-medium text-gray-700 hover:text-orange-600 transition-colors"
      >
        <span className="mr-1">{currentLang?.flag}</span>
        <span className="hidden sm:inline">{currentLang?.code.toUpperCase()}</span>
        <svg className="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
          {languages.map((language) => (
            <button
              key={language.code}
              onClick={() => handleLanguageChange(language.code)}
              className={`block w-full text-left px-4 py-2 text-sm ${
                currentLanguage === language.code
                ? 'bg-orange-50 text-orange-600' 
                : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="flex items-center">
                <span className="mr-2">{language.flag}</span>
                {language.name}
                {currentLanguage === language.code && (
                  <svg className="ml-auto h-4 w-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;