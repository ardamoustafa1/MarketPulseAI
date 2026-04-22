import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as SecureStore from 'expo-secure-store';

import en from './locales/en.json';
import tr from './locales/tr.json';

const LANGUAGE_KEY = 'app_language';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng: 'tr',
  fallbackLng: 'tr',
  interpolation: { escapeValue: false },
});

export async function initializeAppLanguage() {
  try {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    if (stored === 'en' || stored === 'tr') {
      await i18n.changeLanguage(stored);
      return stored;
    }
  } catch {
    // keep default tr
  }
  await i18n.changeLanguage('tr');
  return 'tr';
}

export function setAppLanguage(code: 'en' | 'tr') {
  void SecureStore.setItemAsync(LANGUAGE_KEY, code);
  void i18n.changeLanguage(code);
}

export default i18n;
