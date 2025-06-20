// frontend/marketing/src/i18n/index.js
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files for all namespaces
import enCommon from './locales/en/common.json';
import enHome from './locales/en/home.json';
import enBenefits from './locales/en/benefits.json';
import enHowItWorks from './locales/en/howItWorks.json';
import enIntegrations from './locales/en/integrations.json';
import enPricing from './locales/en/pricing.json';
import enContact from './locales/en/contact.json';
import enDemo from './locales/en/demo.json';
import enUi from './locales/en/ui.json';
import enFaq from './locales/en/faq.json'; // ADD THIS

import esCommon from './locales/es/common.json';
import esHome from './locales/es/home.json';
import esBenefits from './locales/es/benefits.json';
import esHowItWorks from './locales/es/howItWorks.json';
import esIntegrations from './locales/es/integrations.json';
import esPricing from './locales/es/pricing.json';
import esContact from './locales/es/contact.json';
import esDemo from './locales/es/demo.json';
import esUi from './locales/es/ui.json';
import esFaq from './locales/es/faq.json'; // ADD THIS

import deCommon from './locales/de/common.json';
import deHome from './locales/de/home.json';
import deBenefits from './locales/de/benefits.json';
import deHowItWorks from './locales/de/howItWorks.json';
import deIntegrations from './locales/de/integrations.json';
import dePricing from './locales/de/pricing.json';
import deContact from './locales/de/contact.json';
import deDemo from './locales/de/demo.json';
import deUi from './locales/de/ui.json';
import deFaq from './locales/de/faq.json'; // ADD THIS

import frCommon from './locales/fr/common.json';
import frHome from './locales/fr/home.json';
import frBenefits from './locales/fr/benefits.json';
import frHowItWorks from './locales/fr/howItWorks.json';
import frIntegrations from './locales/fr/integrations.json';
import frPricing from './locales/fr/pricing.json';
import frContact from './locales/fr/contact.json';
import frDemo from './locales/fr/demo.json';
import frUi from './locales/fr/ui.json';
import frFaq from './locales/fr/faq.json'; // ADD THIS

import zhCommon from './locales/zh/common.json';
import zhHome from './locales/zh/home.json';
import zhBenefits from './locales/zh/benefits.json';
import zhHowItWorks from './locales/zh/howItWorks.json';
import zhIntegrations from './locales/zh/integrations.json';
import zhPricing from './locales/zh/pricing.json';
import zhContact from './locales/zh/contact.json';
import zhDemo from './locales/zh/demo.json';
import zhUi from './locales/zh/ui.json';
import zhFaq from './locales/zh/faq.json'; // ADD THIS

import noCommon from './locales/no/common.json';
import noHome from './locales/no/home.json';
import noBenefits from './locales/no/benefits.json';
import noHowItWorks from './locales/no/howItWorks.json';
import noIntegrations from './locales/no/integrations.json';
import noPricing from './locales/no/pricing.json';
import noContact from './locales/no/contact.json';
import noDemo from './locales/no/demo.json';
import noUi from './locales/no/ui.json';
import noFaq from './locales/no/faq.json'; // ADD THIS

const resources = {
  en: {
    common: enCommon,
    home: enHome,
    benefits: enBenefits,
    howItWorks: enHowItWorks,
    integrations: enIntegrations,
    pricing: enPricing,
    contact: enContact,
    demo: enDemo,
    ui: enUi,
    faq: enFaq // ADD THIS
  },
  es: {
    common: esCommon,
    home: esHome,
    benefits: esBenefits,
    howItWorks: esHowItWorks,
    integrations: esIntegrations,
    pricing: esPricing,
    contact: esContact,
    demo: esDemo,
    ui: esUi,
    faq: esFaq // ADD THIS
  },
  de: {
    common: deCommon,
    home: deHome,
    benefits: deBenefits,
    howItWorks: deHowItWorks,
    integrations: deIntegrations,
    pricing: dePricing,
    contact: deContact,
    demo: deDemo,
    ui: deUi,
    faq: deFaq // ADD THIS
  },
  fr: {
    common: frCommon,
    home: frHome,
    benefits: frBenefits,
    howItWorks: frHowItWorks,
    integrations: frIntegrations,
    pricing: frPricing,
    contact: frContact,
    demo: frDemo,
    ui: frUi,
    faq: frFaq // ADD THIS
  },
  zh: {
    common: zhCommon,
    home: zhHome,
    benefits: zhBenefits,
    howItWorks: zhHowItWorks,
    integrations: zhIntegrations,
    pricing: zhPricing,
    contact: zhContact,
    demo: zhDemo,
    ui: zhUi,
    faq: zhFaq // ADD THIS
  },
  no: {
    common: noCommon,
    home: noHome,
    benefits: noBenefits,
    howItWorks: noHowItWorks,
    integrations: noIntegrations,
    pricing: noPricing,
    contact: noContact,
    demo: noDemo,
    ui: noUi,
    faq: noFaq // ADD THIS
  }
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // ADD 'faq' TO THE NAMESPACES LIST
    ns: ['common', 'home', 'benefits', 'howItWorks', 'integrations', 'pricing', 'contact', 'demo', 'ui', 'faq'],
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