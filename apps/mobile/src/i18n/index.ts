import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import en from './locales/en.json';
import tr from './locales/tr.json';

const lng = Localization.getLocales()[0]?.languageCode === 'tr' ? 'tr' : 'en';

void i18n.use(initReactI18next).init({
  compatibilityJSON: 'v4',
  resources: {
    en: { translation: en },
    tr: { translation: tr },
  },
  lng,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export function setAppLanguage(code: 'en' | 'tr') {
  void i18n.changeLanguage(code);
}

export default i18n;
