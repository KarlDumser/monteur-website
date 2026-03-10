import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import deTranslations from './locales/de.json';
import plTranslations from './locales/pl.json';
import roTranslations from './locales/ro.json';
import huTranslations from './locales/hu.json';
import skTranslations from './locales/sk.json';
import csTranslations from './locales/cs.json';
import bgTranslations from './locales/bg.json';

// Detect user language or use default
const getInitialLanguage = () => {
  // Check localStorage first
  const stored = localStorage.getItem('language');
  if (stored) return stored;

  // Try browser language
  const browserLang = navigator.language.split('-')[0];
  const supportedLangs = ['de', 'pl', 'ro', 'hu', 'sk', 'cs', 'bg'];
  
  if (supportedLangs.includes(browserLang)) {
    return browserLang;
  }

  return 'de'; // Default to German
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      de: { translation: deTranslations },
      pl: { translation: plTranslations },
      ro: { translation: roTranslations },
      hu: { translation: huTranslations },
      sk: { translation: skTranslations },
      cs: { translation: csTranslations },
      bg: { translation: bgTranslations },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'de',
    ns: ['translation'],
    defaultNS: 'translation',
    interpolation: {
      escapeValue: false, // React is already safe from xss
    },
  });

export default i18n;
