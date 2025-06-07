import React, { createContext, useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  
  // Available languages - UPDATED with Norwegian
  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'zh', name: '中文', flag: '🇨🇳' },
    { code: 'no', name: 'Norsk', flag: '🇳🇴' } // NEW: Norwegian
  ];
  
  // Change language
  const changeLanguage = (languageCode) => {
    i18n.changeLanguage(languageCode);
    setCurrentLanguage(languageCode);
    localStorage.setItem('i18nextLng', languageCode);
    
    // Update HTML lang attribute for SEO
    document.documentElement.lang = languageCode;
  };
  
  // Initialize language from local storage or browser
  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && savedLanguage !== currentLanguage) {
      changeLanguage(savedLanguage);
    }
  }, []);
  
  return (
    <LanguageContext.Provider value={{ 
      currentLanguage, 
      changeLanguage, 
      languages,
      getCurrentLanguageName: () => languages.find(lang => lang.code === currentLanguage)?.name
    }}>
      {children}
    </LanguageContext.Provider>
  );
};