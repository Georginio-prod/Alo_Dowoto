import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { getLocales } from 'expo-localization'
import fr from './fr.json'
import en from './en.json'

/**
 * i18next + expo-localization. Français par défaut (marché togolais), anglais
 * en repli. Catalogue amorcé depuis les textes du web (i18n/locales/fr.json),
 * puis restreint aux écrans mobiles. Aucune chaîne en dur dans les composants
 * (Phase 4).
 */
const deviceLang = getLocales()[0]?.languageCode ?? 'fr'

void i18n.use(initReactI18next).init({
  resources: {
    fr: { translation: fr },
    en: { translation: en },
  },
  lng: deviceLang === 'en' ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
  returnNull: false,
})

export default i18n
