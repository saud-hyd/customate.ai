import React, { createContext, useState, useEffect, useContext } from 'react';
import { useTranslation } from 'react-i18next';

const LanguageContext = createContext();

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }) => {
  const { i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language || 'en');
  
  // Available languages for dashboard
  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
    { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' }
  ];
  
  // Change language function
  const changeLanguage = async (languageCode) => {
    try {
      await i18n.changeLanguage(languageCode);
      setCurrentLanguage(languageCode);
      localStorage.setItem('i18nextLng', languageCode);
      
      // Update HTML lang attribute for accessibility
      document.documentElement.lang = languageCode;
      
      return true;
    } catch (error) {
      console.error('Error changing language:', error);
      return false;
    }
  };
  
  // Get current language details
  const getCurrentLanguage = () => {
    return languages.find(lang => lang.code === currentLanguage) || languages[0];
  };
  
  // Initialize language from local storage or browser
  useEffect(() => {
    const savedLanguage = localStorage.getItem('i18nextLng');
    if (savedLanguage && savedLanguage !== currentLanguage && languages.find(lang => lang.code === savedLanguage)) {
      changeLanguage(savedLanguage);
    }
  }, []);
  
  // Update current language when i18n language changes
  useEffect(() => {
    setCurrentLanguage(i18n.language);
  }, [i18n.language]);
  
  return (
    <LanguageContext.Provider value={{ 
      currentLanguage, 
      changeLanguage, 
      languages,
      getCurrentLanguage
    }}>
      {children}
    </LanguageContext.Provider>
  );
};