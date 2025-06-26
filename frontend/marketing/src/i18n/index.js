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
import enAbout from './locales/en/about.json';
import enFaq from './locales/en/faq.json'; // NEW: FAQ
import enUi from './locales/en/ui.json';

import esCommon from './locales/es/common.json';
import esHome from './locales/es/home.json';
import esBenefits from './locales/es/benefits.json';
import esHowItWorks from './locales/es/howItWorks.json';
import esIntegrations from './locales/es/integrations.json';
import esPricing from './locales/es/pricing.json';
import esContact from './locales/es/contact.json';
import esDemo from './locales/es/demo.json';
import esAbout from './locales/es/about.json';
import esFaq from './locales/es/faq.json'; // NEW: FAQ
import esUi from './locales/es/ui.json';

import deCommon from './locales/de/common.json';
import deHome from './locales/de/home.json';
import deBenefits from './locales/de/benefits.json';
import deHowItWorks from './locales/de/howItWorks.json';
import deIntegrations from './locales/de/integrations.json';
import dePricing from './locales/de/pricing.json';
import deContact from './locales/de/contact.json';
import deDemo from './locales/de/demo.json';
import deAbout from './locales/de/about.json';
import deFaq from './locales/de/faq.json'; // NEW: FAQ
import deUi from './locales/de/ui.json';

import frCommon from './locales/fr/common.json';
import frHome from './locales/fr/home.json';
import frBenefits from './locales/fr/benefits.json';
import frHowItWorks from './locales/fr/howItWorks.json';
import frIntegrations from './locales/fr/integrations.json';
import frPricing from './locales/fr/pricing.json';
import frContact from './locales/fr/contact.json';
import frDemo from './locales/fr/demo.json';
import frAbout from './locales/fr/about.json';
import frFaq from './locales/fr/faq.json'; // NEW: FAQ
import frUi from './locales/fr/ui.json';

import zhCommon from './locales/zh/common.json';
import zhHome from './locales/zh/home.json';
import zhBenefits from './locales/zh/benefits.json';
import zhHowItWorks from './locales/zh/howItWorks.json';
import zhIntegrations from './locales/zh/integrations.json';
import zhPricing from './locales/zh/pricing.json';
import zhContact from './locales/zh/contact.json';
import zhDemo from './locales/zh/demo.json';
import zhAbout from './locales/zh/about.json';
import zhFaq from './locales/zh/faq.json'; // NEW: FAQ
import zhUi from './locales/zh/ui.json';

import noCommon from './locales/no/common.json';
import noHome from './locales/no/home.json';
import noBenefits from './locales/no/benefits.json';
import noHowItWorks from './locales/no/howItWorks.json';
import noIntegrations from './locales/no/integrations.json';
import noPricing from './locales/no/pricing.json';
import noContact from './locales/no/contact.json';
import noDemo from './locales/no/demo.json';
import noAbout from './locales/no/about.json';
import noFaq from './locales/no/faq.json'; // NEW: FAQ
import noUi from './locales/no/ui.json';

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
    about: enAbout,
    faq: enFaq, // NEW: FAQ
    ui: enUi
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
    about: esAbout,
    faq: esFaq, // NEW: FAQ
    ui: esUi
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
    about: deAbout,
    faq: deFaq, // NEW: FAQ
    ui: deUi
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
    about: frAbout,
    faq: frFaq, // NEW: FAQ
    ui: frUi
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
    about: zhAbout,
    faq: zhFaq, // NEW: FAQ
    ui: zhUi
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
    about: noAbout,
    faq: noFaq, // NEW: FAQ
    ui: noUi
  }
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en',
    debug: process.env.NODE_ENV === 'development',
    
    // UPDATED: Include 'faq' in namespaces
    ns: ['common', 'home', 'benefits', 'howItWorks', 'integrations', 'pricing', 'contact', 'demo', 'about', 'faq', 'ui'],
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