import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files for all namespaces
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enDashboard from './locales/en/dashboard.json';
import enSettings from './locales/en/settings.json';
import enChat from './locales/en/chat.json';
import enKnowledge from './locales/en/knowledge.json';
import enAnalytics from './locales/en/analytics.json';
import enIntegrations from './locales/en/integrations.json';
import enSubscription from './locales/en/subscription.json';
import enChannels from './locales/en/channels.json';
import enWidget from './locales/en/widget.json';

import esCommon from './locales/es/common.json';
import esAuth from './locales/es/auth.json';
import esDashboard from './locales/es/dashboard.json';
import esSettings from './locales/es/settings.json';
import esChat from './locales/es/chat.json';
import esKnowledge from './locales/es/knowledge.json';
import esAnalytics from './locales/es/analytics.json';
import esIntegrations from './locales/es/integrations.json';
import esSubscription from './locales/es/subscription.json';
import esChannels from './locales/es/channels.json';
import esWidget from './locales/es/widget.json';

import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import deDashboard from './locales/de/dashboard.json';
import deSettings from './locales/de/settings.json';
import deChat from './locales/de/chat.json';
import deKnowledge from './locales/de/knowledge.json';
import deAnalytics from './locales/de/analytics.json';
import deIntegrations from './locales/de/integrations.json';
import deSubscription from './locales/de/subscription.json';
import deChannels from './locales/de/channels.json';
import deWidget from './locales/de/widget.json';

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
    dashboard: enDashboard,
    settings: enSettings,
    chat: enChat,
    knowledge: enKnowledge,
    analytics: enAnalytics,
    integrations: enIntegrations,
    subscription: enSubscription,
    channels: enChannels,
    widget: enWidget
  },
  es: {
    common: esCommon,
    auth: esAuth,
    dashboard: esDashboard,
    settings: esSettings,
    chat: esChat,
    knowledge: esKnowledge,
    analytics: esAnalytics,
    integrations: esIntegrations,
    subscription: esSubscription,
    channels: esChannels,
    widget: esWidget
  },
  de: {
    common: deCommon,
    auth: deAuth,
    dashboard: deDashboard,
    settings: deSettings,
    chat: deChat,
    knowledge: deKnowledge,
    analytics: deAnalytics,
    integrations: deIntegrations,
    subscription: deSubscription,
    channels: deChannels,
    widget: deWidget
  }
};

i18n
  .use(initReactI18next)
  .use(LanguageDetector)
  .init({
    resources,
    fallbackLng: 'en',
    debug: false,
    
    ns: ['common', 'auth', 'dashboard', 'settings', 'chat', 'knowledge', 'analytics', 'integrations', 'subscription', 'channels', 'widget'],
    defaultNS: 'common',
    
    interpolation: {
      escapeValue: false
    },
    
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage']
    },

    react: {
      useSuspense: false
    }
  });

export default i18n;