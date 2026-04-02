import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';

import en from './en.json';
import ptBR from './pt-BR.json';

const resources = {
  en: { translation: en },
  'pt-BR': { translation: ptBR },
};

/**
 * Detect the best matching language from the device locale.
 * Falls back to 'en' if no match is found.
 */
function getDeviceLanguage(): string {
  try {
    const locales = getLocales();
    if (locales.length > 0) {
      const tag = locales[0].languageTag; // e.g. "pt-BR", "en-US"
      // Exact match first
      if (tag in resources) return tag;
      // Try language prefix (e.g. "pt" → "pt-BR", "en" → "en")
      const prefix = tag.split('-')[0];
      if (prefix === 'pt') return 'pt-BR';
      if (prefix === 'en') return 'en';
    }
  } catch {
    // Fallback silently
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false, // React already escapes
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
