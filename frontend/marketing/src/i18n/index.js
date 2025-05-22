// i18n/index.js - Updated configuration
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend from 'i18next-http-backend';

// Import translation files for all namespaces
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enBenefits from './locales/en/benefits.json';
import enHowItWorks from './locales/en/howItWorks.json';
import enIntegrations from './locales/en/integrations.json';
import enPricing from './locales/en/pricing.json';
import enContact from './locales/en/contact.json';

import esCommon from './locales/es/common.json';
import esHome from './locales/es/home.json';
import esBenefits from './locales/es/benefits.json';
import esHowItWorks from './locales/es/howItWorks.json';
import esIntegrations from './locales/es/integrations.json';
import esPricing from './locales/es/pricing.json';
import esContact from './locales/es/contact.json';

import deCommon from './locales/de/common.json';
import deHome from './locales/de/home.json';
import deBenefits from './locales/de/benefits.json';
import deHowItWorks from './locales/de/howItWorks.json';
import deIntegrations from './locales/de/integrations.json';
import dePricing from './locales/de/pricing.json';
import deContact from './locales/de/contact.json';

import frCommon from './locales/fr/common.json';
import frHome from './locales/fr/home.json';
import frBenefits from './locales/fr/benefits.json';
import frHowItWorks from './locales/fr/howItWorks.json';
import frIntegrations from './locales/fr/integrations.json';
import frPricing from './locales/fr/pricing.json';
import frContact from './locales/fr/contact.json';

import zhCommon from './locales/zh/common.json';
import zhHome from './locales/zh/home.json';
import zhBenefits from './locales/zh/benefits.json';
import zhHowItWorks from './locales/zh/howItWorks.json';
import zhIntegrations from './locales/zh/integrations.json';
import zhPricing from './locales/zh/pricing.json';
import zhContact from './locales/zh/contact.json';

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    benefits: enBenefits,
    howItWorks: enHowItWorks,
    integrations: enIntegrations,
    pricing: enPricing,
    contact: enContact
  },
  es: {
    common: esCommon,
    home: esHome,
    benefits: esBenefits,
    howItWorks: esHowItWorks,
    integrations: esIntegrations,
    pricing: esPricing,
    contact: esContact
  },
  de: {
    common: deCommon,
    home: deHome,
    benefits: deBenefits,
    howItWorks: deHowItWorks,
    integrations: deIntegrations,
    pricing: dePricing,
    contact: deContact
  },
  fr: {
    common: frCommon,
    home: frHome,
    benefits: frBenefits,
    howItWorks: frHowItWorks,
    integrations: frIntegrations,
    pricing: frPricing,
    contact: frContact
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    benefits: zhBenefits,
    howItWorks: zhHowItWorks,
    integrations: zhIntegrations,
    pricing: zhPricing,
    contact: zhContact
  }
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .use(Backend)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    ns: ['common', 'home', 'benefits', 'howItWorks', 'integrations', 'pricing', 'contact'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;